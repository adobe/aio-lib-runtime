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
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:undeploy', { provider: 'debug' })
const IORuntime = require('./RuntimeAPI')

/**
 * @param {object} config app config
 * @param {object} [logFunc] custom logger function
 */
async function undeployActions (config, logFunc) {
  if (!config.app.hasBackend) {
    throw new Error('cannot undeploy actions, app has no backend')
  }

  const log = logFunc || console.log

  // 0. check credentials
  utils.checkOpenWhiskCredentials(config)
  const owOptions = {
    apihost: config.ow.apihost,
    apiversion: config.ow.apiversion,
    api_key: config.ow.auth,
    namespace: config.ow.namespace
  }

  // TODO: remove this once the feature flag is removed
  if ('auth_handler' in config.ow && config.ow.auth_handler) {
    owOptions.auth_handler = config.ow.auth_handler
  }

  // replace package name
  const modifiedConfig = utils.replacePackagePlaceHolder(config)
  const manifest = modifiedConfig.manifest.full
  for (const [packageName, pkg] of Object.entries(manifest.packages)) {
    pkg.version = config.app.version
    await undeployWsk(packageName, manifest, owOptions, log)
  }
}

/** @private */
async function getDeployedPackage (ow, packageName) {
  if (packageName === utils.DEFAULT_PACKAGE_RESERVED_NAME) {
    const pkg = { actions: [] }
    const actionList = await ow.actions.list()
    actionList.forEach(action => { // only get the actions from the default package
      // NOTE: this is a quirk of the Openwhish actions.list call.
      // the action.namespace here is in the form "namespace/package" (if there is a package) or "namespace" (if it is the default package)
      // if it's the default package, the `namespace` property for the parsePackageName function will return "_"
      const { namespace } = utils.parsePackageName(action.namespace)
      if (namespace === '_') {
        pkg.actions.push(action)
      }
    })
    return pkg
  } else {
    return await ow.packages.get(packageName)
  }
}

/** @private */
function getDeployedActionName (actionName, packageName) {
  if (packageName === utils.DEFAULT_PACKAGE_RESERVED_NAME) {
    return actionName
  } else {
    return `${packageName}/${actionName}`
  }
}

/**
 * @param {string} packageName name of the package to be undeployed
 * @param {object} manifestContent manifest
 * @param {object} owOptions openwhisk options
 * @param {object} logger custom logger function
 * @returns {Promise<void>} void
 */
async function undeployWsk (packageName, manifestContent, owOptions, logger) {
  const ow = await new IORuntime().init(owOptions)

  aioLogger.debug('Undeploying')
  // 1. make sure that the package exists
  let deployedPackage
  try {
    deployedPackage = await getDeployedPackage(ow, packageName)
  } catch (e) {
    if (e.statusCode === 404) throw new Error(`cannot undeploy actions for package ${packageName}, as it was not deployed.`)
    throw e
  }

  // 2. extract deployment entities from existing deployment, this extracts all ow resources that are annotated with the
  //    package name
  // note that entities.actions may contain actions outside deployedPackage
  const entities = await utils.getProjectEntities(packageName, false, ow)

  // 3. make sure that we also clean all actions in the main package that are not part of a cna deployment (e.g. wskdebug actions)
  //    the goal is to prevent 409s on package delete (non empty package)
  // todo undeploy other entities too, not only actions
  const actionNames = new Set(entities.actions.map(a => a.name))
  deployedPackage.actions.forEach(a => {
    const deployedActionName = getDeployedActionName(a.name, packageName)
    if (!actionNames.has(deployedActionName)) {
      entities.actions.push({ name: deployedActionName })
    }
  })

  // 4. add apis and rules to undeployment, apis and rules are not part of the managed whisk project as they don't support annotations and
  //    hence can't be retrieved with getProjectEntities + api delete is idempotent so no risk of 404s
  const manifestEntities = utils.processPackage(manifestContent.packages, {}, {}, {}, true)
  entities.apis = manifestEntities.apis
  entities.rules = manifestEntities.rules

  // 5. undeploy gathered entities
  return utils.undeployPackage(entities, ow, logger)
}

module.exports = undeployActions
