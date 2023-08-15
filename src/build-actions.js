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

const fs = require('fs-extra')
const path = require('path')
const webpack = require('webpack')
const globby = require('globby')
const utils = require('./utils')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:action-builder', { provider: 'debug' })
const cloneDeep = require('lodash.clonedeep')
const { getCliEnv } = require('@adobe/aio-lib-env')

const uniqueArr = (items) => {
  return [...new Set(items)]
}

/**
 *  Searches for a webpack config file, starting at the action path and working
 *  towards the root of the project. Will return the first one it finds.
 *
 * @param {string} actionPath Path of the action
 * @param {string} root Root of the project
 * @returns {Promise<string>} Webpack config file path, will be 'null' if not found
 */
const getWebpackConfigPath = async (actionPath, root) => {
  let parentDir = path.dirname(actionPath)
  const rootParent = path.resolve(path.dirname(root))
  let configPath = null

  do {
    const paths = await globby([path.join(parentDir, '*webpack-config.js')])
    if (paths && paths.length > 0) {
      configPath = paths[0]
    }
    parentDir = path.dirname(parentDir)
  } while (parentDir !== rootParent && !configPath)
  return configPath
}

/**
 *  Loads a Webpack config file from the config path provided. Sets fields required
 *  for Runtime actions. Returns an object that can be passed to the Webpack library.
 *
 * @param {string} configPath Path of the Webpack config file
 * @param {string} actionPath Path of the action
 * @param {string} tempBuildDir Path of the output directory for the bundle
 * @param {string} outBuildFilename Name of the output file for the action
 * @returns {Promise<object>} Webpack config, can be passed to the Webpack library
 */
const loadWebpackConfig = async (configPath, actionPath, tempBuildDir, outBuildFilename) => {
  const configs = []
  const cliEnv = getCliEnv()
  let importConfig = configPath ? require(configPath) : {}

  if (typeof importConfig === 'function') {
    importConfig = await importConfig(process.env)
  } else {
    // If the config file exported a Promise, resolve the Promise.
    // Otherwise this is a no-op.
    importConfig = await importConfig
  }

  if (!Array.isArray(importConfig)) {
    importConfig = [importConfig]
  }

  for (let userConfig of importConfig) {
    if (typeof userConfig === 'function') {
      userConfig = await userConfig(process.env)
    } else {
      // If the config file exported a Promise, resolve the Promise.
      // Otherwise this is a no-op.
      userConfig = await userConfig
    }

    // needs cloning because require has a cache, so we make sure to not touch the userConfig
    const config = cloneDeep(userConfig)

    // entry [] must include action path
    config.entry = config.entry || []
    config.entry.push(actionPath)
    config.entry = uniqueArr(config.entry)
    // make sure filePaths are resolved from the config dir
    config.entry = config.entry.map(f => {
      if (!path.isAbsolute(f)) {
        return path.resolve(path.dirname(configPath), f)
      }
      return f
    })

    // if output exists, default to commonjs2
    config.output = config.output || {}
    if (config.output.libraryTarget === undefined) {
      config.output.libraryTarget = 'commonjs2'
    }
    config.output.path = tempBuildDir
    config.output.filename = outBuildFilename
    // target MUST be node
    config.target = 'node'
    // default to production mode
    config.mode = config.mode || 'production'
    // default optimization to NOT minimize
    config.optimization = config.optimization || {}
    if (config.optimization.minimize === undefined) {
      // error on minification for some libraries
      config.optimization.minimize = false
    }
    // the following lines are used to require es6 module, e.g.node-fetch which is used by azure sdk
    config.resolve = config.resolve || {}
    // extensions needs to include .js and .json
    config.resolve.extensions = config.resolve.extensions || []
    config.resolve.extensions.push('.js', '.json')
    config.resolve.extensions = uniqueArr(config.resolve.extensions)

    // mainFields needs to include 'main'
    config.resolve.mainFields = config.resolve.mainFields || []
    config.resolve.mainFields.push('main')
    config.resolve.mainFields = uniqueArr(config.resolve.mainFields)

    // we have 1 required plugin to make sure is present
    config.plugins = config.plugins || []
    config.plugins.push(new webpack.DefinePlugin({
      WEBPACK_ACTION_BUILD: 'true',
      'process.env.AIO_CLI_ENV': `"${cliEnv}"`
    }))
    // NOTE: no need to make the array unique here, all plugins are different and created via new

    aioLogger.debug(`merged webpack config : ${JSON.stringify(config, 0, 2)}`)
    configs.push(config)
  }

  return configs
}

// need config.root
// config.actions.dist

/**
 * @typedef ActionBuild
 * @type {object}
 * @property {string} actionName The name of the action
 * @property {object} buildHash Map with key as the name of the action and value its contentHash
 * @property {boolean} legacy Indicate legacy action support
 * @property {string} tempBuildDir path of temp build
 * @property {string} tempActionName name of the action file.
 * @property {string} outPath zip output path
 */

/**
 *  Will return data about an action ready to be built.
 *
 * @param {object} action  Data about the Action.
 * @param {string} root root of the project.
 * @param {string} dist Path to the minimized version of the action code
 * @returns {Promise<ActionBuild>} Relevant data for the zip process..
 */
const prepareToBuildAction = async (action, root, dist) => {
  const { name: actionName, defaultPackage, packageName } = action
  const zipFileName = utils.getActionZipFileName(packageName, actionName, false)
  let statsInfo // this is the object returned by bundler run, it has the hash
  // path.resolve supports both relative and absolute action.function
  const actionPath = path.resolve(root, action.function)
  const outPath = path.join(dist, `${zipFileName}.zip`)
  const tempBuildDir = path.join(dist, `${zipFileName}-temp`) // build all to tempDir first
  const actionFileStats = fs.lstatSync(actionPath)
  const isDirectory = actionFileStats.isDirectory()

  // make sure temp/ exists
  fs.ensureDirSync(tempBuildDir)
  // Process included files
  const includeFiles = await utils.getIncludesForAction(action)
  includeFiles.forEach(incFile => {
    const dest = path.join(tempBuildDir, incFile.dest)
    fs.ensureDirSync(dest)
    // dest is expected to be a dir ...
    for (const file of incFile.sources) {
      fs.copyFileSync(file, path.join(dest, path.parse(file).base))
    }
  })

  if (isDirectory) {
    // make sure package.json exists OR index.js
    const packageJsonPath = path.join(actionPath, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
      if (!fs.existsSync(path.join(actionPath, 'index.js'))) {
        throw new Error(`missing required ${utils._relApp(root, packageJsonPath)} or index.js for folder actions`)
      }
      aioLogger.debug('action directory has an index.js, allowing zip')
    } else {
      // make sure package.json exposes main or there is an index.js
      const expectedActionName = utils.getActionEntryFile(packageJsonPath)
      if (!fs.existsSync(path.join(actionPath, expectedActionName))) {
        throw new Error(`the directory ${action.function} must contain either a package.json with a 'main' flag or an index.js file at its root`)
      }
    }
    // TODO: when we get to excludes, use a filter function here.
    fs.copySync(actionPath, tempBuildDir, { dereference: true })
  } else {
    // if not directory => package and minify to single file
    const webpackConfigPath = await getWebpackConfigPath(actionPath, root)
    const webpackConfig = await loadWebpackConfig(webpackConfigPath, actionPath, tempBuildDir, 'index.js')
    const compiler = webpack(webpackConfig)

    // run the compiler and wait for a result
    statsInfo = await new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err)
        }
        // stats must be defined at this point
        const info = stats.toJson()
        if (stats.hasWarnings()) {
          aioLogger.warn(`webpack compilation warnings:\n${info.warnings}`)
        }
        if (stats.hasErrors()) {
          reject(new Error(`action build failed, webpack compilation errors:\n${JSON.stringify(info.errors, null, '\t')}`))
        }
        return resolve(stats)
      })
    })
  }

  let buildHash
  let contentHash
  if (isDirectory) {
    contentHash = actionFileStats.mtime.valueOf()
    buildHash = { [zipFileName]: contentHash }
  } else {
    contentHash = statsInfo.hash
    buildHash = { [zipFileName]: contentHash }
  }

  return {
    actionName,
    buildHash,
    legacy: defaultPackage,
    outPath,
    tempBuildDir,
    tempActionName: 'index.js'
  }
}

/**
 *  Will zip actions.
 *  By default only actions which were not built before will be zipped.
 *  Last built actions data will be used to validate which action needs zipping.
 *
 * @param {Array<ActionBuild>} buildsList Array of data about actions available to be zipped.
 * @param {string} lastBuildsPath Path to the last built actions data.
 * @param {string} distFolder Path to the output root.
 * @param {boolean} skipCheck If true, zip all the actions from the buildsList
 * @returns {string[]} Array of zipped actions.
 */
const zipActions = async (buildsList, lastBuildsPath, distFolder, skipCheck) => {
  let dumpData = {}
  const builtList = []
  let lastBuiltData = ''
  if (fs.existsSync(lastBuildsPath)) {
    lastBuiltData = await fs.readFile(lastBuildsPath, 'utf8')
  }
  for (const build of buildsList) {
    const { outPath, buildHash, tempBuildDir, legacy, actionName } = build
    const builtBefore = utils.actionBuiltBefore(lastBuiltData, buildHash)
    if (!builtBefore || skipCheck) {
      dumpData = { ...dumpData, ...buildHash }
      await utils.zip(tempBuildDir, outPath)
      // TODO: we need to kill this symlink stuff, it is preventing non-admin windows users
      // from using the CLI.  -jm
      // create symlink for default package actions.
      // this assure legacy support for the old output path.
      if (legacy) {
        const legacyActionBuild = path.join(distFolder, `${actionName}.zip`)
        const legacyActionTemp = path.join(distFolder, `${actionName}-temp`)
        fs.symlink(outPath, legacyActionBuild)
        fs.symlink(tempBuildDir, legacyActionTemp)
      }
      builtList.push(outPath)
    }
  }
  const parsedLastBuiltData = utils.safeParse(lastBuiltData)
  await utils.dumpActionsBuiltInfo(lastBuildsPath, dumpData, parsedLastBuiltData)
  return builtList
}

const buildActions = async (config, filterActions, skipCheck = false) => {
  if (!config.app.hasBackend) {
    throw new Error('cannot build actions, app has no backend')
  }
  // rewrite config
  const modifiedConfig = utils.replacePackagePlaceHolder(config)
  let sanitizedFilterActions = cloneDeep(filterActions)
  if (sanitizedFilterActions) {
    // If using old format of <actionname>, convert it to <package>/<actionname> using default/first package in the manifest
    sanitizedFilterActions = sanitizedFilterActions.map(actionName => actionName.indexOf('/') === -1 ? modifiedConfig.ow.package + '/' + actionName : actionName)
  }
  const distFolder = config.actions.dist

  // clear out dist dir
  fs.emptyDirSync(distFolder)
  const toBuildList = []
  const lastBuiltActionsPath = path.join(config.root, 'dist', 'last-built-actions.json')
  for (const [pkgName, pkg] of Object.entries(modifiedConfig.manifest.full.packages)) {
    const actionsToBuild = Object.entries(pkg.actions || {})

    // build all sequentially (todo make bundler execution parallel)
    for (const [actionName, action] of actionsToBuild) {
      const actionFullName = pkgName + '/' + actionName
      if (Array.isArray(sanitizedFilterActions) && !sanitizedFilterActions.includes(actionFullName)) {
        continue
      }
      action.name = actionName
      action.packageName = pkgName
      action.defaultPackage = modifiedConfig.ow.package === pkgName
      toBuildList.push(await prepareToBuildAction(action, config.root, distFolder))
    }
  }

  return zipActions(toBuildList, lastBuiltActionsPath, distFolder, skipCheck)
}

module.exports = buildActions
