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

const util = require('util')
const { checkOpenWhiskCredentials, stripLog} = require('./utils')
const sleep = util.promisify(setTimeout)
const IOruntime = require('./RuntimeAPI')

/**
 * Prints action logs.
 *
 * @param {object} config openwhisk config
 * @param {object} logger an instance of a logger to emit messages to
 * @param {number} limit maximum number of activations to fetch logs from
 * @param {Array} filterActions array of actions to fetch logs from
 * @param {boolean} strip if true, strips the timestamp which prefixes every log line
 * @param {boolean} tail if true, logs are fetched continuously
 * @param {number} fetchLogsInterval number of seconds to wait before fetching logs again when tail is set to true
 * @param {number} startTime time in milliseconds. Only logs after this time will be fetched
 */
async function printActionLogs (config, logger, limit, filterActions, strip = false, tail = false, fetchLogsInterval = 10000, startTime = 0) {
    // console.log(arguments)
    // check for runtime credentials
    checkOpenWhiskCredentials(config)
    const runtime = await new IOruntime().init({
      // todo make this.config.ow compatible with Openwhisk config
      apihost: config.ow.apihost,
      apiversion: config.ow.apiversion,
      api_key: config.ow.auth,
      namespace: config.ow.namespace
    })
  
    // get activations
    const listOptions = { limit: limit, skip: 0 }
    const logFunc = logger || console.log
    if (filterActions.length === 1 && !filterActions[0].endsWith('/')) {
      listOptions.name = filterActions[0]
    }
    // console.log(listOptions)
    let activations = await runtime.activations.list(listOptions)
    let lastActivationTime = 0
    // console.log('activations = ', activations.length)
    const actionFilterFunc = (actionPath, annotationValue) => {
      if (actionPath.endsWith('/')) {
        actionPath = actionPath.startsWith('/') ? actionPath : '/' + actionPath
        return annotationValue.includes(actionPath)
      }
      return annotationValue.endsWith(actionPath)
    }
    if (typeof filterActions === 'string') {
      // let setPaths()
    } else if (filterActions.length > 0) {
      activations = activations.filter((activation) => {
        let includeActivation = false
        activation.annotations.forEach((annotation) => {
          //if(annotation.key === 'path' && filterActions.includes(annotation.value)) {
          /* if(annotation.key === 'path') {
          console.log(annotation.value)
          console.log(filterActions.some(actionPath => annotation.value.endsWith(actionPath)))
          } */
          if(annotation.key === 'path' && filterActions.some(actionPath => actionFilterFunc(actionPath, annotation.value))) {
            includeActivation = true
          }
        })
        return includeActivation
      })
    }
    // console.log('activations = ', activations.length)

    for (let i = (activations.length - 1); i >= 0; i--) {
      const activation = activations[i]
      lastActivationTime = activation.start
      // console.log('before activation time check')
      if (lastActivationTime > startTime) {
        // console.log('before getting logs for activationId: ' + activation.activationId)
        let allResults = []
        const results = await runtime.activations.logs({ activationId: activation.activationId })
        //console.log(results)
        if (results.logs.length > 0) {
          logFunc(activation.name + ':' + activation.activationId)
          results.logs.forEach(function (logMsg) {
            //console.log(logMsg)
            if (strip) {
              allResults.push(stripLog(logMsg))
            } else {
              allResults.push(logMsg)
            }
          })
        }
        //console.log(allResults)
        allResults.sort()
        allResults.forEach((logMsg) => {
            logFunc(logMsg)
        })
    }
    }
    if (tail) {
      await sleep(fetchLogsInterval)
      return printActionLogs(config, logger, limit, filterActions, strip, tail, fetchLogsInterval, lastActivationTime)
    }
    return { lastActivationTime }
  }

  module.exports = printActionLogs