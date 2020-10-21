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

const { checkOpenWhiskCredentials, printFilteredActionLogs } = require('./utils')
const IOruntime = require('./RuntimeAPI')
const util = require('util')
const sleep = util.promisify(setTimeout)

/**
 * Prints action logs.
 *
 * @param {object} config openwhisk config
 * @param {object} logger an instance of a logger to emit messages to
 * @param {number} limit maximum number of activations to fetch logs from
 * @param {Array} filterActions array of actions to fetch logs from
 *    examples:-
 *    ['pkg1/'] = logs of all deployed actions under package pkg1
 *    ['pkg1/action'] = logs of action 'action' under package 'pkg1'
 *    [] = logs of all actions in the namespace
 * @param {boolean} strip if true, strips the timestamp which prefixes every log line
 * @param {boolean} tail if true, logs are fetched continuously
 * @param {number} fetchLogsInterval number of seconds to wait before fetching logs again when tail is set to true
 * @param {number} startTime time in milliseconds. Only logs after this time will be fetched
 */
async function printActionLogs (config, logger, limit, filterActions, strip, tail = false, fetchLogsInterval = 10000, startTime) {
  // check for runtime credentials
  checkOpenWhiskCredentials(config)
  const runtime = await new IOruntime().init({
    apihost: config.ow.apihost,
    apiversion: config.ow.apiversion,
    api_key: config.ow.auth,
    namespace: config.ow.namespace
  })

  let lastActivationTime = startTime
  while (true) {
    const ret = await printFilteredActionLogs(runtime, logger, limit, filterActions, strip, lastActivationTime)
    lastActivationTime = ret.lastActivationTime
    if (tail) {
      await sleep(fetchLogsInterval)
    } else {
      break
    }
  }
  return { lastActivationTime }
}

module.exports = printActionLogs
