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

const getWebpackConfig = async (actionPath, root, tempBuildDir, outBuildFilename) => {
  let parentDir = path.dirname(actionPath)
  const rootParent = path.normalize(path.dirname(root))
  let configPath = null
  const cliEnv = getCliEnv()

  do {
    const paths = await globby([path.join(parentDir, '*webpack-config.js')])
    if (paths && paths.length > 0) {
      configPath = paths[0]
    }
    parentDir = path.dirname(parentDir)
  } while (parentDir !== rootParent && !configPath)
  // default empty
  const userConfig = configPath ? require(configPath) : {}
  // needs cloning because require has a cache, so we make sure to not touch the userConfig
  const config = cloneDeep(userConfig)

  // entry [] must include action path
  config.entry = config.entry || []
  config.entry.push(actionPath)
  config.entry = uniqueArr(config.entry)
  // make sure filepaths are resolved from the config dir
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
  return config
}
// need config.root
// config.actions.dist
const buildAction = async (zipFileName, action, root, dist) => {
  // const actionPath = path.isAbsolute(action.function) ? action.function : path.join(root, action.function)
  // note: it does not seem to be possible to get here with an absolute path ...
  const actionPath = path.join(root, action.function)

  const outPath = path.join(dist, `${zipFileName}.zip`)
  const tempBuildDir = path.join(dist, `${zipFileName}-temp`) // build all to tempDir first
  const actionFileStats = fs.lstatSync(actionPath)

  // make sure temp/ exists
  fs.ensureDirSync(tempBuildDir)
  // Process include(d) files
  const includeFiles = await utils.getIncludesForAction(action)
  includeFiles.forEach(incFile => {
    const dest = path.join(tempBuildDir, incFile.dest)
    fs.ensureDirSync(dest)
    // dest is expected to be a dir ...
    incFile.sources.forEach(file => {
      fs.copyFileSync(file, path.join(dest, path.parse(file).base))
    })
  })

  if (actionFileStats.isDirectory()) {
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
    const outBuildFilename = 'index.js' // `${name}.tmp.js`
    // if not directory => package and minify to single file
    const webpackConfig = await getWebpackConfig(actionPath, root, tempBuildDir, outBuildFilename)
    const compiler = webpack(webpackConfig)

    // run the compiler and wait for a result
    await new Promise((resolve, reject) => {
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
          reject(new Error(`action build failed, webpack compilation errors:\n${info.errors}`))
        }
        return resolve(stats)
      })
    })
  }

  // todo: split out zipping
  // zip the dir
  await utils.zip(tempBuildDir, outPath)
  // fs.remove(tempBuildDir) // remove the build file, don't need to wait ...

  // const fStats = fs.statSync(outPath)
  // if (fStats && fStats.size > (22 * 1024 * 1024)) {
  //   this.emit('warning', `file size exceeds 22 MB, you may not be able to deploy this action. file size is ${fStats.size} Bytes`)
  // }
  return outPath
}

const buildActions = async (config, filterActions) => {
  if (!config.app.hasBackend) {
    throw new Error('cannot build actions, app has no backend')
  }

  // rewrite config
  const modifiedConfig = utils.replacePackagePlaceHolder(config)
  let sanitizedFilterActions = cloneDeep(filterActions)

  if (sanitizedFilterActions) {
    // If using old format of <actionname>, convert it to <package>/<actionname> using default/first package in the manifest
    sanitizedFilterActions = sanitizedFilterActions.map((actionName) => actionName.indexOf('/') === -1 ? modifiedConfig.ow.package + '/' + actionName : actionName)
  }

  // clear out dist dir
  fs.emptyDirSync(config.actions.dist)
  const builtList = []
  for (const [pkgName, pkg] of Object.entries(modifiedConfig.manifest.full.packages)) {
    const actionsToBuild = Object.entries(pkg.actions || {})

    // build all sequentially (todo make bundler execution parallel)
    for (const [actionName, action] of actionsToBuild) {
      const actionFullName = pkgName + '/' + actionName
      if (Array.isArray(sanitizedFilterActions) && !sanitizedFilterActions.includes(actionFullName)) {
        continue
      }
      // const out =  // todo: log output of each action as it is built
      // need config.root
      // config.actions.dist
      // zipFileName would be <actionName>.zip for default package and
      // <pkgName>/<actionName>.zip for non default packages for backward compatibility
      const zipFileName = utils.getActionZipFileName(pkgName, actionName, modifiedConfig.ow.package === pkgName)
      builtList.push(await buildAction(zipFileName, action, config.root, config.actions.dist))
    }
  }
  return builtList
}

module.exports = buildActions
