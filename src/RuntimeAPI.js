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

/**
 * @typedef {object} OpenwhiskOptions
 * @property {string} apihost Hostname and optional port for openwhisk platform
 * @property {string} api_key Authorisation key
 * @property {string} [api] Full API URL
 * @property {string} [apiversion] Api version
 * @property {string} [namespace] Namespace for resource requests
 * @property {boolean} [ignore_certs] Turns off server SSL/TLS certificate verification
 * @property {string} [key] Client key to use when connecting to the apihost
 */

/**
 * @typedef {object} OpenwhiskClient
 * @property {ow.Actions} actions actions
 * @property {ow.Activations} activations activations
 * @property {ow.Namespaces} namespaces namespaces
 * @property {ow.Packages} packages packages
 * @property {ow.Rules} rules rules
 * @property {ow.Triggers} triggers triggers
 * @property {ow.Routes} routes routes
 */

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
    const initErrors = []
    if (!options || !options.api_key) {
      initErrors.push('api_key')
    }
    if (!options || !options.apihost) {
      initErrors.push('apihost')
    }

    if (initErrors.length) {
      const sdkDetails = { options }
      throw new codes.ERROR_SDK_INITIALIZATION({ sdkDetails, messageValues: `${initErrors.join(', ')}` })
    }

    this.ow = ow(options)
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
      routes: this.ow.routes
    }
  }
}

module.exports = RuntimeAPI
