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
const packageItems = ['actions', 'sequences']
const filterableItems = ['apis', 'triggers', 'rules', 'dependencies', ...packageItems]

/**
 * runs the command
 *
 * @param {object} config app config
 * @param {object} [deployConfig={}] deployment config
 * @param {boolean} [deployConfig.isLocalDev] local dev flag
 * @param {object} [deployConfig.filterEntities] add filters to deploy only specified OpenWhisk entities
 * @param {Array} [deployConfig.filterEntities.actions] filter list of actions to deploy by provided array, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.byBuiltActions] if true, trim actions from the manifest based on the already built actions
 * @param {Array} [deployConfig.filterEntities.sequences] filter list of sequences to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.triggers] filter list of triggers to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.rules] filter list of rules to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.apis] filter list of apis to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.dependencies] filter list of package dependencies to deploy, e.g. ['name1', ..]
 * @param {object} [logFunc] custom logger function
 * @returns {Promise<object>} deployedEntities
 */
async function deployActions (config, deployConfig = {}, logFunc) {
  if (!config.app.hasBackend) throw new Error('cannot deploy actions, app has no backend')

  const isLocalDev = deployConfig.isLocalDev
  const log = logFunc || console.log
  let filterEntities = deployConfig.filterEntities

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

  /* Filter manifest actions based on the already built actions */
  const _filterManifestActions = () => {
    if (deployConfig.filterEntities && deployConfig.filterEntities.byBuiltActions) {
      aioLogger.debug('Trimming out the manifest\'s actions...')
      filterEntities = undefined
      const manifestPackageName = modifiedConfig.ow.package
      const distFiles = fs.readdirSync(dist)
      const builtActions = distFiles.flatMap(fileName => {
        const actionName = utils.getActionNameFromZipFile(fileName)
        return actionName || []
      })
      const manifestActions = manifest.packages[manifestPackageName].actions
      manifest.packages[manifestPackageName].actions = Object.keys(manifestActions).reduce((newActions, actionKey) => {
        if (builtActions.includes(actionKey)) {
          // eslint-disable-next-line no-param-reassign
          newActions[actionKey] = manifestActions[actionKey]
        }
        return newActions
      }, {})
    }
  }

  // 1. rewrite wskManifest config
  const modifiedConfig = utils.replacePackagePlaceHolder(config)
  const manifest = modifiedConfig.manifest.full
  const relDist = utils._relApp(config.root, config.actions.dist)
  _filterManifestActions()
  for (const [pkgName, pkg] of Object.entries(manifest.packages)) {
    pkg.version = config.app.version
    for (const [name, action] of Object.entries(pkg.actions || {})) {
      // change path to built action
      const zipFileName = utils.getActionZipFileName(pkgName, name, modifiedConfig.ow.package === pkgName) + '.zip'
      action.function = path.join(relDist, zipFileName)
    }
  }

  // If using old format of <actionname>, convert it to <package>/<actionname> using default/first package in the manifest
  if (filterEntities) {
    packageItems.forEach((k) => {
      if (filterEntities[k]) {
        filterEntities[k] = filterEntities[k].map((actionName) =>
          actionName.indexOf('/') === -1 ? modifiedConfig.ow.package + '/' + actionName : actionName)
      }
    })
  }
  // 2. deploy manifest
  const deployedEntities = await deployWsk(
    modifiedConfig,
    manifest,
    log,
    filterEntities
  )
  // enrich actions array with urls
  if (Array.isArray(deployedEntities.actions)) {
    const actionUrlsFromManifest = utils.getActionUrls(config, config.actions.devRemote, isLocalDev)
    deployedEntities.actions = deployedEntities.actions.map(action => {
      const retAction = deepCopy(action)
      // the key in actionUrlsFromManifest would not have pkg name for actions in default package
      const actionKey = action.name.replace(modifiedConfig.ow.package + '/', '')
      const url = actionUrlsFromManifest[actionKey]
      if (url) {
        retAction.url = url
      }
      return retAction
    })
  }
  return deployedEntities
}

/**
 * @param {object} scriptConfig config
 * @param {object} manifestContent manifest
 * @param {object} logFunc custom logger function
 * @param {object} filterEntities entities (actions, sequences, triggers, rules etc) to be filtered
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
   * @param {object} pkgName name of the package
   * @param {object} pkgEntity package object from the manifest
   * @param {object} filterItems items (actions, sequences, triggers, rules etc) to be filtered
   * @param {boolean} fullNameCheck true if the items are part of packages (actions and sequences)
   * @returns {object} package object containing only the filterItems
   */
  function _filterOutPackageEntity (pkgName, pkgEntity, filterItems, fullNameCheck) {
    if (pkgEntity === undefined || filterItems === undefined) {
      return {}
    }
    // We check the full name (<packageName>/<actionName>) for actions and sequences
    return Object.keys(pkgEntity)
      .filter(entityName => fullNameCheck ? filterItems.includes(`${pkgName}/${entityName}`) : filterItems.includes(entityName))
      .reduce((obj, key) => {
        obj[key] = pkgEntity[key] // eslint-disable-line no-param-reassign
        return obj
      }, {})
  }

  aioLogger.debug('Deploying')
  // extract all entities to deploy from manifest
  const packages = deepCopy(manifestContent.packages) // deepCopy to preserve manifestContent

  let deleteOldEntities = true // full sync, cleans up old entities

  // support for entity filters, e.g. user wants to deploy only a single action
  if (typeof filterEntities === 'object') {
    deleteOldEntities = false // don't delete any deployed entity
    filterableItems.forEach(filterableItemKey => {
      Object.entries(packages).forEach(([pkgName, packageEntity]) => {
        packageEntity[filterableItemKey] = _filterOutPackageEntity(pkgName, packageEntity[filterableItemKey], filterEntities[filterableItemKey], packageItems.includes(filterableItemKey)) // eslint-disable-line no-param-reassign
        // cleanup empty entities
        if (Object.keys(packageEntity[filterableItemKey]).length === 0) delete packageEntity[filterableItemKey] // eslint-disable-line no-param-reassign
      })
    })
    // todo filter out packages, like auth package
  }

  // note we must filter before processPackage, as it expect all built actions to be there
  const entities = utils.processPackage(packages, {}, {}, {}, false, owOptions)

  /* BEGIN temporary workaround for handling require-adobe-auth */
  // Note this is a tmp workaround and should be removed once the app-registry validator can be used for headless applications
  if (scriptConfig.app.hasFrontend && Array.isArray(entities.actions)) {
    const { getCliEnv, DEFAULT_ENV, PROD_ENV, STAGE_ENV } = require('@adobe/aio-lib-env')
    const env = getCliEnv() || DEFAULT_ENV
    // if the app has a frontend we need to switch to the the app registry validator
    const DEFAULT_VALIDATORS = {
      [PROD_ENV]: '/adobeio/shared-validators-v1/headless-v2',
      [STAGE_ENV]: '/adobeio-stage/shared-validators-v1/headless-v2'
    }
    const APP_REGISTRY_VALIDATORS = {
      [PROD_ENV]: '/adobeio/shared-validators-v1/app-registry',
      [STAGE_ENV]: '/adobeio-stage/shared-validators-v1/app-registry'
    }
    const DEFAULT_VALIDATOR = DEFAULT_VALIDATORS[env]
    const APP_REGISTRY_VALIDATOR = APP_REGISTRY_VALIDATORS[env]

    const replaceValidator = { [DEFAULT_VALIDATOR]: APP_REGISTRY_VALIDATOR }
    entities.actions.forEach(a => {
      const needsReplacement = a.exec && a.exec.kind === 'sequence' && a.exec.components && a.exec.components.includes(DEFAULT_VALIDATOR)
      if (needsReplacement) {
        aioLogger.debug(`replacing headless auth validator ${DEFAULT_VALIDATOR} with app registry validator ${APP_REGISTRY_VALIDATOR} for action ${a.name} and cli env = ${env}`)
        a.exec.components = a.exec.components.map(a => replaceValidator[a] || a) // eslint-disable-line no-param-reassign
      }
    })
  }
  /* END temporary workaround */
  // do the deployment, manifestPath and manifestContent needed for creating a project hash
  await utils.syncProject(packageName, manifestPath, manifestContent, entities, ow, logFunc, scriptConfig.imsOrgId, deleteOldEntities)
  return entities
}
module.exports = deployActions
