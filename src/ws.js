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

const WebSocket = require('ws')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:SandboxSocket', { provider: 'debug', level: process.env.LOG_LEVEL })
const { codes } = require('./SDKErrors')

/**
 * Manages the WebSocket connection, authentication, and frame routing for a sandbox.
 *
 * Holds the raw socket, all pending exec and file-op promises, and handles every
 * incoming message. `Sandbox` creates one instance and delegates all WS work here.
 */
class SandboxSocket {
  /**
   * @param {object} options
   * @param {string} options.id sandbox id
   * @param {string} options.endpoint WebSocket endpoint URL
   * @param {string} options.token authentication token
   * @param {object} [options.agent] HTTP/S proxy agent
   * @param {boolean} [options.ignoreCerts] disable TLS certificate verification
   */
  constructor ({ id, endpoint, token, agent, ignoreCerts }) {
    this.id = id
    this.endpoint = endpoint
    this.token = token
    this.agent = agent
    this.ignoreCerts = ignoreCerts

    this.socket = null
    this.connectPromise = null

    /** @type {Map<string, {resolve: Function, reject: Function, stdout: string, stderr: string, onOutput: Function|undefined, timeout: any}>} */
    this.pendingExecs = new Map()
    /** @type {Map<string, {resolve: Function, reject: Function}>} */
    this.pendingFileOps = new Map()
  }

  /**
   * Opens the WebSocket, authenticates, and starts routing messages.
   *
   * @returns {Promise<void>}
   */
  connect () {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    if (this.connectPromise) {
      return this.connectPromise
    }

    const wsOptions = {}
    if (this.agent) {
      wsOptions.agent = this.agent
    }
    if (this.ignoreCerts) {
      wsOptions.rejectUnauthorized = false
    }

    this.socket = new WebSocket(this.endpoint, wsOptions)
    const socket = this.socket

    socket.on('message', message => this.handleMessage(message))
    socket.on('close', code => this.handleClose(code))
    socket.on('error', (err) => aioLogger.warn(`[${this.id}] WebSocket error: ${err.message}`))

    this.connectPromise = new Promise((resolve, reject) => {
      const onOpen = () => {
        try {
          this.send({ type: 'auth', token: this.token })
        } catch (error) {
          onError(error)
        }
      }

      const onMessage = (message) => {
        const frame = this.parseFrame(message)
        if (!frame || !this.isAuthAckFrame(frame)) return
        cleanup()
        this.connectPromise = null
        resolve()
      }

      const onClose = (code) => {
        cleanup()
        this.connectPromise = null
        reject(this.createCloseError(code))
      }

      const onError = (error) => {
        cleanup()
        this.connectPromise = null
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

    return this.connectPromise
  }

  /**
   * Throws `ERROR_SANDBOX_WEBSOCKET` if the socket is not currently open.
   */
  ensureOpen () {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new codes.ERROR_SANDBOX_WEBSOCKET({
        messageValues: `Sandbox '${this.id}' is not connected`
      })
    }
  }

  /**
   * Serialises `frame` and sends it over the socket.
   *
   * @param {object} frame
   */
  send (frame) {
    this.socket.send(JSON.stringify(frame))
  }

  /**
   * Closes the underlying socket.
   */
  close () {
    this.socket?.close()
  }

  // ------------------------------------------------------------------
  // Pending operation helpers
  // ------------------------------------------------------------------

  /**
   * Rejects and removes a pending exec, clearing its timeout.
   *
   * @param {string} execId
   * @param {Error} error
   */
  rejectExec (execId, error) {
    const pending = this.pendingExecs.get(execId)
    if (!pending) return
    this.pendingExecs.delete(execId)
    clearTimeout(pending.timeout)
    pending.reject(error)
  }

  /**
   * Rejects and removes a pending file operation.
   *
   * @param {string} execId
   * @param {Error} error
   */
  rejectFileOp (execId, error) {
    const pending = this.pendingFileOps.get(execId)
    if (!pending) return
    this.pendingFileOps.delete(execId)
    pending.reject(error)
  }

  handleMessage (message) {
    const frame = this.parseFrame(message)
    aioLogger.debug(`[${this.id}] received frame: ${JSON.stringify(frame)}`)
    if (!frame || this.isAuthAckFrame(frame)) return

    if (this.pendingFileOps.has(frame.execId)) {
      this.handleFileFrame(frame)
      return
    }

    if (this.pendingExecs.has(frame.execId)) {
      this.handleExecFrame(frame)
    }
  }

  handleClose (code) {
    const error = this.createCloseError(code)
    for (const execId of [...this.pendingExecs.keys()]) {
      this.rejectExec(execId, error)
    }
    for (const execId of [...this.pendingFileOps.keys()]) {
      this.rejectFileOp(execId, error)
    }
    this.connectPromise = null
    this.socket = null
  }

  createCloseError (code) {
    if (code === 4001) {
      return new codes.ERROR_SANDBOX_UNAUTHORIZED({
        messageValues: `Sandbox '${this.id}' rejected the WebSocket authentication token`
      })
    }
    return new codes.ERROR_SANDBOX_WEBSOCKET({
      messageValues: `Sandbox '${this.id}' WebSocket closed with code ${code}`
    })
  }

  parseFrame (message) {
    try {
      return JSON.parse(message.toString())
    } catch (_) {
      return null
    }
  }

  isAuthAckFrame (frame) {
    return frame?.type === 'auth.ok' && (!frame.sandboxId || frame.sandboxId === this.id)
  }

  // ------------------------------------------------------------------
  // Frame routing
  // ------------------------------------------------------------------

  handleExecFrame (frame) {
    const pending = this.pendingExecs.get(frame.execId)
    if (!pending) return

    if (frame.type === 'exec.output') {
      if (frame.stream === 'stderr') {
        pending.stderr += frame.data || ''
      } else {
        pending.stdout += frame.data || ''
      }
      if (pending.onOutput) {
        pending.onOutput(frame.data || '', frame.stream || 'stdout')
      }
      return
    }

    if (frame.type === 'exec.exit') {
      this.pendingExecs.delete(frame.execId)
      clearTimeout(pending.timeout)
      pending.resolve({
        execId: frame.execId,
        stdout: pending.stdout,
        stderr: pending.stderr,
        exitCode: frame.exitCode
      })
      return
    }

    if (frame.type === 'error') {
      this.rejectExec(frame.execId, new codes.ERROR_SANDBOX_CLIENT({
        messageValues: frame.message || `Command '${frame.execId}' failed`
      }))
    }
  }

  handleFileFrame (frame) {
    const pending = this.pendingFileOps.get(frame.execId)
    if (!pending) return

    if (frame.type === 'file.content') {
      this.pendingFileOps.delete(frame.execId)
      const content = frame.encoding === 'base64'
        ? Buffer.from(frame.content, 'base64').toString('utf8')
        : (frame.content || '')
      pending.resolve(content)
      return
    }

    if (frame.type === 'file.writeResult') {
      this.pendingFileOps.delete(frame.execId)
      if (!frame.ok) {
        pending.reject(new codes.ERROR_SANDBOX_CLIENT({
          messageValues: `file.write failed for path '${frame.path}'`
        }))
      } else {
        pending.resolve({ path: frame.path, size: frame.size, ok: frame.ok })
      }
      return
    }

    if (frame.type === 'file.entries') {
      this.pendingFileOps.delete(frame.execId)
      pending.resolve(frame.entries || [])
      return
    }

    if (frame.type === 'error') {
      this.rejectFileOp(frame.execId, new codes.ERROR_SANDBOX_CLIENT({
        messageValues: frame.message || `File operation '${frame.execId}' failed`
      }))
    }
  }
}

module.exports = { SandboxSocket }
