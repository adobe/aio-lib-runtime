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

const crypto = require('node:crypto')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:Sandbox', { provider: 'debug', level: process.env.LOG_LEVEL })
const { codes } = require('./SDKErrors')
const { createFetch } = require('@adobe/aio-lib-core-networking')
const { buildAuthorizationHeader, createSandboxHttpError } = require('./utils')
const { SandboxSocket } = require('./ws')
require('./types.jsdoc') // for VS Code autocomplete
/* global SandboxExecOptions, SandboxExecResult, SandboxFileEntry, SandboxGetUrlOptions */

/**
 * Connected compute sandbox session.
 */
class Sandbox {
  /**
   * @param {object} options sandbox options
   */
  constructor (options) {
    this.id = options.id
    this.endpoint = options.endpoint
    this.status = options.status
    this.cluster = options.cluster
    this.region = options.region
    this.maxLifetime = options.maxLifetime

    this.namespace = options.namespace
    this.apiHost = options.apiHost
    this.apiKey = options.apiKey
    this.agent = options.agent
    this.ignoreCerts = options.ignore_certs

    this._token = options.token
    this._publicUrlTemplate = options.publicUrlTemplate || null
    this._managementEndpoint = options.managementEndpoint || null
    this.ws = null
  }

  /**
   * Opens the sandbox WebSocket connection.
   *
   * @returns {Promise<void>}
   */
  connect () {
    if (!this.ws) {
      this.ws = new SandboxSocket({
        id: this.id,
        endpoint: this.endpoint,
        token: this._token,
        agent: this.agent,
        ignoreCerts: this.ignoreCerts
      })
    }
    return this.ws.connect()
  }

  /**
   * Executes a command inside the sandbox.
   *
   * @param {string} command command to execute
   * @param {SandboxExecOptions} [options] execution options
   * @returns {Promise<SandboxExecResult>} execution result promise
   */
  exec (command, options = {}) {
    try {
      this.ensureOpen()
    } catch (error) {
      return Promise.reject(error)
    }

    const execId = `exec-${crypto.randomBytes(12).toString('hex')}`
    let timeout

    const execPromise = new Promise((resolve, reject) => {
      this.ws.pendingExecs.set(execId, {
        resolve,
        reject,
        stdout: '',
        stderr: '',
        onOutput: options.onOutput,
        timeout: undefined
      })

      if (options.timeout) {
        timeout = setTimeout(() => {
          try { this.kill(execId) } catch (_) {}
          this.ws.rejectExec(execId, new codes.ERROR_SANDBOX_TIMEOUT({
            messageValues: `Command '${command}' exceeded timeout of ${options.timeout}ms`
          }))
        }, options.timeout)

        this.ws.pendingExecs.get(execId).timeout = timeout
      }
    })

    execPromise.execId = execId
    try {
      this.sendFrame({ type: 'exec.run', execId, command })
      if (options.stdin !== undefined) {
        this.writeStdin(execId, options.stdin)
        this.closeStdin(execId)
      }
    } catch (error) {
      this.ws.rejectExec(execId, new codes.ERROR_SANDBOX_WEBSOCKET({
        messageValues: `Could not send exec frame: ${error.message}`
      }))
    }
    return execPromise
  }

  /**
   * Sends a kill signal to a running command.
   *
   * @param {string} execId execution id
   * @param {string} [signal] signal to deliver
   */
  kill (execId, signal = 'SIGTERM') {
    this.ensureOpen()
    this.sendFrame({ type: 'exec.kill', execId, signal })
  }

  /**
   * Writes data to the stdin of a running command.
   * Fire-and-forget — there is no response on success.
   *
   * @param {string} execId execution id from exec()
   * @param {string|Buffer} data data to write (Buffer is base64-encoded on the wire)
   */
  writeStdin (execId, data) {
    this.ensureOpen()
    const frame = { type: 'exec.input', execId }
    if (Buffer.isBuffer(data)) {
      frame.data = data.toString('base64')
      frame.encoding = 'base64'
    } else {
      frame.data = data
    }
    this.sendFrame(frame)
  }

  /**
   * Closes stdin for a running command, delivering EOF.
   * Fire-and-forget — there is no response on success.
   *
   * @param {string} execId execution id from exec()
   */
  closeStdin (execId) {
    this.ensureOpen()
    this.sendFrame({ type: 'exec.endInput', execId })
  }

  /**
   * Reads a file from the sandbox filesystem.
   *
   * @param {string} path absolute path inside the sandbox
   * @returns {Promise<string>} file contents as a UTF-8 string
   */
  readFile (path) {
    try {
      this.ensureOpen()
    } catch (error) {
      return Promise.reject(error)
    }

    const execId = `file-${crypto.randomBytes(12).toString('hex')}`

    const opPromise = new Promise((resolve, reject) => {
      this.ws.pendingFileOps.set(execId, { resolve, reject })
    })

    try {
      this.sendFrame({ type: 'file.read', execId, path })
    } catch (error) {
      this.ws.rejectFileOp(execId, new codes.ERROR_SANDBOX_WEBSOCKET({
        messageValues: `Could not send file.read frame: ${error.message}`
      }))
    }

    return opPromise
  }

  /**
   * Writes a file to the sandbox filesystem. Parent directories are created automatically.
   *
   * @param {string} path absolute path inside the sandbox
   * @param {string|Buffer} content file contents
   * @returns {Promise<{path: string, size: number, ok: boolean}>} write confirmation
   */
  writeFile (path, content) {
    try {
      this.ensureOpen()
    } catch (error) {
      return Promise.reject(error)
    }

    const execId = `file-${crypto.randomBytes(12).toString('hex')}`
    const encoded = Buffer.isBuffer(content)
      ? content.toString('base64')
      : Buffer.from(content).toString('base64')

    const opPromise = new Promise((resolve, reject) => {
      this.ws.pendingFileOps.set(execId, { resolve, reject })
    })

    try {
      this.sendFrame({ type: 'file.write', execId, path, content: encoded, encoding: 'base64' })
    } catch (error) {
      this.ws.rejectFileOp(execId, new codes.ERROR_SANDBOX_WEBSOCKET({
        messageValues: `Could not send file.write frame: ${error.message}`
      }))
    }

    return opPromise
  }

  /**
   * Lists the contents of a directory inside the sandbox.
   *
   * @param {string} path absolute directory path inside the sandbox
   * @returns {Promise<SandboxFileEntry[]>} directory entries
   */
  listFiles (path) {
    try {
      this.ensureOpen()
    } catch (error) {
      return Promise.reject(error)
    }

    const execId = `file-${crypto.randomBytes(12).toString('hex')}`

    const opPromise = new Promise((resolve, reject) => {
      this.ws.pendingFileOps.set(execId, { resolve, reject })
    })

    try {
      this.sendFrame({ type: 'file.list', execId, path })
    } catch (error) {
      this.ws.rejectFileOp(execId, new codes.ERROR_SANDBOX_WEBSOCKET({
        messageValues: `Could not send file.list frame: ${error.message}`
      }))
    }

    return opPromise
  }

  /**
   * Gets the current status of this sandbox using the cluster-pinned management endpoint.
   *
   * @returns {Promise<object>} sandbox status response
   */
  async getStatus () {
    const base = this._managementEndpoint || this.apiHost
    const fetch = createFetch()
    const requestOptions = {
      method: 'GET',
      headers: { Authorization: this._buildAuthorizationHeader() }
    }

    if (this.agent) {
      requestOptions.agent = this.agent
    } else if (this.ignoreCerts) {
      const https = require('node:https')
      requestOptions.agent = new https.Agent({ rejectUnauthorized: false })
    }

    let response
    try {
      response = await fetch(`${base}/api/v1/namespaces/${this.namespace}/sandbox/${this.id}`, requestOptions)
    } catch (error) {
      throw new codes.ERROR_SANDBOX_CLIENT({
        messageValues: `Could not get status for sandbox '${this.id}': ${error.message}`
      })
    }

    if (!response.ok) {
      const message = await response.text()
      const status = response.status
      const detail = `Could not get status for sandbox '${this.id}': ${status}${message ? ` ${message}` : ''}`
      throw createSandboxHttpError(codes, status, detail)
    }

    return response.json()
  }

  /**
   * Returns the public preview URL for a given port on this sandbox.
   *
   * The URL is derived from the `publicUrlTemplate` returned by the server at
   * create or connect time. The SDK substitutes the `{sandboxId}` and `{port}`
   * placeholders and otherwise treats the template as opaque. Always call
   * `getUrl()` on the live `Sandbox` instance; never cache the resolved URL
   * across sessions.
   *
   * @param {SandboxGetUrlOptions} options URL options
   * @returns {Promise<string>} public preview URL for the given port
   */
  async getUrl ({ port, protocol } = {}) {
    if (!this._publicUrlTemplate) {
      throw new codes.ERROR_SANDBOX_CLIENT({
        messageValues: `Cannot get URL for sandbox '${this.id}': publicUrlTemplate is not available`
      })
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new codes.ERROR_SANDBOX_CLIENT({
        messageValues: `Invalid port '${port}': must be an integer between 1 and 65535`
      })
    }

    let url = this._publicUrlTemplate
      .replace('{sandboxId}', this.id)
      .replace('{port}', String(port))

    if (protocol) {
      url = url.replace(/^https?:\/\//, `${protocol}://`)
    }

    return url
  }

  /**
   * Destroys the sandbox and closes its WebSocket connection.
   *
   * @returns {Promise<object>} destroy response payload
   */
  async destroy () {
    const base = this._managementEndpoint || this.apiHost
    const fetch = createFetch()
    const requestOptions = {
      method: 'DELETE',
      headers: {
        Authorization: this._buildAuthorizationHeader()
      }
    }

    if (this.agent) {
      requestOptions.agent = this.agent
    } else if (this.ignoreCerts) {
      const https = require('node:https')
      requestOptions.agent = new https.Agent({ rejectUnauthorized: false })
    }

    let response
    try {
      response = await fetch(`${base}/api/v1/namespaces/${this.namespace}/sandbox/${this.id}`, requestOptions)
    } catch (error) {
      throw new codes.ERROR_SANDBOX_CLIENT({
        messageValues: `Could not destroy sandbox '${this.id}': ${error.message}`
      })
    }

    if (!response.ok) {
      const message = await response.text()
      const status = response.status
      const detail = `Could not destroy sandbox '${this.id}': ${status}${message ? ` ${message}` : ''}`
      throw createSandboxHttpError(codes, status, detail)
    }

    const payload = await response.json()
    this.status = payload.status || this.status
    this.ws?.close()
    return payload
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  ensureOpen () {
    if (!this.ws) {
      throw new codes.ERROR_SANDBOX_WEBSOCKET({
        messageValues: `Sandbox '${this.id}' is not connected`
      })
    }
    this.ws.ensureOpen()
  }

  sendFrame (frame) {
    this.ws.send(frame)
  }

  _buildAuthorizationHeader () {
    return buildAuthorizationHeader(this.apiKey)
  }
}

module.exports = Sandbox
