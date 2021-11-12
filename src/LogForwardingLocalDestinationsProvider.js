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

/**
 * Log Forwarding destination provider
 */
class LogForwardingLocalDestinationsProvider {
  constructor () {
    this.destinations = {
      adobe_io_runtime: {
        name: 'Adobe I/O Runtime',
        settings: []
      },
      azure_log_analytics: {
        name: 'Azure Log Analytics',
        settings: [
          {
            name: 'customer_id',
            message: 'customer ID'
          },
          {
            name: 'shared_key',
            message: 'shared key',
            type: 'password'
          },
          {
            name: 'log_type',
            message: 'log type'
          }
        ]
      },
      splunk_hec: {
        name: 'Splunk HEC',
        settings: [
          {
            name: 'host',
            message: 'host'
          },
          {
            name: 'port',
            message: 'port'
          },
          {
            name: 'index',
            message: 'index'
          },
          {
            name: 'hec_token',
            message: 'hec_token',
            type: 'password'
          }
        ]
      }
    }
  }

  /**
   * Get supported destinations
   *
   * @returns {object[]} in format: { value: <value>, name: <name> }
   */
  getSupportedDestinations () {
    return Object.keys(this.destinations).map(k => {
      return { value: k, name: this.destinations[k].name }
    })
  }

  /**
   * Get destination settings
   *
   * @param {string} destination Destination name
   * @returns {object[]} in format: { name: <name>, message: <message>[, type: <type>] }
   */
  getDestinationSettings (destination) {
    if (this.destinations[destination] === undefined) {
      throw new Error(`Destination '${destination}' is not supported`)
    }
    return this.destinations[destination].settings
  }
}

module.exports = LogForwardingLocalDestinationsProvider
