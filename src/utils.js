/*
Copyright 2019 Adobe Inc. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const fs = require('fs-extra')
const sha1 = require('sha1')
const cloneDeep = require('lodash.clonedeep')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:utils', { provider: 'debug', level: process.env.LOG_LEVEL })
const yaml = require('js-yaml')
const { createFetch } = require('@adobe/aio-lib-core-networking')
const fetch = createFetch()
const globby = require('globby')
const path = require('path')
const archiver = require('archiver')
// this is a static list that comes from here: https://developer.adobe.com/runtime/docs/guides/reference/runtimes/
const SupportedRuntimes = ['sequence', 'nodejs:10', 'nodejs:12', 'nodejs:14', 'nodejs:16', 'nodejs:18']
const DEFAULT_PACKAGE_RESERVED_NAME = 'default'

/**
 *
 * The entry point to the information read from the manifest, this can be extracted using
 * [setPaths](#setpaths).
 *
 * @typedef {Array<ManifestPackage>} ManifestPackages
 */

/**
 *
 * The manifest package definition
 *
 * @typedef {object} ManifestPackage
 * @property {string} version the manifest package version
 * @property {string} [license] the manifest package license, e.g. Apache-2.0
 * @property {Array<ManifestAction>} [actions] Actions in the manifest package
 * @property {Array<ManifestSequence>} [sequences] Sequences in the manifest package
 * @property {Array<ManifestTrigger>} [triggers] Triggers in the manifest package
 * @property {Array<ManifestRule>} [rules] Rules in the manifest package
 * @property {Array<ManifestDependency>} [dependencies] Dependencies in the manifest package
 * @property {Array<object>} [apis] Apis in the manifest package
 */

/**
 *
 * The manifest action definition
 *
 * @typedef {object} ManifestAction
 * @property {string} [version] the manifest action version
 * @property {string} function the path to the action code
 * @property {string} runtime the runtime environment or kind in which the action
 *                    executes, e.g. 'nodejs:12'
 * @property {string} [main] the entry point to the function
 * @property {object} [inputs] the list of action default parameters
 * @property {Array<object>} [limits] limits for the action
 * @property {string} [web] indicate if an action should be exported as web, can take the
 *                    value of: true | false | yes | no | raw
 * @property {string} [web-export] same as web
 * @property {boolean} [raw-http] indicate if an action should be exported as raw web action, this
 *                     option is only valid if `web` or `web-export` is set to true
 * @property {string} [docker] the docker container to run the action into
 * @property {Array<object>} [annotations] the manifest action annotations
 */

/**
 * @typedef IncludeEntry
 * @type {object}
 * @property {string} dest - destination for included files
 * @property {Array} sources - list of files that matched pattern
 */

/**
 * Gets the list of files matching the patterns defined by action.include
 *
 * @param {ManifestAction} action - action object from manifest which defines includes
 * @returns {Promise<Array<IncludeEntry>>} list of files matching the patterns defined by action.include
 */
async function getIncludesForAction (action) {
  const includeFiles = []
  if (action.include) {
    // include is array of [ src, dest ] : dest is optional
    const files = await Promise.all(action.include.map(async elem => {
      if (elem.length === 0) {
        throw new Error('Invalid manifest `include` entry: Empty')
      } else if (elem.length === 1) {
        // src glob only, dest is root of action
        elem.push('./')
      } else if (elem.length === 2) {
        // src glob + dest path both defined
      } else {
        throw new Error('Invalid manifest `include` entry: ' + elem.toString())
      }
      const globbyPattern = elem[0].split('\\').join('/')
      const pair = {
        dest: elem[1],
        sources: await globby(globbyPattern)
      }
      return pair
    }))
    includeFiles.push(...files)
  }
  return includeFiles
}

/**
 * The manifest sequence definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_sequences.md
 *
 * @typedef {object} ManifestSequence
 * @property {string} actions Comma separated list of actions in the sequence
 */

/**
 * The manifest trigger definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_triggers.md
 *
 * @typedef {object} ManifestTrigger
 * @property {object} [inputs] inputs like cron and trigger_payload
 * @property {string} [feed] feed associated with the trigger.
 * @property {object} [annotations] annotations
 */

/**
 * The manifest rule definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_rules.md
 *
 * @typedef {object} ManifestRule
 * @property {string} trigger trigger name
 * @property {string} action action name
 */

/**
 * The manifest dependency definition
 * TODO
 *
 * @typedef {object} ManifestDependency
 * @property {string} location package to bind to
 * @property {object} [inputs] package parameters
 */

/**
 *
 * The OpenWhisk entities definitions, which are compatible with the `openwhisk` node
 * client module. Can be obtained using (processpackage)[#processpackage] (with `onlyNames=true` for un-deployment)
 *
 * @typedef {object} OpenWhiskEntities
 * @property {Array<OpenWhiskEntitiesRoute>} apis the array of route entities
 * @property {Array<OpenWhiskEntitiesAction>} actions the array of action entities
 * @property {Array<OpenWhiskEntitiesTrigger>} triggers the array of trigger entities
 * @property {Array<OpenWhiskEntitiesRule>} rules the array of rule entities
 * @property {Array<OpenWhiskEntitiesPackage>} pkgAndDeps the array of package entities
 */

/**
 *
 * The api entity definition
 *
 * @typedef {object} OpenWhiskEntitiesRoute
 * @property {string} name the api name
 * @property {string} basepath the api basepath
 * @property {string} relpath the api relpath
 * @property {string} action the action name behind the api
 * @property {string} responsettype the response type, e.g. 'json'
 * @property {string} operation the http method, e.g 'get'
 */

/**
 * The action entity definition
 * TODO
 *
 * @typedef {object} OpenWhiskEntitiesAction
 * @property {string} action blank
 * @property {string} name name
 * @property {object} exec exec object
 */

/**
 * The rule entity definition
 * TODO
 *
 * @typedef {object} OpenWhiskEntitiesRule
 * @property {string} trigger trigger name
 * @property {string} action action name
 */

/**
 * The trigger entity definition
 * TODO
 *
 * @typedef {object} OpenWhiskEntitiesTrigger
 * @property {string} [feed] feed associated with the trigger
 * @property {object} [annotations] annotations
 * @property {object} [parameters] parameters
 */

/**
 * The package entity definition
 * TODO
 *
 * @typedef {object} OpenWhiskEntitiesPackage
 * @property {boolean} [publish] true for shared package
 * @property {object} [parameters] parameters
 */

/**
 *
 * The entry point to the information read from the deployment file, this can be extracted using
 * [setPaths](#setpaths).
 * TODO
 *
 * @typedef {Array<object>} DeploymentPackages
 */

/**
 * @typedef {object} DeploymentFileComponents
 * @property {ManifestPackages} packages Packages in the manifest
 * @property {object} deploymentTriggers Trigger names and their inputs in the deployment manifest
 * @property {DeploymentPackages} deploymentPackages Packages in the deployment manifest
 * @property {string} manifestPath Path to manifest
 * @property {object} manifestContent Parsed manifest object
 * @property {string} projectName Name of the project
 */

// for lines starting with date-time-string followed by stdout|stderr a ':' and a log-line, return only the logline
const dtsRegex = /\d{4}-[01]{1}\d{1}-[0-3]{1}\d{1}T[0-2]{1}\d{1}:[0-6]{1}\d{1}:[0-6]{1}\d{1}.\d+Z( *(stdout|stderr):)?\s(.*)/

const stripLog = (elem) => {
  // `2019-10-11T19:08:57.298Z       stdout: login-success ::  { code: ...`
  // should become: `login-success ::  { code: ...`
  const found = elem.match(dtsRegex)
  if (found && found.length > 3) {
    return found[3]
  }
  return elem
}

/**
 * Prints activation logs messages.
 *
 * @param {object} activation the activation
 * @param {boolean} strip if true, strips the timestamp which prefixes every log line
 * @param {object} logger an instance of a logger to emit messages to
 */
function printLogs (activation, strip, logger) {
  if (activation.logs) {
    activation.logs.forEach(elem => {
      if (strip) {
        logger(stripLog(elem))
      } else {
        logger(elem)
      }
    })
  }
}

/**
 * Filters and prints action logs.
 *
 * @param {object} runtime runtime (openwhisk) object
 * @param {object} logger an instance of a logger to emit messages to (may optionally provide logFunc and bannerFunc to customize logging)
 * @param {number} limit maximum number of activations to fetch logs from
 * @param {Array} filterActions array of actions to fetch logs from
 *    ['pkg1/'] = logs of all deployed actions under package pkg1
 *    ['pkg1/action'] = logs of action 'action' under package 'pkg1'
 *    [] = logs of all actions in the namespace
 * @param {boolean} strip if true, strips the timestamp which prefixes every log line
 * @param {number} startTime time in milliseconds. Only logs after this time will be fetched
 * @returns {object} activation timestamp of the last retrieved activation or null
 */
async function printFilteredActionLogs (runtime, logger, limit, filterActions = [], strip = false, startTime = 0) {
  // Get activations
  const listOptions = { limit, skip: 0, since: startTime }
  const logFunc = logger ? logger.logFunc || logger : console.log
  // This will narrow down the activation list to specific action
  if (filterActions.length === 1 && !filterActions[0].endsWith('/')) {
    listOptions.name = filterActions[0]
  }
  let activations = await runtime.activations.list(listOptions)
  let lastActivationTime = 0
  // Filter the activations
  const actionFilterFunc = (actionPath, annotationValue) => {
    // For logs of all deployed actions under a package
    if (actionPath.endsWith('/')) {
      const actionPathStrLookUp = actionPath.startsWith('/') ? actionPath : '/' + actionPath
      return annotationValue.includes(actionPathStrLookUp)
    }
    // For actions with full path (pkg/actionName) specified in filterActions
    return annotationValue.endsWith(actionPath)
  }
  if (filterActions.length > 0) {
    activations = activations.filter((activation) => {
      let includeActivation = false
      activation.annotations.forEach((annotation) => {
        if (annotation.key === 'path' && filterActions.some(actionPath => actionFilterFunc(actionPath, annotation.value))) {
          includeActivation = true
        }
      })
      return includeActivation
    })
  }

  const activationsLogged = []
  // Getting and printing activation logs
  for (let i = (activations.length - 1); i >= 0; i--) {
    const activation = activations[i]
    lastActivationTime = activation.start
    if (lastActivationTime > startTime) {
      await printLogs(activation, runtime)
    }
  }
  return { lastActivationTime }

  /**
   * Check if an activation entry is for a sequence.
   *
   * @param {*} activation activation log entry
   * @returns {boolean} isSequenceActivation
   */
  function isSequenceActivation (activation) {
    if (activation.annotations && activation.annotations.length) {
      return activation.annotations.some(item => (item.key === 'kind' && item.value === 'sequence'))
    }
    return false
  }

  /**
   * Print activation logs
   *
   * @param {object} activation activation object
   * @param {object} runtime runtime object
   */
  async function printActivationLogs (activation, runtime) {
    let retValue
    try {
      if (activationsLogged.includes(activation.activationId)) {
        // Happens when this activation is already covered through a sequence
        return
      } else {
        activationsLogged.push(activation.activationId)
      }

      retValue = await runtime.activations.logs({ activationId: activation.activationId })
      // allow banners to be customized
      if (logger && logger.bannerFunc) {
        logger.bannerFunc(activation, retValue.logs)
      } else {
        activationLogBanner(logFunc, activation, retValue.logs)
      }

      if (retValue.logs.length > 0) {
        retValue.logs.sort()
        retValue.logs.forEach(function (logMsg) {
          if (strip) {
            logFunc(stripLog(logMsg))
          } else {
            logFunc(logMsg)
          }
        })
      }
    } catch (err) { // Happens in some cases such as trying to get logs of a trigger activation
      // TODO: Trigger logs can be obtained from activation result but will need some formatting for the timestamp
      // retValue = await runtime.activations.get({ activationId: activation.activationId })
    }
  }

  /**
   * Print sequence logs
   *
   * @param {object} activation sequence activation
   * @param {object} runtime runtime object
   */
  async function printSequenceLogs (activation, runtime) {
    try {
      const seqActivation = await runtime.activations.get(activation.activationId)
      for (const seqItemActivationId of seqActivation.logs) {
        const seqItemActivation = await runtime.activations.get(seqItemActivationId)
        await printLogs(seqItemActivation, runtime)
      }
    } catch (err) {
      // Happens when either the sequence or one of the actions in the sequence fails with 'application error'
      // Ignore
    }
  }

  /**
   * Print logs
   *
   * @param {object} activation activation
   * @param {object} runtime runtime
   */
  async function printLogs (activation, runtime) {
    if (isSequenceActivation(activation)) {
      await printSequenceLogs(activation, runtime)
    } else {
      await printActivationLogs(activation, runtime)
    }
  }
}

/**
 * returns path to main function as defined in package.json OR default of index.js
 * note: file MUST exist, caller's responsibility, this method will throw if it does not exist
 *
 * @param {string} pkgJsonPath : path to a package.json file
 * @returns {string} path to the entry file
 */
function getActionEntryFile (pkgJsonPath) {
  try {
    const pkgJsonContent = fs.readJsonSync(pkgJsonPath)
    if (pkgJsonContent.main) {
      return pkgJsonContent.main
    }
  } catch (err) {
    aioLogger.debug(`File not found or does not define 'main' : ${pkgJsonPath}`)
  }
  return 'index.js'
}

/**
 * Zip a file/folder using archiver
 *
 * @param {string} filePath path of file.folder to zip
 * @param {string} out output path
 * @param {boolean} pathInZip internal path in zip
 * @returns {Promise} returns with a blank promise when done
 */
function zip (filePath, out, pathInZip = false) {
  aioLogger.debug(`Creating zip of file/folder ${filePath}`)
  const stream = fs.createWriteStream(out)
  const archive = archiver('zip', { zlib: { level: 9 } })

  return new Promise((resolve, reject) => {
    stream.on('close', () => resolve())
    archive.pipe(stream)
    archive.on('error', err => reject(err))

    let stats
    try {
      stats = fs.lstatSync(filePath) // throws if ENOENT
    } catch (e) {
      archive.destroy()
      reject(e)
    }

    if (stats.isDirectory()) {
      archive.directory(filePath, pathInZip)
    } else {
      archive.file(filePath, { name: pathInZip || path.basename(filePath) })
    }
    archive.finalize()
  })
}

/**
 * @description returns key value pairs in an object from the key value array supplied. Used to create parameters object.
 * @returns {object} An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 * @param {Array} inputsArray Array in the form of [{'key':'key1', 'value': 'value1'}]
 */
function createKeyValueObjectFromArray (inputsArray = []) {
  const tempObj = {}
  inputsArray.forEach((input) => {
    if (input && input.key !== undefined && input.key !== null && input.key !== '') {
      tempObj[input.key] = safeParse(input.value)
    } else {
      throw (new Error('Please provide correct input array with key and value params in each array item'))
    }
  })
  return tempObj
}

/**
 * @description returns key value array from the object supplied.
 * @param {object} object JSON object
 * @returns {Array} An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]
 */
function createKeyValueArrayFromObject (object) {
  return Object.keys(object).map(key => ({ key, value: object[key] }))
}

/**
 * @description returns JSON.parse of passed object, but handles exceptions, and numeric strings
 * @param {string} val value to parse
 * @returns {object} the parsed object
 */
function safeParse (val) {
  let resultVal = val
  if (typeof val === 'string') {
    if ((['true', 'false'].indexOf(val) > -1) ||
        (['{', '['].indexOf(val.charAt(0)) > -1)) {
      try {
        resultVal = JSON.parse(val)
      } catch (ex) {
        aioLogger.debug(`JSON parse threw exception for value ${val}`)
      }
    }
  }
  return resultVal
}

/**
 * @description returns key value array from the parameters supplied. Used to create --param and --annotation key value pairs
 * @param {Array} flag value from flags.param or flags.annotation
 * @returns {Array} An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]
 */
function createKeyValueArrayFromFlag (flag) {
  if (flag.length % 2 === 0) {
    const tempArray = []
    for (let i = 0; i < flag.length; i += 2) {
      const obj = { key: flag[i] }
      obj.value = safeParse(flag[i + 1])
      tempArray.push(obj)
    }
    return tempArray
  } else {
    throw (new Error('Please provide correct values for flags'))
  }
}

/**
 * @description returns key value array from the json file supplied. Used to create --param-file and annotation-file key value pairs
 * @param {string} file from flags['param-file'] or flags['annotation-file]
 * @returns {Array} An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]
 */
function createKeyValueArrayFromFile (file) {
  const jsonParams = fs.readJsonSync(file)
  const tempArray = []
  Object.entries(jsonParams).forEach(
    ([key, value]) => {
      tempArray.push({ key, value })
    }
  )
  return tempArray
}

/**
 * @description returns key value pairs in an object from the parameters supplied. Used to create --param and --annotation key value pairs
 * @param {Array} flag from flags.param or flags.annotation
 * @returns {object} An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 */
function createKeyValueObjectFromFlag (flag) {
  if (flag.length % 2 === 0) {
    let i
    const tempObj = {}
    for (i = 0; i < flag.length; i += 2) {
      tempObj[flag[i]] = safeParse(flag[i + 1])
    }
    return tempObj
  } else {
    throw (new Error('Please provide correct values for flags'))
  }
}

/**
 * @description parses a package name string and returns the namespace and entity name for a package
 * @param {string} name package name
 * @returns {object} An object { namespace: string, name: string }
 */
function parsePackageName (name) {
  const delimiter = '/'
  const parts = name.split(delimiter)
  let n = parts.length
  const leadingSlash = name[0] === delimiter
  // accept no more than [/]ns/p
  // these are all valid entries [/]ns/p, p, [/]_/p
  if (n < 1 || n > 3 || (leadingSlash && n === 2) || (!leadingSlash && n === 3)) throw (new Error('Package name is not valid'))
  // skip leading slash, all parts must be non empty (could tighten this check to match EntityName regex)
  parts.forEach(function (part, i) { if (i > 0 && part.trim().length === 0) throw (new Error('Package name is not valid')) })
  if (leadingSlash) {
    parts.shift() // drop leading slash
    n--
  }
  return {
    namespace: n === 2 ? parts[0] : '_',
    name: n === 1 ? parts[0] : parts[1]
  }
}

/**
 * @description returns key value array from the params and/or param-file supplied with more precendence to params.
 * @param {Array} params from flags.param or flags.annotation
 * @param {string} paramFilePath from flags['param-file'] or flags['annotation-file']
 * @returns {Array} An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]
 */
function getKeyValueArrayFromMergedParameters (params, paramFilePath) {
  const paramsActionObj = getKeyValueObjectFromMergedParameters(params, paramFilePath)
  if (Object.keys(paramsActionObj).length > 0) {
    return createKeyValueArrayFromObject(paramsActionObj)
  } else {
    return undefined
  }
}

/**
 * @description returns key value object from the params and/or param-file supplied with more precendence to params.
 * @param {Array} params from flags.param or flags.annotation
 * @param {string} paramFilePath from flags['param-file'] or flags['annotation-file']
 * @returns {object} An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 */
function getKeyValueObjectFromMergedParameters (params, paramFilePath) {
  let paramsActionObj = {}
  if (paramFilePath) {
    paramsActionObj = createKeyValueObjectFromFile(paramFilePath)
  }
  if (params) {
    Object.assign(paramsActionObj, createKeyValueObjectFromFlag(params))
  }
  return paramsActionObj
}

/**
 * @description returns key value pairs from the parameters supplied. Used to create --param-file and --annotation-file key value pairs
 * @param {string} file from flags['param-file'] or flags['annotation-file']
 * @returns {object} An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 */
function createKeyValueObjectFromFile (file) {
  return fs.readJSONSync(file)
}

/**
 * @description Creates an object representation of a sequence.
 * @param {Array} sequenceAction the sequence action array
 * @returns {object} the object representation of the sequence
 */
function createComponentsFromSequence (sequenceAction) {
  const fqn = require('openwhisk-fqn')
  const objSequence = {}
  objSequence.kind = 'sequence'
  // The components array requires fully qualified names [/namespace/package_name/action_name] of all the actions passed as sequence
  objSequence.components = sequenceAction.map(component => {
    return fqn(component)
  })
  return objSequence
}

/* istanbul ignore next */
/**
 * @alias createComponentsFromSequence
 * @deprecated use `createComponentsFromSequence`
 * @param {Array} sequenceAction the sequence action array
 * @returns {object} the object representation of the sequence
 */
function createComponentsfromSequence (sequenceAction) {
  return createComponentsFromSequence(sequenceAction)
}

/**
 * @description Creates a union of two objects
 * @param {object} firstObject the object to merge into
 * @param {object} secondObject the object to merge from
 * @returns {object} the union of both objects
 */
function returnUnion (firstObject, secondObject) {
  return Object.assign(firstObject, secondObject)
}

/**
 * @description Parse a path pattern
 * @param {string} path the path to parse
 * @returns {Array} array of matches
 */
function parsePathPattern (path) {
  const pattern = /^\/(.+)\/(.+)$/i
  const defaultMatch = [null, null, path]

  return (pattern.exec(path) || defaultMatch)
}

/**
 * @param {string} inputString the string that may have env vars
 * @returns {string} output the string with $vars/${vars} replaced
 * @access private
 */
function replaceIfEnvKey (inputString) {
  const getEnvKey = (env) => {
    let val = env
    /* istanbul ignore else */
    if (val.startsWith('$')) {
      val = val.substr(1)
    }
    /* istanbul ignore else */
    if (val.startsWith('{')) {
      val = val.slice(1, -1).trim()
    }
    return val
  }
  let match
  let output = inputString
  // eslint-disable-next-line prefer-regex-literals
  const envKeyMatch = RegExp(/(\${|\${ +|\$)[a-zA-Z0-9_-]+( +}|}|)/, 'g')
  while ((match = envKeyMatch.exec(inputString)) !== null) {
    // eslint-disable-next-line no-param-reassign
    output = output.replace(match[0], process.env[getEnvKey(match[0])] || '')
  }
  return output
}

/**
 * @description Process inputs
 * @param {object} input the input object to process
 * @param {object} params the parameters for the input to process
 * @returns {object} the processed inputs
 */
function processInputs (input, params) {
  if (typeof input === 'object') {
    const output = cloneDeep(input)
    const dictDataTypes = {
      string: '',
      integer: 0,
      number: 0
    }
    const recursiveProcess = (output) => {
      /* eslint-disable no-param-reassign */
      for (const key in output) {
        if (typeof output[key] === 'string') {
          if (Object.prototype.hasOwnProperty.call(dictDataTypes, output[key])) {
            output[key] = dictDataTypes[output[key]]
          } else {
            output[key] = replaceIfEnvKey(output[key])
          }
        }
        if (typeof output[key] === 'object') {
          const defaultKeys = ['value', 'default']
          for (const someKey in output[key]) {
            if (defaultKeys.includes(someKey)) {
              output[key] = replaceIfEnvKey(output[key][someKey])
            } else {
              recursiveProcess(output[key])
            }
          }
        }
      }
    }
    // replace with param values if any params.
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        output[key] = params[key]
      }
    }
    recursiveProcess(output)
    return output
  } else {
    aioLogger.debug('processInputs::Invalid input')
    return undefined
  }
}

/**
 * @description Create a key-value object from the input
 * @param {object} input the input to process
 * @returns {object} the processed input as a key-value object
 */
function createKeyValueInput (input) {
  const arrayInput = Object.keys(input).map(function (k) {
    return { key: k, value: input[k] }
  })
  return arrayInput
}

/**
 * @description Get the deployment yaml file path
 * @returns {string} the deployment yaml path
 */
function getDeploymentPath () {
  let deploymentPath
  if (fs.existsSync('./deployment.yaml')) {
    deploymentPath = 'deployment.yaml'
  } else if (fs.existsSync('./deployment.yml')) {
    deploymentPath = 'deployment.yml'
  }
  return deploymentPath
}

/**
 * @description Get the manifest yaml file path
 * @returns {string} the manifest yaml path
 */
function getManifestPath () {
  let manifestPath
  if (fs.existsSync('./manifest.yaml')) {
    manifestPath = 'manifest.yaml'
  } else if (fs.existsSync('./manifest.yml')) {
    manifestPath = 'manifest.yml'
  } else {
    throw (new Error('Manifest file not found'))
  }
  return manifestPath
}

/**
 * @description Get the deployment trigger inputs.
 * @param {DeploymentPackages} deploymentPackages the deployment packages
 * @returns {object} the deployment trigger inputs
 */
function returnDeploymentTriggerInputs (deploymentPackages) {
  const deploymentTriggers = {}
  Object.keys(deploymentPackages).forEach((key) => {
    if (deploymentPackages[key].triggers) {
      Object.keys(deploymentPackages[key].triggers).forEach((trigger) => {
        deploymentTriggers[trigger] = deploymentPackages[key].triggers[trigger].inputs || {}
      })
    }
  })
  return deploymentTriggers
}

/**
 * @description Get the annotations for an action
 * @param {ManifestAction} action the action manifest object
 * @returns {object} the action annotation entities
 */
function returnAnnotations (action) {
  const annotationParams = action && action.annotations ? cloneDeep(action.annotations) : {}
  // common annotations
  if (action.annotations && action.annotations.conductor !== undefined) {
    annotationParams.conductor = action.annotations.conductor
  }

  // web related annotations
  if (action.web !== undefined) {
    Object.assign(annotationParams, checkWebFlags(action.web))
  } else if (action['web-export'] !== undefined) {
    Object.assign(annotationParams, checkWebFlags(action['web-export']))
  } else {
    annotationParams['web-export'] = false
    annotationParams['raw-http'] = false
  }

  if (action.annotations && annotationParams['web-export'] === true) {
    if (action.annotations['require-whisk-auth'] !== undefined) {
      annotationParams['require-whisk-auth'] = action.annotations['require-whisk-auth']
    }
    if (action.annotations['raw-http'] !== undefined) {
      annotationParams['raw-http'] = action.annotations['raw-http']
    }
    if (action.annotations.final !== undefined) {
      annotationParams.final = action.annotations.final
    }
  }
  return annotationParams
}

/**
 * Creates an array of route definitions from the given manifest-based package.
 * See https://github.com/apache/openwhisk-wskdeploy/blob/master/parsers/manifest_parser.go#L1187
 *
 * @param {ManifestPackage} pkg The package definition from the manifest.
 * @param {string} pkgName The name of the package.
 * @param {string} apiName The name of the HTTP API definition from the manifest.
 * @param {Array} allowedActions List of action names allowed to be used in routes.
 * @param {Array} allowedSequences List of sequence names allowed to be used in routes.
 * @param {boolean} pathOnly Skip action, method and response type in route definitions.
 * @returns {Array<OpenWhiskEntitiesRoute>} the array of route entities
 */
function createApiRoutes (pkg, pkgName, apiName, allowedActions, allowedSequences, pathOnly) {
  const actions = pkg.actions
  const sequences = pkg.sequences
  const basePaths = pkg.apis[apiName]

  if (!basePaths) {
    throw new Error('Arguments to create API not provided')
  }

  const routes = []

  Object.keys(basePaths).forEach((basePathName) => {
    const basePath = basePaths[basePathName]

    Object.keys(basePath).forEach((resourceName) => {
      const resource = basePath[resourceName]

      Object.keys(resource).forEach((actionName) => {
        const route = {
          name: apiName,
          basepath: `/${basePathName}`,
          relpath: `/${resourceName}`
        }

        // only name/path based information is requested
        // add basic route and skip
        if (pathOnly) {
          routes.push(route)
          return
        }

        // if action name is among allowed set, get from package actions
        let actionDefinition = allowedActions.includes(actionName)
          ? actions[actionName]
          : null

        // no action of that name, fall back to sequences if available
        if (!actionDefinition) {
          actionDefinition = allowedSequences.includes(actionName)
            ? sequences[actionName]
            : null
        }

        // neither action nor sequence found, abort
        if (!actionDefinition) {
          throw new Error('Action provided in the api not present in the package')
        }

        // ensure action or sequence has the web annotation
        if (!actionDefinition.web && !actionDefinition['web-export']) {
          throw new Error('Action or sequence provided in api is not a web action')
        }

        const action = resource[actionName]

        routes.push({
          ...route,
          action: `${pkgName}/${actionName}`,
          operation: action.method,
          responsetype: action.response || 'json'
        })
      })
    })
  })

  return routes
}

/**
 * @description Create a sequence object that is compatible with the OpenWhisk API from a parsed manifest object
 * @param {string} fullName the full sequence name prefixed with the package, e.g. `pkg/sequence`
 * @param {ManifestSequence} manifestSequence a sequence object as defined in a valid manifest file
 * @param {string} packageName the package name of the sequence, which will be set to for actions in the sequence
 * @returns {OpenWhiskEntitiesAction} a sequence object describing the action entity
 */
function createSequenceObject (fullName, manifestSequence, packageName) {
  let actionArray = []
  if (manifestSequence.actions) {
    actionArray = manifestSequence.actions.split(',')
    actionArray = actionArray.map((action) => {
      // remove space between two actions after split
      const actionItem = action.replace(/\s+/g, '')
      if (actionItem.split('/').length > 1) {
        return actionItem
      } else {
        return `${packageName}/${actionItem}`
      }
    })
  } else {
    throw new Error('Actions for the sequence not provided.')
  }
  const execObj = {}
  execObj.kind = 'sequence'
  execObj.components = actionArray
  return { action: '', name: fullName, exec: execObj }
}

/**
 * @description Check the web flags
 * @param {string|boolean} flag the flag to check
 * @returns {object} object with the appropriate web flags for an action
 */
function checkWebFlags (flag) {
  const tempObj = {}
  switch (flag) {
    case true:
    case 'yes' :
      tempObj['web-export'] = true
      break
    case 'raw' :
      tempObj['web-export'] = true
      tempObj['raw-http'] = true
      break
    case false:
    case 'no':
      tempObj['web-export'] = false
      tempObj['raw-http'] = false
  }
  return tempObj
}

/**
 * Create an action object compatible with the OpenWhisk API from an action object parsed from the manifest.
 *
 * @param {string} fullName the full action name prefixed with the package, e.g. `pkg/action`
 * @param {ManifestAction} manifestAction the action object as parsed from the manifest
 * @returns {OpenWhiskEntitiesAction} the action entity object
 */
function createActionObject (fullName, manifestAction) {
  const objAction = { name: fullName }
  if (manifestAction.function.endsWith('.zip')) {
    if (!manifestAction.runtime && !manifestAction.docker) {
      throw (new Error(`Invalid or missing property "runtime" in the manifest for this action: ${objAction && objAction.name}`))
    }
    objAction.action = fs.readFileSync(manifestAction.function)
  } else {
    objAction.action = fs.readFileSync(manifestAction.function, { encoding: 'utf8' })
  }

  if (manifestAction.main || manifestAction.docker || manifestAction.runtime) {
    objAction.exec = {}
    if (manifestAction.main) {
      objAction.exec.main = manifestAction.main
    }
    if (manifestAction.docker) {
      objAction.exec.kind = 'blackbox'
      objAction.exec.image = manifestAction.docker
    } else if (manifestAction.runtime) {
      objAction.exec.kind = manifestAction.runtime
    }
  }

  if (manifestAction.limits) {
    const concurrencyLimit = manifestAction.limits.concurrentActivations || manifestAction.limits.concurrency
    objAction.limits = {
      memory: manifestAction.limits.memorySize || manifestAction.limits.memory || 256,
      logs: manifestAction.limits.logSize || 10,
      timeout: manifestAction.limits.timeout || 60000
    }
    if (concurrencyLimit) {
      objAction.limits.concurrency = concurrencyLimit
    }
  }
  objAction.annotations = returnAnnotations(manifestAction)
  return objAction
}

/**
 * This is a temporary function that implements the support for the `require-adobe-auth`
 * annotation for web actions by rewriting the action to a sequence that first executes
 * the /adobeio/shared-validators-v1/headless-v2 validator.
 *
 * As an example, the following manifest:
 * ```
 * packages:
 * helloworld:
 * actions:
 * hello:
 * function: path/to/hello.js
 * web: 'yes'
 * require-adobe-auth: true
 * ```
 * will be deployed as:
 * ```
 * packages:
 * helloworld:
 * actions:
 * __secured_hello:
 * # secured by being non web !
 * function: path/to/hello.js
 * sequences:
 * hello:
 * actions: '/adobeio/shared-validators-v1/headless-v2,helloworld/__secured_hello'
 * web: 'yes'
 * ```
 *
 * The annotation will soon be natively supported in Adobe I/O Runtime, at which point
 * this function and references to it can be safely deleted.
 *
 * @access private
 * @param {ManifestPackages} packages the manifest packages
 * @param {DeploymentPackages} deploymentPackages  the deployment packages
 * @returns {{ newPackages: ManifestPackages, newDeploymentPackages: DeploymentPackages}}
 *          an object with the new manifest and deployment packages
 */
function rewriteActionsWithAdobeAuthAnnotation (packages, deploymentPackages) {
  const { getCliEnv, DEFAULT_ENV, PROD_ENV, STAGE_ENV } = require('@adobe/aio-lib-env')
  const env = getCliEnv() || DEFAULT_ENV

  // do not modify those
  const ADOBE_AUTH_ACTIONS = {
    [PROD_ENV]: '/adobeio/shared-validators-v1/headless-v2',
    [STAGE_ENV]: '/adobeio-stage/shared-validators-v1/headless-v2'
  }
  const ADOBE_AUTH_ANNOTATION = 'require-adobe-auth'
  const ADOBE_AUTH_ACTION = ADOBE_AUTH_ACTIONS[env]
  const REWRITE_ACTION_PREFIX = '__secured_'

  // avoid side effects, do not modify input packages
  const newPackages = cloneDeep(packages)
  const newDeploymentPackages = cloneDeep(deploymentPackages)

  // traverse all actions in all packages
  Object.keys(newPackages).forEach((key) => {
    if (newPackages[key].actions) {
      Object.keys(newPackages[key].actions).forEach((actionName) => {
        const thisAction = newPackages[key].actions[actionName]

        const isWebExport = checkWebFlags(thisAction['web-export'])['web-export']
        const isWeb = checkWebFlags(thisAction.web)['web-export']
        const isRaw = checkWebFlags(thisAction.web)['raw-http'] || checkWebFlags(thisAction['web-export'])['raw-http']

        // check if the annotation is defined AND the action is a web action
        if ((isWeb || isWebExport) && thisAction.annotations && thisAction.annotations[ADOBE_AUTH_ANNOTATION]) {
          aioLogger.debug(`found annotation '${ADOBE_AUTH_ANNOTATION}' in action '${key}/${actionName}', cli env = ${env}`)

          // 1. rename the action
          const renamedAction = REWRITE_ACTION_PREFIX + actionName
          /* istanbul ignore if */
          if (newPackages[key].actions[renamedAction] !== undefined) {
            // unlikely
            throw new Error(`Failed to rename the action '${key}/${actionName}' to '${key}/${renamedAction}': an action with the same name exists already.`)
          }

          // set the action to the new key
          newPackages[key].actions[renamedAction] = thisAction
          // delete the old key
          delete newPackages[key].actions[actionName]

          // make sure any content in the deployment package is linked to the new action name
          if (newDeploymentPackages[key] && newDeploymentPackages[key].actions && newDeploymentPackages[key].actions[actionName]) {
            newDeploymentPackages[key].actions[renamedAction] = newDeploymentPackages[key].actions[actionName]
            delete newDeploymentPackages[key].actions[actionName]
          }

          // 2. delete the adobe-auth annotation and secure the renamed action
          // the renamed action is made secure by removing its web property
          if (isWeb) {
            newPackages[key].actions[renamedAction].web = false
          }
          if (isWebExport) {
            newPackages[key].actions[renamedAction]['web-export'] = false
          }
          delete newPackages[key].actions[renamedAction].annotations[ADOBE_AUTH_ANNOTATION]

          aioLogger.debug(`renamed action '${key}/${actionName}' to '${key}/${renamedAction}'`)

          // 3. create the sequence
          if (newPackages[key].sequences === undefined) {
            newPackages[key].sequences = {}
          }
          /* istanbul ignore if */
          if (newPackages[key].sequences[actionName] !== undefined) {
            // unlikely
            throw new Error(`The name '${key}/${actionName}' is defined both for an action and a sequence, it should be unique`)
          }
          // set the sequence content
          newPackages[key].sequences[actionName] = {
            actions: `${ADOBE_AUTH_ACTION},${key}/${renamedAction}`,
            web: (isRaw && 'raw') || 'yes'
          }

          aioLogger.debug(`defined new sequence '${key}/${actionName}': '${ADOBE_AUTH_ACTION},${key}/${renamedAction}'`)
        }
      })
    }
  })
  return {
    newPackages,
    newDeploymentPackages
  }
}

/**
 *
 * Process the manifest and deployment content and returns deployment entities.
 *
 * @param {ManifestPackages} packages the manifest packages
 * @param {DeploymentPackages} deploymentPackages the deployment packages
 * @param {object} deploymentTriggers the deployment triggers
 * @param {object} params the package params
 * @param {boolean} [namesOnly=false] if false, set the namespaces as well
 * @param {object} [owOptions={}] additional OpenWhisk options
 * @returns {OpenWhiskEntities} deployment entities
 */
function processPackage (packages,
  deploymentPackages,
  deploymentTriggers,
  params,
  namesOnly = false,
  owOptions = {}) {
  // eslint - do not rewrite function arguments
  let pkgs = packages
  let deploymentPkgs = deploymentPackages
  if (owOptions.apihost === 'https://adobeioruntime.net') {
    // rewrite packages in case there are any `require-adobe-auth` annotations
    // this is a temporary feature and will be replaced by a native support in Adobe I/O Runtime
    const { newPackages, newDeploymentPackages } = rewriteActionsWithAdobeAuthAnnotation(pkgs, deploymentPkgs)
    pkgs = newPackages
    deploymentPkgs = newDeploymentPackages
  }

  const pkgAndDeps = []
  const actions = []
  const routes = []
  const rules = []
  const triggers = []
  const ruleAction = []
  const ruleTrigger = []
  const arrSequence = []

  Object.keys(pkgs).forEach((key) => {
    // back-patch from adobe/aio-cli-plugin-runtime/commit/d455ed57b6d5c20a202b495e6a5dab477473854c
    const objPackage = { name: key }
    if (pkgs[key].public) {
      objPackage.package = { publish: pkgs[key].public }
    }
    let pkgDeploymentInputs = {}
    const packageInputs = pkgs[key].inputs || {}
    if (deploymentPkgs[key]) {
      pkgDeploymentInputs = deploymentPkgs[key].inputs || {}
    }
    const allPkgInputs = returnUnion(packageInputs, pkgDeploymentInputs)
    // if parameter is provided as key : 'data type' , process it to set default values before deployment
    if (Object.entries(allPkgInputs).length !== 0) {
      const processedInput = createKeyValueInput(processInputs(allPkgInputs, params))
      objPackage.package = objPackage.package || {}
      objPackage.package.parameters = processedInput
    }
    pkgAndDeps.push(objPackage)
    // From wskdeploy repo : currently, the 'version' and 'license' values are not stored in Apache OpenWhisk, but there are plans to support it in the future
    // pkg.version = packages[key]['version']
    // pkg.license = packages[key]['license']
    if (pkgs[key].dependencies) {
      Object.keys(pkgs[key].dependencies).forEach((depName) => {
        const thisDep = pkgs[key].dependencies[depName]
        const objDep = { name: depName }
        if (!namesOnly) {
          let objDepPackage = {}
          try { // Parse location
            const thisLocation = thisDep.location.split('/')
            objDepPackage = {
              binding: {
                namespace: thisLocation[1],
                name: thisLocation[2]
              }
            }
          } catch (ex) {
            throw (new Error(`Invalid or missing property "location" in the manifest for this action: ${depName}`))
          }
          // Parse inputs
          let deploymentInputs = {}
          const packageInputs = thisDep.inputs || {}
          if (deploymentPkgs[key] && deploymentPkgs[key].dependencies && deploymentPkgs[key].dependencies[depName]) {
            deploymentInputs = deploymentPkgs[key].dependencies[depName].inputs || {}
          }
          const allInputs = returnUnion(packageInputs, deploymentInputs)
          // if parameter is provided as key : 'data type' , process it to set default values before deployment
          if (Object.entries(allInputs).length !== 0) {
            const processedInput = createKeyValueInput(processInputs(allInputs, params))
            objDepPackage.parameters = processedInput
          }
          objDep.package = objDepPackage
        }
        pkgAndDeps.push(objDep)
      })
    }
    if (pkgs[key].actions) {
      Object.keys(pkgs[key].actions).forEach((actionName) => {
        const thisAction = pkgs[key].actions[actionName]
        let objAction = { name: `${key}/${actionName}` }
        if (!namesOnly) {
          objAction = createActionObject(objAction.name, thisAction)
          let deploymentInputs = {}
          const packageInputs = thisAction.inputs || {}
          if (deploymentPkgs[key] && deploymentPkgs[key].actions && deploymentPkgs[key].actions[actionName]) {
            deploymentInputs = deploymentPkgs[key].actions[actionName].inputs || {}
          }
          const allInputs = returnUnion(packageInputs, deploymentInputs)
          // if parameter is provided as key : 'data type' , process it to set default values before deployment
          if (Object.entries(allInputs).length !== 0) {
            const processedInput = processInputs(allInputs, params)
            objAction.params = processedInput
          }
          ruleAction.push(actionName)
        }
        actions.push(objAction)
      })
    }

    if (pkgs[key].sequences) {
      // Sequences can have only one field : actions
      // Usage: aio runtime:action:create <action-name> --sequence existingAction1, existingAction2
      Object.keys(pkgs[key].sequences).forEach((sequenceName) => {
        let objSequence = { name: `${key}/${sequenceName}` }
        if (!namesOnly) {
          const thisSequence = pkgs[key].sequences[sequenceName]
          objSequence = createSequenceObject(objSequence.name, thisSequence, key)
          objSequence.annotations = returnAnnotations(thisSequence)
          arrSequence.push(sequenceName)
        }
        actions.push(objSequence)
      })
    }
    if (pkgs[key].triggers) {
      Object.keys(pkgs[key].triggers).forEach((triggerName) => {
        const objTrigger = { name: triggerName }
        if (!namesOnly) {
          objTrigger.trigger = {}
          const packageInputs = pkgs[key].triggers[triggerName].inputs || {}
          let deploymentInputs = {}
          if (triggerName in deploymentTriggers) {
            deploymentInputs = deploymentTriggers[triggerName]
          }
          let allInputs = returnUnion(packageInputs, deploymentInputs)
          allInputs = createKeyValueInput(processInputs(allInputs, {}))
          if (Object.entries(allInputs).length !== 0) {
            objTrigger.trigger.parameters = allInputs
          }
          if (pkgs[key].triggers[triggerName].annotations) {
            objTrigger.trigger.annotations = createKeyValueInput(pkgs[key].triggers[triggerName].annotations)
          }
          if (pkgs[key].triggers[triggerName].feed) {
            objTrigger.trigger.feed = pkgs[key].triggers[triggerName].feed
          }
          ruleTrigger.push(triggerName)
        }
        // trigger creation requires only name parameter and hence will be created in all cases
        triggers.push(objTrigger)
      })
    }
    // Rules cannot belong to any package
    if (pkgs[key].rules) {
      Object.keys(pkgs[key].rules).forEach((ruleName) => {
        const objRule = { name: ruleName }
        if (!namesOnly) {
          if (pkgs[key].rules[ruleName].trigger && pkgs[key].rules[ruleName].action) {
            objRule.trigger = pkgs[key].rules[ruleName].trigger
            objRule.action = pkgs[key].rules[ruleName].action
            if (objRule.action.split('/').length > 1) {
              objRule.action = objRule.action.split('/').pop()
            }
          } else {
            throw new Error('Trigger and Action are both required for rule creation')
          }
          if ((ruleAction.includes(objRule.action) || arrSequence.includes(objRule.action)) && ruleTrigger.includes(objRule.trigger)) {
            objRule.action = `${key}/${objRule.action}`
          } else {
            throw new Error('Action/Trigger provided in the rule not found in manifest file')
          }
        }
        rules.push(objRule)
      })
    }

    if (pkgs[key].apis) {
      Object.keys(pkgs[key].apis).forEach((apiName) => {
        const apiRoutes = createApiRoutes(pkgs[key], key, apiName, ruleAction, arrSequence, namesOnly)
        routes.push.apply(routes, apiRoutes) // faster than concat for < 100k elements
      })
    }
  })
  return {
    pkgAndDeps,
    apis: routes,
    triggers,
    rules,
    actions
  }
}

/**
 * Get the deployment file components.
 *
 * @param {object} flags (manifest + deployment)
 * @returns {DeploymentFileComponents} fileComponents
 */
function setPaths (flags = {}) {
  let manifestPath
  if (!flags.manifest) {
    manifestPath = getManifestPath()
  } else {
    manifestPath = flags.manifest
  }
  aioLogger.debug(`Using manifest file: ${manifestPath}`)

  let deploymentPath
  let deploymentPackages = {}
  if (!flags.deployment) {
    deploymentPath = getDeploymentPath()
  } else {
    deploymentPath = flags.deployment
  }
  let deploymentTriggers = {}
  let deploymentProjectName = ''
  if (deploymentPath) {
    const deployment = yaml.load(fs.readFileSync(deploymentPath, 'utf8'))
    deploymentProjectName = deployment.project.name || ''
    deploymentPackages = deployment.project.packages
    deploymentTriggers = returnDeploymentTriggerInputs(deploymentPackages)
  }

  const manifest = yaml.load(fs.readFileSync(manifestPath, 'utf8'))
  let packages
  let projectName = ''
  if (manifest.project) {
    projectName = manifest.project.name || ''
    packages = manifest.project.packages
  }
  // yaml files from wskdeploy export sometimes have projects and packages at same level (indentation)
  if (manifest.packages) {
    packages = manifest.packages
  }

  // project name in manifest can be undefined and still packages can be deployed/reported
  // if project name is present in both manifest and deployment files, they should be equal
  // in case of aio runtime deploy sync, project name is mandatory -> handled in sync.js
  if (deploymentPath) {
    if (projectName !== '' && projectName !== deploymentProjectName) {
      throw new Error('The project name in the deployment file does not match the project name in the manifest file')
    }
  }

  const filecomponents = {
    packages,
    deploymentTriggers,
    deploymentPackages,
    manifestPath,
    manifestContent: manifest,
    projectName
  }
  return filecomponents
}

/**
 * Handle Adobe auth action dependency
 *
 * This is a temporary solution and needs to be removed when headless apps will be able to
 * validate against app-registry
 *
 * This function stores the IMS organization id in the Adobe I/O cloud state library which
 * is required by the headless validator.
 *
 * The IMS org id must be stored beforehand in `@adobe/aio-lib-core-config` under the
 * `'project.org.ims_org_id'` key. TODO: pass in imsOrgId
 *
 * @param {Array<OpenWhiskEntitiesAction>} actions the array of action deployment entities
 * @param {object} owOptions OpenWhisk options
 * @param {string} imsOrgId the IMS Org Id
 */
async function setupAdobeAuth (actions, owOptions, imsOrgId) {
  // NOTE: this is usefull only with the legacy headless ims-org validator that needs the ims org stored in state lib
  // the code is kept in case of need to rollback

  // do not modify those
  const ADOBE_HEADLESS_AUTH_ACTION = '/adobeio/shared-validators-v1/headless-v2'
  const AIO_STATE_KEY = '__aio'
  const AIO_STATE_PUT_ENDPOINT = 'https://adobeio.adobeioruntime.net/api/v1/web/state/put'

  const hasAnAdobeHeadlessAuthSequence = actions.some(a => a.exec && a.exec.kind === 'sequence' && a.exec.components.includes(ADOBE_HEADLESS_AUTH_ACTION))
  if (hasAnAdobeHeadlessAuthSequence) {
    // if we use the headless (default auth action) we need to store the ims org id in the
    // cloud state lib. This is needed by the auth action to perform an org check.
    if (!imsOrgId) {
      throw new Error('imsOrgId must be defined when using the Adobe headless auth validator')
    }
    const res = await fetch(AIO_STATE_PUT_ENDPOINT, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(owOptions.apiKey).toString('base64')}`
      },
      body: JSON.stringify({
        namespace: owOptions.namespace,
        key: AIO_STATE_KEY,
        value: { project: { org: { ims_org_id: imsOrgId } } },
        ttl: -1 // unlimited
      })
    })
    if (!res.ok) {
      throw new Error(`failed setting ims_org_id=${imsOrgId} into state lib, received status=${res.status}, please make sure your runtime credentials are correct`)
    }
    aioLogger.debug(`set IMS org id into cloud state, response: ${JSON.stringify(await res.json())}`)
  }
}

/**
 * Deploy all processed entities: can deploy packages, actions, triggers, rules and apis.
 *
 * @param {OpenWhiskEntitiesAction} entities the processed entities
 * @param {object} ow the OpenWhisk client
 * @param {object} logger the logger
 * @param {string} imsOrgId the IMS Org ID
 */
async function deployPackage (entities, ow, logger, imsOrgId) {
  const actionOpts = await ow.actions.client.options
  const ns = actionOpts.namespace
  const { apihost } = ow.initOptions

  /* this is a temporary workaround to setup Adobe auth dependencies */
  await setupAdobeAuth(entities.actions, actionOpts, imsOrgId)

  for (const pkg of entities.pkgAndDeps) {
    if (pkg.name === DEFAULT_PACKAGE_RESERVED_NAME) { // reserved package name, do not create
      logger(`Info: Skipped creating package [${pkg.name}] because it is a reserved package.`)
    } else {
      logger(`Info: Deploying package [${pkg.name}]...`)
      await ow.packages.update(pkg)
      logger(`Info: package [${pkg.name}] has been successfully deployed.\n`)
    }
  }

  for (const action of entities.actions) {
    const retAction = cloneDeep(action)
    if (retAction?.exec?.kind && !isSupportedActionKind(retAction)) {
      const supportedServerRuntimes = (await getSupportedServerRuntimes(apihost)).sort().reverse()
      if (supportedServerRuntimes.includes(retAction?.exec?.kind)) {
        aioLogger.debug(`Local node kinds mismatch with server supported kinds ${supportedServerRuntimes}`)
      } else {
        throw new Error(`Unsupported node version '${retAction?.exec?.kind}' in action ${retAction.name}.\n` +
          `Supported runtimes on ${apihost}: ${supportedServerRuntimes}`)
      }
    }

    if (retAction.exec && action.exec.kind === 'sequence') {
      retAction.exec.components = retAction.exec.components.map(sequence => {
        /*
          Input => Output
          spackage/saction => /ns/spackage/saction
          /spackage/saction => /ns/spackage/saction
          snamespace/spackage/saction => /snamespace/spackage/saction
          /snamespace/spackage/saction => /snamespace/spackage/saction
        */
        const normalizedSequence = sequence.startsWith('/') ? sequence.substr(1) : sequence
        const actionItemCount = normalizedSequence.split('/').length
        return (actionItemCount > 2)
          ? `/${normalizedSequence}`
          : `/${ns}/${normalizedSequence}`
      })
    }

    if (retAction.name.startsWith(`${DEFAULT_PACKAGE_RESERVED_NAME}/`)) { // remove the default package prefix
      retAction.name = retAction.name.substring(`${DEFAULT_PACKAGE_RESERVED_NAME}/`.length)
    }
    logger(`Info: Deploying action [${retAction.name}]...`)
    await ow.actions.update(retAction)
    logger(`Info: action [${retAction.name}] has been successfully deployed.\n`)
  }

  for (const route of entities.apis) {
    const routeInfo = `[${route.operation} ${route.basepath}${route.relpath} [${route.action}]]`
    logger(`Info: Deploying API route ${routeInfo} for API [${route.name}]...`)
    await ow.routes.create(route)
    logger(`Info: API route ${routeInfo} successfully deployed.\n`)
  }
  for (const trigger of entities.triggers) {
    logger(`Info: Deploying trigger [${trigger.name}]...`)
    await ow.triggers.update(trigger)
    logger(`Info: trigger [${trigger.name}] has been successfully deployed.\n`)
  }
  for (const rule of entities.rules) {
    logger(`Info: Deploying rule [${rule.name}]...`)
    rule.action = `/${ns}/${rule.action}`
    await ow.rules.update(rule)
    logger(`Info: rule [${rule.name}] has been successfully deployed.\n`)
  }
  logger('Success: Deployment completed successfully.')
}

/**
 * Undeploy all processed entities: can undeploy packages, actions, triggers, rules and apis.
 * Entity definitions do not need to be complete, only the names are needed for un-deployment.
 *
 * @param {object} entities the processed entities, only names are enough for undeploy
 * @param {object} ow the OpenWhisk object
 * @param {object} logger the logger
 */
async function undeployPackage (entities, ow, logger) {
  for (const action of entities.actions) {
    logger(`Info: Undeploying action [${action.name}]...`)
    await ow.actions.delete({ name: action.name })
    logger(`Info: action [${action.name}] has been successfully undeployed.\n`)
  }
  for (const trigger of entities.triggers) {
    logger(`Info: Undeploying trigger [${trigger.name}]...`)
    await ow.triggers.delete({ name: trigger.name })
    logger(`Info: trigger [${trigger.name}] has been successfully undeployed.\n`)
  }
  for (const rule of entities.rules) {
    logger(`Info: Undeploying rule [${rule.name}]...`)
    await ow.rules.delete({ name: rule.name })
    logger(`Info: rule [${rule.name}] has been successfully undeployed.\n`)
  }
  for (const route of entities.apis) {
    const routeInfo = `[${route.operation} ${route.basepath}${route.relpath} [${route.action}]]`
    logger(`Info: Deleting API route ${routeInfo} for API [${route.name}]...`)
    await ow.routes.delete({ basepath: route.basepath, relpath: route.relpath }) // cannot use name + basepath
    logger(`Info: API route ${routeInfo} successfully deleted.\n`)
  }
  for (const packg of entities.pkgAndDeps) {
    logger(`Info: Undeploying package [${packg.name}]...`)
    await ow.packages.delete({ name: packg.name })
    logger(`Info: package [${packg.name}] has been successfully undeployed.\n`)
  }
  logger('Success: Undeployment completed successfully.')
}

/**
 *
 * Sync a project. This is a higher level function that can be used to sync a local
 * manifest with deployed entities.
 *
 * `syncProject` doesn't only deploy entities it might also undeploy entities that are not
 * defined in the manifest. This behavior can be disabled via the `deleteEntities` boolean
 * parameter.
 *
 * @param {string} projectName the project name
 * @param {string} manifestPath the manifest path
 * @param {string} manifestContent the manifest content, needed to compute hash
 * @param {OpenWhiskEntities} entities the entities, extracted via `processPackage`
 * @param {object} ow the OpenWhisk object
 * @param {object} logger the logger
 * @param {string} imsOrgId the IMS Org ID
 * @param {boolean} deleteEntities set to true to delete entities
 */
async function syncProject (projectName, manifestPath, manifestContent, entities, ow, logger, imsOrgId, deleteEntities = true) {
  // find project hash from server based on entities in the manifest file
  const hashProjectSynced = await findProjectHashOnServer(ow, projectName)

  // compute the project hash from the manifest file
  const projectHash = getProjectHash(manifestContent, manifestPath)
  await addManagedProjectAnnotations(entities, manifestPath, projectName, projectHash)
  await deployPackage(entities, ow, logger, imsOrgId)
  if (deleteEntities && (projectHash !== hashProjectSynced)) {
    // delete old files with same project name that do not exist in the manifest file anymore
    const junkEntities = await getProjectEntities(hashProjectSynced, true, ow)
    await undeployPackage(junkEntities, ow, () => {})
  }
}

/**
 *
 * Get deployed entities for a managed project. This methods retrieves all the deployed
 * entities for a given project name or project hash. This only works if the project was
 * deployed using the `whisk-managed` annotation. This annotation can be set
 * pre-deployement using `[addManagedProjectAnnotations](#addmanagedprojectannotations)`.
 *
 * Note that returned apis will always be empty as they don't support annotations and
 * hence are not managed as part of a project.
 *
 * @param {string} project the project name or hash
 * @param {boolean} isProjectHash set to true if the project is a hash, and not the name
 * @param {object} ow the OpenWhisk client object
 * @returns {Promise<OpenWhiskEntities>} the deployed project entities
 */
async function getProjectEntities (project, isProjectHash, ow) {
  let paramtobeChecked
  if (isProjectHash) {
    paramtobeChecked = 'projectHash'
  } else {
    paramtobeChecked = 'projectName'
  }

  const getEntityList = async id => {
    const res = []
    const entityListResult = await ow[id].list()
    for (const entity of entityListResult) {
      if (entity.annotations.length > 0) {
        const whiskManaged = entity.annotations.find(a => a.key === 'whisk-managed')
        if (whiskManaged && whiskManaged.value && whiskManaged.value[paramtobeChecked] === project) {
          if (id === 'actions') {
            // get action package name
            const nsAndPkg = entity.namespace.split('/')
            if (nsAndPkg.length > 1) {
              entity.name = `${nsAndPkg[1]}/${entity.name}`
            }
          }
          res.push(entity)
        }
      }
    }
    return res
  }

  // parallel io
  const entitiesArray = await Promise.all(['actions', 'triggers', 'rules', 'packages'].map(getEntityList))

  const entities = {
    actions: entitiesArray[0],
    triggers: entitiesArray[1],
    rules: entitiesArray[2],
    pkgAndDeps: entitiesArray[3],
    apis: [] // apis are not whisk-managed (no annotation support)
  }

  return entities
}

/**
 *
 * Add the `whisk-managed` annotation to processed entities. This is needed for syncing
 * managed projects.
 *
 * @param {OpenWhiskEntities} entities the processed entities
 * @param {string} manifestPath the manifest path
 * @param {string} projectName the project name
 * @param {string} projectHash the project hash
 */
async function addManagedProjectAnnotations (entities, manifestPath, projectName, projectHash) {
  // add whisk managed annotations
  for (const pkg of entities.pkgAndDeps) {
    pkg.annotations = pkg.annotations || {}
    pkg.annotations['whisk-managed'] = {
      file: manifestPath,
      projectDeps: [],
      projectHash,
      projectName
    }
  }
  for (const action of entities.actions) {
    action.annotations['whisk-managed'] = {
      file: manifestPath,
      projectDeps: [],
      projectHash,
      projectName
    }
  }

  for (const trigger of entities.triggers) {
    const managedAnnotation = {
      key: 'whisk-managed',
      value: {
        file: manifestPath,
        projectDeps: [],
        projectHash,
        projectName
      }
    }
    if (trigger.trigger && trigger.trigger.annotations) {
      trigger.trigger.annotations.push(managedAnnotation)
    } else {
      trigger.trigger.annotations = [managedAnnotation]
    }
  }
}

/**
 * Compute the project hash based on the manifest content string. This is used
 * for syncing managed projects.
 *
 * @param {string} manifestContent the manifest content
 * @returns {string} the project hash
 */
function getProjectHash (manifestContent) {
  const hashString = `Runtime ${manifestContent.length}\0${manifestContent}`
  const projectHash = sha1(hashString)
  return projectHash
}

/**
 *
 * Retrieve the project hash from a deployed managed project.
 *
 * @param {object} ow the OpenWhisk client object
 * @param {string} projectName the project name
 * @returns {Promise<string>} the project hash, or '' if not found
 */
async function findProjectHashOnServer (ow, projectName) {
  let projectHash = ''
  const options = {}
  // check for package with the projectName in manifest File and if found -> return the projectHash on the server
  const resultSync = await ow.packages.list(options)
  for (const pkg of resultSync) {
    if (pkg.annotations.length > 0) {
      const whiskManaged = pkg.annotations.find(elem => elem.key === 'whisk-managed')
      if (whiskManaged !== undefined && whiskManaged.value.projectName === projectName) {
        projectHash = whiskManaged.value.projectHash
        return projectHash
      }
    }
  }
  // if no package exists with the projectName -> look in actions
  const resultActionList = await ow.actions.list()
  for (const action of resultActionList) {
    if (action.annotations.length > 0) {
      const whiskManaged = action.annotations.find(elem => elem.key === 'whisk-managed')
      if (whiskManaged !== undefined && whiskManaged.value.projectName === projectName) {
        projectHash = whiskManaged.value.projectHash
        return projectHash
      }
    }
  }

  // if no action exists with the projectName -> look in triggers
  const resultTriggerList = await ow.triggers.list()
  for (const trigger of resultTriggerList) {
    if (trigger.annotations.length > 0) {
      const whiskManaged = trigger.annotations.find(elem => elem.key === 'whisk-managed')
      if (whiskManaged !== undefined && whiskManaged.value.projectName === projectName) {
        projectHash = whiskManaged.value.projectHash
        return projectHash
      }
    }
  }

  // if no trigger exists with the projectName -> look in rules
  const resultRules = await ow.rules.list()
  for (const rule of resultRules) {
    if (rule.annotations.length > 0) {
      const whiskManaged = rule.annotations.find(elem => elem.key === 'whisk-managed')
      if (whiskManaged !== undefined &&
          whiskManaged.value.projectName === projectName) {
        projectHash = whiskManaged.value.projectHash
        return projectHash
      }
    }
  }
  return projectHash
}

/* istanbul ignore next */
/**
 * Retrieve the project hash from a deployed managed project.
 *
 * @deprecated use `findProjectHashOnServer`
 * @alias findProjectHashOnServer
 * @param {object} ow the OpenWhisk client object
 * @param {string} projectName the project name
 * @returns {Promise<string>} the project hash, or '' if not found
 */
async function findProjectHashonServer (ow, projectName) {
  return findProjectHashOnServer(ow, projectName)
}

/**
 * Path relative to the root
 *
 * @param {string} root root path
 * @param {string} p path
 * @returns {string} relative path
 */
function _relApp (root, p) {
  return path.relative(root, path.normalize(p))
}

/**
 * Absolute path
 *
 * @param {string} root root path
 * @param {string} p path
 * @returns {string} absolute path
 */
function _absApp (root, p) {
  if (path.isAbsolute(p)) return p
  return path.join(root, path.normalize(p))
}

/**
 * Checks the existence of required openwhisk credentials
 *
 * @param {object} config openwhisk config
 */
function checkOpenWhiskCredentials (config) {
  const owConfig = config.ow

  // todo errors are too specific to env context

  // this condition cannot happen because config defines it as empty object
  /* istanbul ignore next */
  if (typeof owConfig !== 'object') {
    throw new Error('missing aio runtime config, did you set AIO_RUNTIME_XXX env variables?')
  }
  // this condition cannot happen because config defines a default apihost for now
  /* istanbul ignore next */
  if (!owConfig.apihost) {
    throw new Error('missing Adobe I/O Runtime apihost, did you set the AIO_RUNTIME_APIHOST environment variable?')
  }
  if (!owConfig.namespace) {
    throw new Error('missing Adobe I/O Runtime namespace, did you set the AIO_RUNTIME_NAMESPACE environment variable?')
  }
  if (!owConfig.auth) {
    throw new Error('missing Adobe I/O Runtime auth, did you set the AIO_RUNTIME_AUTH environment variable?')
  }
}

/**
 * Returns action URLs based on the manifest config
 *
 * @param {object} appConfig app config
 * @param {boolean} isRemoteDev remote dev
 * @param {boolean} isLocalDev local dev
 * @param {boolean} legacy default false add backwards compatibility for urls keys.
 * @returns {object} urls of actions
 */
function getActionUrls (appConfig, /* istanbul ignore next */ isRemoteDev = false, /* istanbul ignore next */ isLocalDev = false, legacy = false) {
  // sets action urls [{ name: url }]
  const config = replacePackagePlaceHolder(appConfig)
  const cleanApihost = removeProtocolFromURL(config.ow.apihost)
  const cleanHostname = removeProtocolFromURL(config.app.hostname)

  const apihostIsCustom = cleanApihost !== removeProtocolFromURL(config.ow.defaultApihost)
  const hostnameIsCustom = cleanHostname !== removeProtocolFromURL(config.app.defaultHostname)

  // second condition allows users to point to its own http local ow stack
  const isHttp = isLocalDev || !!config.ow.apihost.match(/^http:\/\/localhost/)

  /** @private */
  function getActionUrl (pkgAndActionName, action) {
    const webArg = action['web-export'] || action.web
    const webUri = (webArg && webArg !== 'no' && webArg !== 'false') ? 'web' : ''

    const actionIsBehindCdn =
    // if local dev runtime actions are served locally actions can't be reached via CDN
    // if action is non web it cannot share cookies, and need to be called with auth, use ApiHost directly
    !isLocalDev && webUri && (
      // By default:
      // - if remote dev the UI runs on localhost so the actions can be served directly from the ApiHost domain
      // - if action has no UI no need to use the CDN url
      (!isRemoteDev && config.app.hasFrontend) ||
      // UNLESS: the user has specified a custom hostname, in which case we have to use it
      hostnameIsCustom
    )

    // if the apihost is custom but no custom hostname is provided then CDN should not be used
    const customApihostButNoCustomHostname = apihostIsCustom && !hostnameIsCustom

    if (actionIsBehindCdn && !customApihostButNoCustomHostname) {
      // https://<ns>.adobe-static.net/api/v1/web/<package>/<action></action>
      // or https://<ns>.custom-hostname.xyz/api/v1/web/<package>/<action></action>
      return urlJoin(
        'https://' + config.ow.namespace + '.' + cleanHostname,
        'api',
        config.ow.apiversion,
        webUri,
        pkgAndActionName
      )
    } else if (
      isLocalDev ||
      (!actionIsBehindCdn && apihostIsCustom) ||
      (actionIsBehindCdn && customApihostButNoCustomHostname)
    ) {
      // http://localhost:3233/api/v1/web/<ns>/<package>/<action>
      // or https://custom-ow-host.xyz/api/v1/web/<ns>/<package>/<action>
      return urlJoin(
        isHttp ? 'http://' : 'https://',
        cleanApihost,
        'api',
        config.ow.apiversion,
        webUri,
        config.ow.namespace,
        pkgAndActionName
      )
    } else {
      // if (!actionIsBehindCdn && !apihostIsCustom)
      // https://<ns>.adobeioruntime.net/api/v1/web/<package>/<action>
      return urlJoin(
        'https://' + config.ow.namespace + '.' + cleanApihost,
        'api',
        config.ow.apiversion,
        webUri,
        pkgAndActionName
      )
    }
  }

  // populate urls
  const actionsAndSequences = {}
  Object.entries(config.manifest.full.packages).forEach(([pkgName, pkg]) => {
    const defaultPkg = pkgName === config.ow.package
    Object.entries(pkg.actions || {}).forEach(([actionName, action]) => {
      if (defaultPkg && legacy) {
        // keep old action url key for backwards compatibility
        actionsAndSequences[getActionZipFileName(pkgName, actionName, defaultPkg)] = action
      }
      actionsAndSequences[getActionZipFileName(pkgName, actionName, false)] = action
    })
    Object.entries(pkg.sequences || {}).forEach(([actionName, action]) => {
      if (defaultPkg && legacy) {
        // keep old action url key for backwards compatibility
        actionsAndSequences[getActionZipFileName(pkgName, actionName, defaultPkg)] = action
      }
      actionsAndSequences[getActionZipFileName(pkgName, actionName, false)] = action
    })
  })
  const urls = {}
  Object.entries(actionsAndSequences).forEach(([pkgAndActionName, action]) => {
    let fullNameInURL = pkgAndActionName
    if (pkgAndActionName.indexOf('/') === -1) {
      // pkg not included in pkgAndActionName since this is from the default package
      // But the pkg name is required to construct the URL
      fullNameInURL = config.ow.package + '/' + pkgAndActionName
    }
    urls[pkgAndActionName] = getActionUrl(fullNameInURL, action)
  })
  return urls
}

/**
 * Joins url path parts
 *
 * @param {...string} args url parts
 * @returns {string} joined url
 */
function urlJoin (...args) {
  let start = ''
  if (args[0] && args[0].startsWith('/')) start = '/'
  return start + args.map(a => a && a.replace(/(^\/|\/$)/g, ''))
    .filter(a => a) // remove empty strings / nulls
    .join('/')
}

/**
 * @param {string} url url
 * @returns {string} url
 */
function removeProtocolFromURL (url) {
  return url.replace(/(^\w+:|^)\/\//, '')
}

/**
 * @param {object} config config
 * @returns {object} sanitized config
 */
function replacePackagePlaceHolder (config) {
  const modifiedConfig = cloneDeep(config)
  const packages = modifiedConfig.manifest.full.packages
  const packagePlaceholder = modifiedConfig.manifest.packagePlaceholder
  if (packages[packagePlaceholder]) {
    packages[config.ow.package] = packages[packagePlaceholder]
    delete packages[packagePlaceholder]
  } else {
    // Using custom package name.
    // Set config.ow.package so that syncProject can use it as project name for annotations.
    const packageNames = Object.keys(packages)
    modifiedConfig.ow.package = packageNames[0]
  }
  return modifiedConfig
}

/**
 * Checks the validity of nodejs version in action definition and throws an error if invalid.
 *
 * @param {object} action action object
 * @deprecated Use isSupportedActionKind instead
 */
function validateActionRuntime (action) {
  // I suspect we have an issue here with 2 kinds of kinds ...
  // sometimes this method is called with 'sequence' which is a different kind of kind than exec.kind which
  // comes from action: runtime: in manifest -jm
  // it would be nice if we didn't throw an excption when we could just return a boolean, otherwise the caller
  // has to wrap this in a try/catch block -jm
  if (action.exec && action.exec.kind && action.exec.kind.toLowerCase().startsWith('nodejs:')) {
    if (!SupportedRuntimes.includes(action.exec.kind)) {
      throw new Error(`Unsupported node version '${action.exec.kind}' in action ${action.name}. Supported versions are ${SupportedRuntimes}`)
    }
  }
}

/**
 * Checks the validity of nodejs version in action definition returns true if valid.
 *
 * @param {object} action action object
 * @returns {boolean} true if action kind is supported
 */
function isSupportedActionKind (action) {
  return SupportedRuntimes.includes(action?.exec?.kind?.toLowerCase())
}

/**
 * Returns the action's build file name without the .zip extension
 *
 * @param {string} pkgName name of the package
 * @param {string} actionName name of the action
 * @param {boolean} defaultPkg true if pkgName is the default/first package
 * @returns {string} name of zip file for the action contents
 */
function getActionZipFileName (pkgName, actionName, defaultPkg) {
  return defaultPkg ? actionName : pkgName + '/' + actionName
}

/**
 * Returns the action name based on the zipFile name.
 *
 * @param {string} zipFile name of the zip file
 * @returns {string} name of the action or empty string.
 */
function getActionNameFromZipFile (zipFile) {
  const ZIP_EXTENSION = '.zip'
  if (!zipFile || !zipFile.includes(ZIP_EXTENSION)) {
    return ''
  }
  const [action] = zipFile.split('.')
  return action
}

/**
 * Creates an info banner for an activation.
 *
 * @param {object} logFunc custom logger function
 * @param {object} activation activation metadata
 * @param {Array<string>} activationLogs the logs of the activation (may selectively suppress banner if there are no log lines)
 */
function activationLogBanner (logFunc, activation, activationLogs) {
  if (activationLogs.length > 0) {
    activation.annotations.forEach((annotation) => {
      if (annotation.key === 'path') {
        logFunc(annotation.value + ':' + activation.activationId)
      }
    })
  }
}

/**
 * Will tell if the action was built before based on it's contentHash.
 *
 * @param {string} lastBuildsData Data with the last builds
 * @param {object} buildData Object where key is the name of the action and value is its contentHash
 * @returns {boolean} true if the action was built before
 */
function actionBuiltBefore (lastBuildsData, buildData) {
  if (buildData && Object.keys(buildData).length > 0) {
    const [actionName, contentHash] = Object.entries(buildData)[0]
    const storedData = safeParse(lastBuildsData)
    if (contentHash) {
      return storedData[actionName] === contentHash
    }
  }
  aioLogger.debug('actionBuiltBefore > Invalid actionBuiltData')
  return false
}

/**
 * Will dump the previously actions built data information.
 *
 * @param {string} lastBuiltActionsPath Path to the deployments logs
 * @param {object} actionBuildData Object which contains action name and contentHash.
 * @param {object} prevBuildData Object which contains info about all the previously built actions
 * @returns {Promise<boolean>} If the contentHash already belongs to the deploymentLogs file
 */
async function dumpActionsBuiltInfo (lastBuiltActionsPath, actionBuildData, prevBuildData) {
  try {
    fs.ensureFileSync(lastBuiltActionsPath)
    await fs.writeJSON(lastBuiltActionsPath, { ...prevBuildData, ...actionBuildData })
  } catch (e) {
    aioLogger.error(`Something went wrong, ${e}`)
    throw e
  }
}

/**
 * Gets a list of the supported runtime kinds from the apihost.
 *
 * @param {string} apihost the URL of the runtime apihost
 * @returns {Array<string>} a list of runtime kinds supported by the runtime apihost
 */
async function getSupportedServerRuntimes (apihost) {
  aioLogger.debug(`Getting supported runtimes from ${apihost}`)

  const fetch = createFetch()
  const response = await fetch(apihost)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - An error occurred when retrieving supported runtimes.`)
  }

  const json = await response.json()
  aioLogger.debug(`Result from ${apihost}: ${JSON.stringify(json, null, 2)}`)
  return json.runtimes.nodejs.map(item => item.kind)
}

module.exports = {
  getSupportedServerRuntimes,
  checkOpenWhiskCredentials,
  getActionEntryFile,
  getIncludesForAction,
  createKeyValueObjectFromArray,
  createKeyValueArrayFromObject,
  createKeyValueArrayFromFile,
  createKeyValueArrayFromFlag,
  createKeyValueObjectFromFlag,
  createKeyValueObjectFromFile,
  getKeyValueArrayFromMergedParameters,
  getKeyValueObjectFromMergedParameters,
  parsePathPattern,
  parsePackageName,
  createComponentsFromSequence,
  createComponentsfromSequence,
  processInputs,
  createKeyValueInput, /* internal */
  getManifestPath, /* internal */
  returnUnion,
  returnDeploymentTriggerInputs, /* internal */
  getDeploymentPath, /* internal */
  createActionObject, /* internal */
  checkWebFlags, /* internal */
  createSequenceObject, /* internal */
  createApiRoutes, /* internal */
  returnAnnotations, /* internal */
  deployPackage,
  undeployPackage,
  processPackage,
  setPaths,
  getProjectEntities,
  syncProject,
  findProjectHashOnServer,
  findProjectHashonServer,
  getProjectHash,
  addManagedProjectAnnotations,
  printLogs,
  stripLog,
  printFilteredActionLogs,
  _relApp,
  _absApp,
  getActionUrls,
  urlJoin,
  removeProtocolFromURL,
  zip,
  replacePackagePlaceHolder,
  validateActionRuntime,
  getActionZipFileName,
  getActionNameFromZipFile,
  dumpActionsBuiltInfo,
  actionBuiltBefore,
  safeParse,
  isSupportedActionKind,
  DEFAULT_PACKAGE_RESERVED_NAME
}
