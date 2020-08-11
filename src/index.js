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

const logger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:index', { level: process.env.LOG_LEVEL })
const utils = require('./utils')
const buildActions = require('./build-actions')
const deployActions = require('./deploy-actions')
const RuntimeAPI = require('./RuntimeAPI')

/**
 * Returns a Promise that resolves with a new RuntimeAPI object.
 *
 * @param {OpenwhiskOptions} options options for initialization
 * @returns {Promise<OpenwhiskClient>} a Promise with a RuntimeAPI object
 */
function init (options) {
  return new Promise((resolve, reject) => {
    const clientWrapper = new RuntimeAPI()

    clientWrapper.init(options)
      .then(initializedSDK => {
        logger.debug('sdk initialized successfully')
        resolve(initializedSDK)
      })
      .catch(err => {
        logger.debug(`sdk init error: ${err}`)
        reject(err)
      })
  })
}

module.exports = {
  init,
  buildActions,
  deployActions,
  utils
}
