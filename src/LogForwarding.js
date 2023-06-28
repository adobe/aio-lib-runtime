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

const { createFetch } = require('@adobe/aio-lib-core-networking')

/**
 * Log Forwarding management API
 */
class LogForwarding {
  constructor (namespace, apiHost, apiKey, destinationsProvider) {
    this.apiHost = apiHost
    // if apihost does not have the protocol, assume HTTPS
    if (!apiHost.match(/^http(s)?:\/\//)) {
      this.apiHost = `https://${this.apiHost}`
    }

    this.auth = apiKey
    this.namespace = namespace
    this.destinationsProvider = destinationsProvider
  }

  /**
   * Get current Log Forwarding settings
   *
   * @returns {Promise<*>} response from get API
   */
  async get () {
    try {
      const res = await this.request('get')
      return await res.json()
    } catch (e) {
      throw new Error(`Could not get log forwarding settings for namespace '${this.namespace}': ${e.message}`)
    }
  }

  /**
   * Set Log Forwarding to Adobe I/O Runtime (default behavior)
   *
   * @deprecated use `setDestination('adobe_io_runtime', {})`
   * @returns {Promise<*|undefined>} response from set API
   */
  async setAdobeIoRuntime () {
    return await this.set({
      adobe_io_runtime: {}
    })
  }

  /**
   * Set Log Forwarding to Azure Log Analytics
   *
   * @deprecated use `setDestination('azure_log_analytics', {...})`
   * @param {string} customerId customer ID
   * @param {string} sharedKey shared key
   * @param {string} logType log type
   * @returns {Promise<*|undefined>}  response from set API
   */
  async setAzureLogAnalytics (customerId, sharedKey, logType) {
    return await this.set({
      azure_log_analytics: {
        customer_id: customerId,
        shared_key: sharedKey,
        log_type: logType
      }
    })
  }

  /**
   * Set Log Forwarding to Splunk HEC
   *
   * @deprecated use `setDestination('splunk_hec', {...})`
   * @param {string} host host
   * @param {string} port port
   * @param {string} index index
   * @param {string} hecToken hec token
   * @returns {Promise<*|undefined>} response from set API
   */
  async setSplunkHec (host, port, index, hecToken) {
    return await this.set({
      splunk_hec: {
        host,
        port,
        index,
        hec_token: hecToken
      }
    })
  }

  /**
   * Set Log Forwarding to New Relic
   *
   * @deprecated use `setDestination('new_relic', {...})`
   * @param {string} baseURI base URI
   * @param {string} licenseKey license key
   * @returns {Promise<*|undefined>} response from set API
   */
  async setNewRelic (baseURI, licenseKey) {
    return await this.set({
      new_relic: {
        baseURI,
        licenseKey
      }
    })
  }

  /**
   * Get supported destinations
   *
   * @returns {object[]} in format: { value: <value>, name: <name> }
   */
  getSupportedDestinations () {
    return this.destinationsProvider.getSupportedDestinations()
  }

  /**
   * Get destination settings
   *
   * @param {string} destination Destination name
   * @returns {object[]} in format: { name: <name>, message: <message>[, type: <type>] }
   */
  getDestinationSettings (destination) {
    return this.destinationsProvider.getDestinationSettings(destination)
  }

  /**
   * Configure destination
   *
   * @param {string} destination Destination name
   * @param {object} config value-pairs of settings, specific to the destination
   * @returns {Promise<*>} response from set API
   */
  async setDestination (destination, config) {
    const data = {
      [destination]: config
    }
    try {
      const res = await this.request('put', data)
      return await res.json()
    } catch (e) {
      throw new Error(`Could not update log forwarding settings for namespace '${this.namespace}': ${e.message}`)
    }
  }

  /**
   * Get log forwarding errors
   *
   * @returns {object} Errors in format { destination: '<destination>', errors: [] }
   */
  async getErrors () {
    try {
      const requestResult = await this.request('get', undefined, '/errors')
      return await requestResult.json()
    } catch (e) {
      throw new Error(`Could not get log forwarding errors for namespace '${this.namespace}': ${e.message}`)
    }
  }

  async set (data) {
    try {
      const res = await this.request('put', data)
      return await res.json()
    } catch (e) {
      throw new Error(`Could not update log forwarding settings for namespace '${this.namespace}': ${e.message}`)
    }
  }

  async request (method, data, subPath = '') {
    if (this.namespace === '_') {
      throw new Error("Namespace '_' is not supported by log forwarding management API")
    }

    const fetch = createFetch()
    const res = await fetch(
      this.apiHost + '/runtime/namespaces/' + this.namespace + '/logForwarding' + subPath,
      {
        method,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(this.auth).toString('base64')
        }
      }
    )
    if (!res.ok) {
      throw new Error(`${res.status} (${res.statusText}). Error: ${await res.text()}`)
    }
    return res
  }
}

module.exports = LogForwarding
