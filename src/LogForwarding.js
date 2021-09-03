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

const fetch = require('cross-fetch')

class LogForwarding {
  constructor (namespace, apiHost, apiKey) {
    this.apiHost = apiHost
    this.auth = apiKey
    this.namespace = namespace
  }

  async get () {
    try {
      const res = await this.request('get')
      return await res.json()
    } catch (e) {
      throw new Error(`Could not get log forwarding settings for namespace '${this.namespace}': ${e.message}`)
    }
  }

  async setAdobeIoRuntime () {
    return await this.set({
      adobe_io_runtime: {}
    })
  }

  async setAzureLogAnalytics (customerId, sharedKey, logType) {
    return await this.set({
      azure_log_analytics: {
        customer_id: customerId,
        shared_key: sharedKey,
        log_type: logType
      }
    })
  }

  async setSplunkHec (host, port, index, hecToken) {
    return await this.set({
      splunk_hec: {
        host: host,
        port: port,
        index: index,
        hec_token: hecToken
      }
    })
  }

  async set (data) {
    try {
      const res = await this.request('put', data)
      return await res.text()
    } catch (e) {
      throw new Error(`Could not update log forwarding settings for namespace '${this.namespace}': ${e.message}`)
    }
  }

  async request (method, data) {
    return fetch(
      this.apiHost + '/runtime/namespaces/' + this.namespace + '/logForwarding',
      {
        method: method,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(this.auth).toString('base64')
        }
      }
    )
  }
}

module.exports = LogForwarding
