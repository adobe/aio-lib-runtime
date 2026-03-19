/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { codes } = require('./SDKErrors')
const Sandbox = require('./Sandbox')
const { createFetch } = require('@adobe/aio-lib-core-networking')
const { buildAuthorizationHeader } = require('./utils')
require('./types.jsdoc') // for VS Code autocomplete
/* global SandboxCreateOptions, SandboxSizes */

const SANDBOX_SIZES = Object.freeze({
  SMALL: { cpu: '500m', memory: '512Mi', gpu: 0 },
  MEDIUM: { cpu: '2000m', memory: '4Gi', gpu: 0 },
  LARGE: { cpu: '4000m', memory: '16Gi', gpu: 0 },
  XLARGE: { cpu: '8000m', memory: '32Gi', gpu: 1 }
})

/**
 * Compute Sandbox management API.
 */
class SandboxAPI {
  /**
   * @param {string} apiHost Runtime API host
   * @param {string} namespace Runtime namespace
   * @param {string} apiKey Runtime auth key
   * @param {object} [options] SDK transport options
   */
  constructor (apiHost, namespace, apiKey, options = {}) {
    this.apiHost = apiHost.match(/^http(s)?:\/\//) ? apiHost : `https://${apiHost}`
    this.namespace = namespace
    this.apiKey = apiKey
    this.agent = options.agent
    this.ignoreCerts = options.ignore_certs
    this.sizes = SANDBOX_SIZES
  }

  /**
   * Creates a new compute sandbox and connects its WebSocket session.
   *
   * @param {SandboxCreateOptions} [options] sandbox create options
   * @returns {Promise<Sandbox>} connected sandbox instance
   */
  async create (options = {}) {
    const payload = await this._request(
      'create sandbox',
      'POST',
      this._getSandboxPath(),
      this._buildCreateRequestBody(options)
    )

    return await this._buildSandbox(payload)
  }

  /**
   * Gets the status of an existing sandbox.
   *
   * @param {string} sandboxId sandbox ID
   * @returns {Promise<object>} sandbox status response
   */
  async getStatus (sandboxId) {
    return this._request(
      'get sandbox status',
      'GET',
      `${this._getSandboxPath()}/${sandboxId}`
    )
  }

  async _buildSandbox (payload) {
    const sandbox = new Sandbox({
      id: payload.sandboxId,
      endpoint: payload.wsEndpoint || this._buildWebSocketEndpoint(payload.sandboxId),
      status: payload.status,
      cluster: payload.cluster,
      region: payload.region,
      maxLifetime: payload.maxLifetime,
      namespace: this.namespace,
      apiHost: this.apiHost,
      apiKey: this.apiKey,
      token: payload.token,
      agent: this.agent,
      ignore_certs: this.ignoreCerts
    })

    await sandbox.connect()
    return sandbox
  }

  _buildCreateRequestBody (options) {
    const body = {
      name: options.name,
      size: this._normalizeSize(options.size),
      type: options.type || 'cpu:default',
      maxLifetime: options.maxLifetime || 3600
    }

    if (options.cluster) {
      body.cluster = options.cluster
    }

    if (options.workspace) {
      body.workspace = options.workspace
    }

    if (options.envs) {
      body.envs = options.envs
    }

    return body
  }

  _normalizeSize (size) {
    if (!size) {
      return 'MEDIUM'
    }

    if (typeof size === 'string' && SANDBOX_SIZES[size]) {
      return size
    }

    const entry = Object.entries(SANDBOX_SIZES)
      .find(([, value]) => value.cpu === size.cpu && value.memory === size.memory && value.gpu === size.gpu)

    if (entry) {
      return entry[0]
    }

    throw new codes.ERROR_SANDBOX_CLIENT({
      messageValues: 'Invalid sandbox size provided'
    })
  }

  async _request (operation, method, path, body) {
    const requestOptions = {
      method,
      headers: {
        Authorization: this._buildAuthorizationHeader()
      }
    }

    if (this.agent) {
      requestOptions.agent = this.agent
    } else if (this.ignoreCerts) {
      const https = require('https')
      requestOptions.agent = new https.Agent({ rejectUnauthorized: false })
    }

    if (body !== undefined) {
      requestOptions.body = JSON.stringify(body)
      requestOptions.headers['Content-Type'] = 'application/json'
    }

    const fetch = createFetch()

    let response
    try {
      response = await fetch(this.apiHost + path, requestOptions)
    } catch (error) {
      throw new codes.ERROR_SANDBOX_CLIENT({
        messageValues: `Could not ${operation}: ${error.message}`
      })
    }

    if (!response.ok) {
      const message = await response.text()
      throw this._createHttpError(operation, response.status, message)
    }

    return response.json()
  }

  _createHttpError (operation, status, message) {
    const messageValues = `Could not ${operation}: ${status}${message ? ` ${message}` : ''}`
    if (status === 401 || status === 403) {
      return new codes.ERROR_SANDBOX_UNAUTHORIZED({ messageValues })
    }

    if (status === 404) {
      return new codes.ERROR_SANDBOX_NOT_FOUND({ messageValues })
    }

    if (status === 504) {
      return new codes.ERROR_SANDBOX_TIMEOUT({ messageValues })
    }

    return new codes.ERROR_SANDBOX_CLIENT({ messageValues })
  }

  _buildAuthorizationHeader () {
    return buildAuthorizationHeader(this.apiKey)
  }

  _getSandboxPath () {
    if (!this.namespace) {
      throw new codes.ERROR_SANDBOX_CLIENT({
        messageValues: 'Sandbox operations require a namespace'
      })
    }

    return `/api/v1/namespaces/${this.namespace}/sandbox`
  }

  _buildWebSocketEndpoint (sandboxId) {
    const url = new URL(this.apiHost)
    url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
    url.pathname = `/ws/v1/namespaces/${this.namespace}/sandbox/${sandboxId}/exec`
    url.search = ''
    return url.toString()
  }
}

/**
 * Named sandbox sizes.
 *
 * @type {SandboxSizes}
 */
SandboxAPI.sizes = SANDBOX_SIZES

module.exports = SandboxAPI
