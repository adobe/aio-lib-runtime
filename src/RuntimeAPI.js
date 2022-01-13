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

const ow = require('openwhisk')
const { codes } = require('./SDKErrors')
const Triggers = require('./triggers')
const { getProxyForUrl } = require('proxy-from-env')
const deepCopy = require('lodash.clonedeep')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:RuntimeAPI', { provider: 'debug', level: process.env.LOG_LEVEL })
const LogForwarding = require('./LogForwarding')
const LogForwardingLocalDestinationsProvider = require('./LogForwardingLocalDestinationsProvider')

require('./types.jsdoc') // for VS Code autocomplete
/* global OpenwhiskOptions, OpenwhiskClient */ // for linter

/**
 * This class provides methods to call your RuntimeAPI APIs.
 * Before calling any method initialize the instance by calling the `init` method on it
 * with valid options argument
 */
class RuntimeAPI {
  /**
   * Initializes a RuntimeAPI object and returns it.
   *
   * @param {OpenwhiskOptions} options options for initialization
   * @returns {Promise<OpenwhiskClient>} a RuntimeAPI object
   */
  async init (options) {
    aioLogger.debug(`init options: ${JSON.stringify(options, null, 2)}`)
    const clonedOptions = deepCopy(options)

    const initErrors = []
    if (!clonedOptions || !clonedOptions.api_key) {
      initErrors.push('api_key')
    }
    if (!clonedOptions || !clonedOptions.apihost) {
      initErrors.push('apihost')
    }

    if (initErrors.length) {
      const sdkDetails = { clonedOptions }
      throw new codes.ERROR_SDK_INITIALIZATION({ sdkDetails, messageValues: `${initErrors.join(', ')}` })
    }

    const proxyUrl = getProxyForUrl(clonedOptions.apihost)
    if (proxyUrl) {
      aioLogger.debug(`using proxy url: ${proxyUrl}`)
      clonedOptions.proxy = proxyUrl
    } else {
      aioLogger.debug('proxy settings not found')
    }

    // set retry by default, 2 retres with a first timeout of 200ms (will be ~400ms on the second one)
    if (clonedOptions.retry === undefined) {
      clonedOptions.retry = { retries: 2, minTimeout: 200 }
    }

    this.ow = ow(clonedOptions)
    const self = this

    return {
      actions: this.ow.actions,
      activations: this.ow.activations,
      namespaces: this.ow.namespaces,
      packages: this.ow.packages,
      rules: this.ow.rules,
      triggers: new Proxy(this.ow.triggers, {
        get (target, property) {
          const proxyTrigger = new Triggers(self.ow)
          return property in proxyTrigger
            ? proxyTrigger[property]
            : target[property]
        }
      }),
      routes: this.ow.routes,
      logForwarding: new LogForwarding(
        clonedOptions.namespace,
        clonedOptions.apihost,
        clonedOptions.api_key,
        new LogForwardingLocalDestinationsProvider()
      ),
      initOptions: clonedOptions
    }
  }
}

module.exports = RuntimeAPI
