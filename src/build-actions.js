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
const utils = require('./utils')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:action-builder', { provider: 'debug' })

// need config.root
// config.actions.dist
const buildAction = async (packageName, actionName, action, root, dist) => {
  // const actionPath = path.isAbsolute(action.function) ? action.function : path.join(root, action.function)
  // note: it does not seem to be possible to get here with an absolute path ...
/*   console.log(name)
  console.log(action) */
  const actionPath = path.join(root, action.function)

  const outPath = path.join(dist, `${packageName}-${actionName}.zip`)
  // console.log(outPath)
  const tempBuildDir = path.join(path.dirname(outPath), `${packageName}-${actionName}-temp`) // build all to tempDir first
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
    const compiler = webpack({
      entry: [
        actionPath
      ],
      output: {
        path: tempBuildDir,
        filename: outBuildFilename,
        libraryTarget: 'commonjs2'
      },
      // see https://webpack.js.org/configuration/mode/
      mode: 'production',
      target: 'node',
      optimization: {
        // error on minification for some libraries
        minimize: false
      },
      // the following lines are used to require es6 module, e.g.node-fetch which is used by azure sdk
      resolve: {
        extensions: ['.js', '.json'],
        mainFields: ['main']
      },
      plugins: [new webpack.DefinePlugin(
        {
          WEBPACK_ACTION_BUILD: JSON.stringify(true)
        })]
      // todo remove packages from bundled file that are available in runtime (add the deps of deps as well)
      // disabled for now as we need to consider versions (at least majors) to avoid nasty bugs
      // ,externals: ['express', 'request', 'request-promise', 'body-parser', 'openwhisk']
    })

    // run the compiler and wait for a result
    await new Promise((resolve, reject) => compiler.run((err, stats) => {
      if (err) {
        reject(err)
      }
      // stats must be defined at this point
      const info = stats.toJson()
      if (stats.hasWarnings()) {
        aioLogger.debug(`webpack compilation warnings:\n${info.warnings}`)
      }
      if (stats.hasErrors()) {
        reject(new Error(`action build failed, webpack compilation errors:\n${info.errors}`))
      }
      return resolve(stats)
    }))
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
  // console.log(config)
  if (!config.app.hasBackend) {
    throw new Error('cannot build actions, app has no backend')
  }
  // clear out dist dir
  fs.emptyDirSync(config.actions.dist)
  // console.log(config)
  /* let packageToBuild = config.manifest.package
  // which actions to build, check filter
  if (!packageToBuild) {
    const firstPkgName = Object.keys(config.manifest.full.packages)[0]
    packageToBuild = config.manifest.full.packages[firstPkgName]
  } */
  const modifiedConfig = utils.replacePackagePlaceHolder(config)
  const builtList = []
  for (const [pkgName, pkg] of Object.entries(modifiedConfig.manifest.full.packages)) {
    const actionsToBuild = Object.entries(pkg.actions)

    // build all sequentially (todo make bundler execution parallel)
    for (const [actionName, action] of actionsToBuild) {
      if (Array.isArray(filterActions) && !filterActions.includes(actionName)) {
        continue
      }
      // const out =  // todo: log output of each action as it is built
      // need config.root
      // config.actions.dist
      builtList.push(await buildAction(pkgName, actionName, action, config.root, config.actions.dist))
    }
  }
  return builtList
}

module.exports = buildActions
