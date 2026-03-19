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

const crypto = require('crypto')
const WebSocket = require('ws')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:Sandbox', { provider: 'debug', level: process.env.LOG_LEVEL })
const { codes } = require('./SDKErrors')
const { createFetch } = require('@adobe/aio-lib-core-networking')
const { buildAuthorizationHeader } = require('./utils')
require('./types.jsdoc') // for VS Code autocomplete
/* global SandboxExecOptions, SandboxExecResult */

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
    this._socket = null
    this._connectPromise = null
    this._pendingExecs = new Map()
  }

  /**
   * Opens the sandbox WebSocket connection.
   *
   * @returns {Promise<void>}
   */
  connect () {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    if (this._connectPromise) {
      return this._connectPromise
    }

    const wsOptions = {}
    if (this.agent) {
      wsOptions.agent = this.agent
    }

    if (this.ignoreCerts) {
      wsOptions.rejectUnauthorized = false
    }

    this._socket = new WebSocket(this.endpoint, wsOptions)
    const socket = this._socket

    socket.on('message', message => this._handleMessage(message))
    socket.on('close', (code, reason) => this._handleClose(code, reason))
    socket.on('error', (err) => aioLogger.warn(`[${this.id}] WebSocket error: ${err.message}`))

    this._connectPromise = new Promise((resolve, reject) => {
      const onOpen = () => {
        try {
          this._sendFrame({ type: 'auth', token: this._token })
        } catch (error) {
          onError(error)
        }
      }

      const onMessage = (message) => {
        const frame = this._parseFrame(message)
        if (!frame || !this._isAuthAckFrame(frame)) {
          return
        }

        cleanup()
        this._connectPromise = null
        resolve()
      }

      const onClose = (code) => {
        cleanup()
        this._connectPromise = null
        reject(this._createCloseError(code))
      }

      const onError = (error) => {
        cleanup()
        this._connectPromise = null
        reject(new codes.ERROR_SANDBOX_WEBSOCKET({
          messageValues: `Could not connect sandbox '${this.id}': ${error.message}`
        }))
      }

      const cleanup = () => {
        socket.off('open', onOpen)
        socket.off('message', onMessage)
        socket.off('close', onClose)
        socket.off('error', onError)
      }

      socket.once('open', onOpen)
      socket.on('message', onMessage)
      socket.once('close', onClose)
      socket.once('error', onError)
    })

    return this._connectPromise
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
      this._ensureOpen()
    } catch (error) {
      return Promise.reject(error)
    }

    const execId = `exec-${crypto.randomBytes(12).toString('hex')}`
    let timeout

    const execPromise = new Promise((resolve, reject) => {
      this._pendingExecs.set(execId, {
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
          this._rejectPendingExec(execId, new codes.ERROR_SANDBOX_TIMEOUT({
            messageValues: `Command '${execId}' exceeded timeout of ${options.timeout}ms`
          }))
        }, options.timeout)

        this._pendingExecs.get(execId).timeout = timeout
      }
    })

    execPromise.execId = execId
    try {
      this._sendFrame({ type: 'exec.run', execId, command })
    } catch (error) {
      this._rejectPendingExec(execId, new codes.ERROR_SANDBOX_WEBSOCKET({
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
    this._ensureOpen()
    this._sendFrame({ type: 'exec.kill', execId, signal })
  }

  /**
   * Destroys the sandbox and closes its WebSocket connection.
   *
   * @returns {Promise<object>} destroy response payload
   */
  async destroy () {
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
      const https = require('https')
      requestOptions.agent = new https.Agent({ rejectUnauthorized: false })
    }

    let response
    try {
      response = await fetch(`${this.apiHost}/api/v1/namespaces/${this.namespace}/sandbox/${this.id}`, requestOptions)
    } catch (error) {
      throw new codes.ERROR_SANDBOX_CLIENT({
        messageValues: `Could not destroy sandbox '${this.id}': ${error.message}`
      })
    }

    if (!response.ok) {
      const message = await response.text()
      throw new codes.ERROR_SANDBOX_CLIENT({
        messageValues: `Could not destroy sandbox '${this.id}': ${response.status}${message ? ` ${message}` : ''}`
      })
    }

    const payload = await response.json()
    this.status = payload.status || this.status
    this._socket?.close()
    return payload
  }

  _handleMessage (message) {
    const frame = this._parseFrame(message)
    aioLogger.debug(`[${this.id}] received frame: ${JSON.stringify(frame)}`)
    if (!frame || this._isAuthAckFrame(frame)) {
      return
    }

    const pendingExec = this._pendingExecs.get(frame.execId)
    if (!pendingExec) {
      return
    }

    if (frame.type === 'exec.output') {
      if (frame.stream === 'stderr') {
        pendingExec.stderr += frame.data || ''
      } else {
        pendingExec.stdout += frame.data || ''
      }

      if (pendingExec.onOutput) {
        pendingExec.onOutput(frame.data || '', frame.stream || 'stdout')
      }
      return
    }

    if (frame.type === 'exec.exit') {
      this._pendingExecs.delete(frame.execId)
      clearTimeout(pendingExec.timeout)
      pendingExec.resolve({
        execId: frame.execId,
        stdout: pendingExec.stdout,
        stderr: pendingExec.stderr,
        exitCode: frame.exitCode
      })
      return
    }

    if (frame.type === 'error') {
      this._rejectPendingExec(frame.execId, new codes.ERROR_SANDBOX_CLIENT({
        messageValues: frame.message || `Command '${frame.execId}' failed`
      }))
    }
  }

  _handleClose (code) {
    const error = this._createCloseError(code)
    for (const execId of this._pendingExecs.keys()) {
      this._rejectPendingExec(execId, error)
    }
    this._connectPromise = null
    this._socket = null
  }

  _rejectPendingExec (execId, error) {
    const pendingExec = this._pendingExecs.get(execId)
    if (!pendingExec) {
      return
    }

    this._pendingExecs.delete(execId)
    clearTimeout(pendingExec.timeout)
    pendingExec.reject(error)
  }

  _createCloseError (code) {
    if (code === 4001) {
      return new codes.ERROR_SANDBOX_UNAUTHORIZED({
        messageValues: `Sandbox '${this.id}' rejected the WebSocket authentication token`
      })
    }

    return new codes.ERROR_SANDBOX_WEBSOCKET({
      messageValues: `Sandbox '${this.id}' WebSocket closed with code ${code}`
    })
  }

  _ensureOpen () {
    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
      throw new codes.ERROR_SANDBOX_WEBSOCKET({
        messageValues: `Sandbox '${this.id}' is not connected`
      })
    }
  }

  _sendFrame (frame) {
    this._socket.send(JSON.stringify(frame))
  }

  _parseFrame (message) {
    try {
      return JSON.parse(message.toString())
    } catch (error) {
      return null
    }
  }

  _isAuthAckFrame (frame) {
    return frame?.type === 'auth.ok' && (!frame.sandboxId || frame.sandboxId === this.id)
  }

  _buildAuthorizationHeader () {
    return buildAuthorizationHeader(this.apiKey)
  }
}

module.exports = Sandbox
