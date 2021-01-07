/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const utils = require('./utils')
const fs = require('fs-extra')
const path = require('path')
const deepCopy = require('lodash.clonedeep')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:deploy', { provider: 'debug' })
const IOruntime = require('./RuntimeAPI')

/**
 * runs the command
 *
 * @param {object} [config={}]
 * @param {object} [deployConfig={}]
 * @param {object} [deployConfig.filterEntities] add filters to deploy only specified OpenWhisk entities
 * @param {Array} [deployConfig.filterEntities.actions] filter list of actions to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.sequences] filter list of sequences to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.triggers] filter list of triggers to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.rules] filter list of rules to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.apis] filter list of apis to deploy, e.g. ['name1', ..]
 * @param eventEmitter
 * @param logFunc
 * @param {Array} [deployConfig.filterEntities.dependencies] filter list of package dependencies to deploy, e.g. ['name1', ..]
 * @returns {Promise<object>} deployedEntities
 */
async function deployActions (config, deployConfig = {}, logFunc) {
  if (!config.app.hasBackend) throw new Error('cannot deploy actions, app has no backend')
  // TODO: Should we still support emitting events (start, progress, end ... )

  const isLocalDev = deployConfig.isLocalDev
  const log = logFunc || console.log

  // checks
  /// a. missing credentials
  utils.checkOpenWhiskCredentials(config)
  /// b. missing build files
  const dist = config.actions.dist
  if (
    (!deployConfig.filterEntities || deployConfig.filterEntities.actions) &&
    (!fs.pathExistsSync(dist) || !fs.lstatSync(dist).isDirectory() || !fs.readdirSync(dist).length === 0)
  ) {
    throw new Error(`missing files in ${utils._relApp(config.root, dist)}, maybe you forgot to build your actions ?`)
  }

  // 1. rewrite wskManifest config
  const manifest = deepCopy(config.manifest.full)
  let manifestPackage = manifest.packages[config.manifest.packagePlaceholder]
  const usingCustomPackageName = !manifestPackage
  if (usingCustomPackageName) {
    const packageNames = Object.keys(manifest.packages)
    manifestPackage = manifest.packages[packageNames[0]]
    config.ow.package = packageNames[0]
    // this is needed for getActionUrls not to fail
    config.manifest.package = config.manifest.full.packages[packageNames[0]]
  }

  manifestPackage.version = config.app.version
  const relDist = utils._relApp(config.root, config.actions.dist)
  await Promise.all(Object.entries(manifestPackage.actions).map(async ([name, action]) => {
    // change path to built action
    action.function = path.join(relDist, name + '.zip')
  }))
  if (!usingCustomPackageName) {
    // replace package name
    manifest.packages[config.ow.package] = manifest.packages[config.manifest.packagePlaceholder]
    delete manifest.packages[config.manifest.packagePlaceholder]
  }

  // 2. deploy manifest
  const deployedEntities = await deployWsk(
    config,
    manifest,
    log,
    deployConfig.filterEntities
  )

  // enrich actions array with urls
  if (Array.isArray(deployedEntities.actions)) {
    const actionUrlsFromManifest = utils.getActionUrls(config, config.actions.devRemote, isLocalDev)
    deployedEntities.actions = deployedEntities.actions.map(action => {
      // in deployedEntities.actions, names are <package>/<action>
      const url = actionUrlsFromManifest[action.name.split('/')[1]]
      if (url) {
        action.url = url
      }
      return action
    })
  }
  return deployedEntities
}

/**
 * @param scriptConfig
 * @param manifestContent
 * @param logFunc
 * @param filterEntities
 */
async function deployWsk (scriptConfig, manifestContent, logFunc, filterEntities) {
  const packageName = scriptConfig.ow.package
  const manifestPath = scriptConfig.manifest.src
  const owOptions = {
    apihost: scriptConfig.ow.apihost,
    apiversion: scriptConfig.ow.apiversion,
    api_key: scriptConfig.ow.auth,
    namespace: scriptConfig.ow.namespace
  }

  const ow = await new IOruntime().init(owOptions)

  /**
   * @param pkgEntity
   * @param filter
   */
  function _filterOutPackageEntity (pkgEntity, filter) {
    filter = filter || []
    pkgEntity = pkgEntity || {}
    return Object.keys(pkgEntity)
      .filter(name => filter.includes(name))
      .reduce((obj, key) => { obj[key] = pkgEntity[key]; return obj }, {})
  }

  aioLogger.debug('Deploying')
  // extract all entities to deploy from manifest
  const packages = deepCopy(manifestContent.packages) // deepCopy to preserve manifestContent

  let deleteOldEntities = true // full sync, cleans up old entities

  // support for entity filters, e.g. user wants to deploy only a single action
  if (typeof filterEntities === 'object') {
    deleteOldEntities = false // don't delete any deployed entity

    const keys = ['actions', 'apis', 'triggers', 'rules', 'sequences', 'dependencies']
    keys.forEach(k => {
      packages[packageName][k] = _filterOutPackageEntity(packages[packageName][k], filterEntities[k])
      // cleanup empty entities
      if (Object.keys(packages[packageName][k]).length === 0) delete packages[packageName][k]
    })

    // todo filter out packages, like auth package
  }

  // note we must filter before processPackage, as it expect all built actions to be there
  const entities = utils.processPackage(packages, {}, {}, {}, false, owOptions)

  /* BEGIN temporary workaround for handling require-adobe-auth */
  // Note this is a tmp workaround and should be removed once the app-registry validator can be used for headless applications
  if (scriptConfig.app.hasFrontend && Array.isArray(entities.actions)) {
    // if the app has a frontend we need to switch to the the app registry validator
    const DEFAULT_VALIDATOR = '/adobeio/shared-validators-v1/headless'
    const APP_REGISTRY_VALIDATOR = '/adobeio/shared-validators-v1/app-registry'

    const replaceValidator = { [DEFAULT_VALIDATOR]: APP_REGISTRY_VALIDATOR }
    entities.actions.forEach(a => {
      const needsReplacement = a.exec && a.exec.kind === 'sequence' && a.exec.components && a.exec.components.includes(DEFAULT_VALIDATOR)
      if (needsReplacement) {
        aioLogger.debug(`replacing headless auth validator with app registry validator for action ${a.name}`)
        a.exec.components = a.exec.components.map(a => replaceValidator[a] || a)
      }
    })
  }
  /* END temporary workaround */

  // do the deployment, manifestPath and manifestContent needed for creating a project hash
  await utils.syncProject(packageName, manifestPath, manifestContent, entities, ow, logFunc, scriptConfig.imsOrgId, deleteOldEntities)
  return entities
}
module.exports = deployActions
