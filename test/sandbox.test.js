const EventEmitter = require('node:events')
const Sandbox = require('../src/Sandbox')
const WebSocket = require('ws')
const { codes } = require('../src/SDKErrors')
const { createFetch } = require('@adobe/aio-lib-core-networking')

jest.mock('ws')
jest.mock('@adobe/aio-lib-core-networking')

class FakeWebSocket extends EventEmitter {
  constructor (url, options) {
    super()
    this.url = url
    this.options = options
    this.readyState = 0
    this.sent = []
  }

  send (data) {
    this.sent.push(data)
  }

  close () {
    this.readyState = 3
    this.emit('close', 1000, 'closed')
  }

  open () {
    this.readyState = WebSocket.OPEN
    this.emit('open')
  }

  closeWith (code, reason = 'closed') {
    this.readyState = 3
    this.emit('close', code, reason)
  }

  message (payload) {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload)
    this.emit('message', Buffer.from(data))
  }
}

describe('Sandbox', () => {
  let sockets
  let sandboxOptions
  let mockFetch

  beforeEach(() => {
    sockets = []
    WebSocket.OPEN = 1
    WebSocket.mockImplementation((url, options) => {
      const socket = new FakeWebSocket(url, options)
      sockets.push(socket)
      return socket
    })

    sandboxOptions = {
      id: 'sb-1234',
      endpoint: 'wss://runtime.example.net/ws/v1/namespaces/1234-demo/sandbox/sb-1234/exec',
      status: 'ready',
      cluster: 'cluster-a',
      region: 'va6',
      maxLifetime: 3600,
      namespace: '1234-demo',
      apiHost: 'https://runtime.example.net',
      apiKey: 'uuid:key',
      token: 'sandbox-token'
    }

    mockFetch = jest.fn()
    createFetch.mockReturnValue(mockFetch)
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  test('connect reuses an open websocket and resolves on auth acknowledgement', async () => {
    const sandbox = new Sandbox({
      ...sandboxOptions,
      agent: { name: 'proxy-agent' },
      ignore_certs: true
    })

    const connectPromise = sandbox.connect()

    expect(WebSocket).toHaveBeenCalledWith(sandboxOptions.endpoint, {
      agent: { name: 'proxy-agent' },
      rejectUnauthorized: false
    })

    sockets[0].open()
    expect(JSON.parse(sockets[0].sent[0])).toEqual({
      type: 'auth',
      token: 'sandbox-token'
    })
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise

    await sandbox.connect()
    expect(WebSocket).toHaveBeenCalledTimes(1)
  })

  test('connect reuses an in-flight connection promise', async () => {
    const sandbox = new Sandbox(sandboxOptions)

    const firstConnect = sandbox.connect()
    const secondConnect = sandbox.connect()

    expect(secondConnect).toBe(firstConnect)

    sockets[0].open()
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await Promise.all([firstConnect, secondConnect])
    expect(WebSocket).toHaveBeenCalledTimes(1)
  })

  test('connect ignores unrelated frames until auth acknowledgement arrives', async () => {
    const sandbox = new Sandbox(sandboxOptions)
    const connectPromise = sandbox.connect()
    const resolved = jest.fn()
    connectPromise.then(resolved)

    sockets[0].open()
    sockets[0].message({ type: 'exec.output', execId: 'ignored', data: 'ignored' })
    await Promise.resolve()
    expect(resolved).not.toHaveBeenCalled()

    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise
    expect(resolved).toHaveBeenCalledTimes(1)
  })

  test('connect rejects unauthorized closes before opening', async () => {
    const sandbox = new Sandbox(sandboxOptions)
    const connectPromise = sandbox.connect()

    sockets[0].closeWith(4001, 'unauthorized')

    await expect(connectPromise).rejects.toThrow(codes.ERROR_SANDBOX_UNAUTHORIZED)
  })

  test('connect rejects unauthorized closes after open but before auth acknowledgement', async () => {
    const sandbox = new Sandbox(sandboxOptions)
    const connectPromise = sandbox.connect()

    sockets[0].open()
    sockets[0].closeWith(4001, 'unauthorized')

    await expect(connectPromise).rejects.toThrow(codes.ERROR_SANDBOX_UNAUTHORIZED)
  })

  test('connect rejects websocket errors before opening', async () => {
    const sandbox = new Sandbox(sandboxOptions)
    const connectPromise = sandbox.connect()

    sockets[0].emit('error', new Error('socket failed'))

    await expect(connectPromise).rejects.toThrow(codes.ERROR_SANDBOX_WEBSOCKET)
  })

  test('connect rejects when sending the auth frame fails', async () => {
    const sandbox = new Sandbox(sandboxOptions)
    const connectPromise = sandbox.connect()

    sockets[0].send = jest.fn(() => {
      throw new Error('send failed')
    })
    sockets[0].open()

    await expect(connectPromise).rejects.toThrow(codes.ERROR_SANDBOX_WEBSOCKET)
  })

  test('exec streams output, ignores malformed frames, and resolves on exit', async () => {
    const sandbox = new Sandbox(sandboxOptions)
    const onOutput = jest.fn()

    const connectPromise = sandbox.connect()
    sockets[0].open()
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise

    const execPromise = sandbox.exec('ls -la', { onOutput })
    const { execId } = execPromise
    expect(execId).toMatch(/^exec-[0-9a-f]{24}$/)

    expect(JSON.parse(sockets[0].sent[1])).toEqual({
      type: 'exec.run',
      execId,
      command: 'ls -la'
    })

    sockets[0].message('not-json')
    sockets[0].message({ type: 'exec.output', execId: 'other', stream: 'stdout', data: 'ignored' })
    sockets[0].message({ type: 'exec.output', execId, stream: 'stdout', data: 'hello\n' })
    sockets[0].message({ type: 'exec.output', execId, stream: 'stderr', data: 'warning\n' })
    sockets[0].message({ type: 'exec.exit', execId, exitCode: 0 })

    await expect(execPromise).resolves.toEqual({
      execId,
      stdout: 'hello\n',
      stderr: 'warning\n',
      exitCode: 0
    })
    expect(onOutput).toHaveBeenCalledTimes(2)
    expect(onOutput).toHaveBeenNthCalledWith(1, 'hello\n', 'stdout')
    expect(onOutput).toHaveBeenNthCalledWith(2, 'warning\n', 'stderr')
  })

  test('concurrent exec calls are demultiplexed by execId', async () => {
    const sandbox = new Sandbox(sandboxOptions)

    const connectPromise = sandbox.connect()
    sockets[0].open()
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise

    const first = sandbox.exec('first')
    const second = sandbox.exec('second')

    sockets[0].message({ type: 'exec.output', execId: second.execId, stream: 'stdout', data: 'b' })
    sockets[0].message({ type: 'exec.output', execId: first.execId, stream: 'stdout', data: 'a' })
    sockets[0].message({ type: 'exec.exit', execId: first.execId, exitCode: 0 })
    sockets[0].message({ type: 'exec.exit', execId: second.execId, exitCode: 1 })

    await expect(first).resolves.toEqual({
      execId: first.execId,
      stdout: 'a',
      stderr: '',
      exitCode: 0
    })
    await expect(second).resolves.toEqual({
      execId: second.execId,
      stdout: 'b',
      stderr: '',
      exitCode: 1
    })
  })

  test('exec rejects on sandbox error frames', async () => {
    const sandbox = new Sandbox(sandboxOptions)

    const connectPromise = sandbox.connect()
    sockets[0].open()
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise

    const execPromise = sandbox.exec('bad-command')
    sockets[0].message({
      type: 'error',
      execId: execPromise.execId,
      message: 'command failed'
    })

    await expect(execPromise).rejects.toThrow(codes.ERROR_SANDBOX_CLIENT)
  })

  test('exec handles empty output payloads and fallback error messages', async () => {
    const sandbox = new Sandbox(sandboxOptions)

    const connectPromise = sandbox.connect()
    sockets[0].open()
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise

    const emptyOutputExec = sandbox.exec('empty-output', { onOutput: jest.fn() })
    sockets[0].message({ type: 'noop', execId: emptyOutputExec.execId })
    sockets[0].message({ type: 'exec.output', execId: emptyOutputExec.execId, stream: 'stdout' })
    sockets[0].message({ type: 'exec.output', execId: emptyOutputExec.execId, stream: 'stderr' })
    sockets[0].message({ type: 'exec.exit', execId: emptyOutputExec.execId, exitCode: 0 })

    await expect(emptyOutputExec).resolves.toEqual({
      execId: emptyOutputExec.execId,
      stdout: '',
      stderr: '',
      exitCode: 0
    })

    const fallbackErrorExec = sandbox.exec('fallback-error')
    sockets[0].message({ type: 'error', execId: fallbackErrorExec.execId })

    await expect(fallbackErrorExec).rejects.toThrow(`Command '${fallbackErrorExec.execId}' failed`)
  })

  test('exec timeouts send kill frames and reject', async () => {
    jest.useFakeTimers()
    const sandbox = new Sandbox(sandboxOptions)

    const connectPromise = sandbox.connect()
    sockets[0].open()
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise

    const execPromise = sandbox.exec('sleep 10', { timeout: 1000 })
    jest.advanceTimersByTime(1000)
    await Promise.resolve()

    await expect(execPromise).rejects.toThrow(codes.ERROR_SANDBOX_TIMEOUT)
    expect(JSON.parse(sockets[0].sent[2])).toEqual({
      type: 'exec.kill',
      execId: execPromise.execId,
      signal: 'SIGTERM'
    })
  })

  test('kill sends exec.kill frames and disconnected sandboxes reject new commands', async () => {
    const sandbox = new Sandbox(sandboxOptions)

    const connectPromise = sandbox.connect()
    sockets[0].open()
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise

    await sandbox.kill('exec-1', 'SIGKILL')

    expect(JSON.parse(sockets[0].sent[1])).toEqual({
      type: 'exec.kill',
      execId: 'exec-1',
      signal: 'SIGKILL'
    })

    const execPromise = sandbox.exec('long-running')
    sockets[0].closeWith(1011, 'server error')

    await expect(execPromise).rejects.toThrow(codes.ERROR_SANDBOX_WEBSOCKET)
    expect(() => sandbox.kill('exec-2')).toThrow(codes.ERROR_SANDBOX_WEBSOCKET)
    await expect(sandbox.exec('after-close')).rejects.toThrow(codes.ERROR_SANDBOX_WEBSOCKET)
  })

  test('destroy deletes the sandbox and closes the websocket', async () => {
    const sandbox = new Sandbox(sandboxOptions)

    const connectPromise = sandbox.connect()
    sockets[0].open()
    sockets[0].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
    await connectPromise

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sandboxId: 'sb-1234',
        status: 'terminating'
      })
    })

    const result = await sandbox.destroy()

    expect(createFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://runtime.example.net/api/v1/namespaces/1234-demo/sandbox/sb-1234',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${Buffer.from('uuid:key').toString('base64')}`
        }
      }
    )
    expect(result).toEqual({
      sandboxId: 'sb-1234',
      status: 'terminating'
    })
    expect(sandbox.status).toBe('terminating')
    expect(sockets[0].readyState).toBe(3)
  })

  test('destroy forwards configured transport options to fetch', async () => {
    const sandbox = new Sandbox({
      ...sandboxOptions,
      agent: { name: 'proxy-agent' },
      ignore_certs: true
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sandboxId: 'sb-1234',
        status: 'terminating'
      })
    })

    await sandbox.destroy()

    expect(mockFetch).toHaveBeenCalledWith(
      'https://runtime.example.net/api/v1/namespaces/1234-demo/sandbox/sb-1234',
      {
        method: 'DELETE',
        agent: { name: 'proxy-agent' },
        headers: {
          Authorization: `Basic ${Buffer.from('uuid:key').toString('base64')}`
        }
      }
    )
  })

  test('destroy surfaces http and network failures', async () => {
    const sandbox = new Sandbox({
      ...sandboxOptions,
      apiKey: 'uuid:key'
    })

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('server-error')
    })
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    await expect(sandbox.destroy()).rejects.toThrow(codes.ERROR_SANDBOX_CLIENT)
    await expect(sandbox.destroy()).rejects.toThrow(codes.ERROR_SANDBOX_CLIENT)
  })

  test('destroy omits a trailing space when the server returns an empty error body', async () => {
    const sandbox = new Sandbox(sandboxOptions)

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('')
    })

    await expect(sandbox.destroy()).rejects.toThrow("Could not destroy sandbox 'sb-1234': 500")
  })

  test('destroy preserves the current status when the delete response omits one', async () => {
    const sandbox = new Sandbox(sandboxOptions)

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sandboxId: 'sb-1234'
      })
    })

    await sandbox.destroy()

    expect(sandbox.status).toBe('ready')
  })

  test('rejecting an unknown exec id is a no-op', () => {
    const sandbox = new Sandbox(sandboxOptions)

    expect(() => sandbox._rejectPendingExec('missing', new Error('missing'))).not.toThrow()
  })

  test('builds an auth header from the provided api key', () => {
    const sandbox = new Sandbox({
      ...sandboxOptions,
      namespace: undefined
    })

    expect(sandbox._buildAuthorizationHeader()).toBe(
      `Basic ${Buffer.from('uuid:key').toString('base64')}`
    )
  })

  describe('writeStdin / closeStdin', () => {
    let sandbox
    let fakeWS

    async function connectSandbox (sb) {
      const p = sb.connect()
      sockets[sockets.length - 1].open()
      sockets[sockets.length - 1].message({ type: 'auth.ok', sandboxId: sandboxOptions.id })
      await p
      fakeWS = sockets[sockets.length - 1]
    }

    beforeEach(async () => {
      sandbox = new Sandbox(sandboxOptions)
      await connectSandbox(sandbox)
    })

    test('writeStdin sends exec.input frame with text data', () => {
      sandbox.writeStdin('exec-abc', 'print("hello")\n')

      const frame = JSON.parse(fakeWS.sent[fakeWS.sent.length - 1])
      expect(frame).toEqual({
        type: 'exec.input',
        execId: 'exec-abc',
        data: 'print("hello")\n'
      })
    })

    test('writeStdin sends base64-encoded frame for Buffer', () => {
      const buf = Buffer.from('binary-data')
      sandbox.writeStdin('exec-abc', buf)

      const frame = JSON.parse(fakeWS.sent[fakeWS.sent.length - 1])
      expect(frame).toEqual({
        type: 'exec.input',
        execId: 'exec-abc',
        data: buf.toString('base64'),
        encoding: 'base64'
      })
    })

    test('writeStdin throws when socket not connected', () => {
      fakeWS.readyState = 3
      expect(() => sandbox.writeStdin('exec-abc', 'data')).toThrow(codes.ERROR_SANDBOX_WEBSOCKET)
    })

    test('closeStdin sends exec.endInput frame', () => {
      sandbox.closeStdin('exec-abc')

      const frame = JSON.parse(fakeWS.sent[fakeWS.sent.length - 1])
      expect(frame).toEqual({
        type: 'exec.endInput',
        execId: 'exec-abc'
      })
    })

    test('closeStdin throws when socket not connected', () => {
      fakeWS.readyState = 3
      expect(() => sandbox.closeStdin('exec-abc')).toThrow(codes.ERROR_SANDBOX_WEBSOCKET)
    })

    test('exec with stdin option sends run + input + endInput', async () => {
      const execPromise = sandbox.exec('cat', { stdin: 'hello world\n' })
      const { execId } = execPromise

      const sentAfterAuth = fakeWS.sent.slice(1).map(s => JSON.parse(s))
      expect(sentAfterAuth).toEqual([
        { type: 'exec.run', execId, command: 'cat' },
        { type: 'exec.input', execId, data: 'hello world\n' },
        { type: 'exec.endInput', execId }
      ])

      fakeWS.message({ type: 'exec.exit', execId, exitCode: 0 })
      await execPromise
    })

    test('exec with Buffer stdin sends base64 input', async () => {
      const buf = Buffer.from('binary-stdin')
      const execPromise = sandbox.exec('process', { stdin: buf })
      const { execId } = execPromise

      const sentAfterAuth = fakeWS.sent.slice(1).map(s => JSON.parse(s))
      expect(sentAfterAuth).toEqual([
        { type: 'exec.run', execId, command: 'process' },
        { type: 'exec.input', execId, data: buf.toString('base64'), encoding: 'base64' },
        { type: 'exec.endInput', execId }
      ])

      fakeWS.message({ type: 'exec.exit', execId, exitCode: 0 })
      await execPromise
    })

    test('exec without stdin option does not send input frames', async () => {
      const execPromise = sandbox.exec('ls')
      const { execId } = execPromise

      const sentAfterAuth = fakeWS.sent.slice(1).map(s => JSON.parse(s))
      expect(sentAfterAuth).toEqual([
        { type: 'exec.run', execId, command: 'ls' }
      ])

      fakeWS.message({ type: 'exec.exit', execId, exitCode: 0 })
      await execPromise
    })
  })
})
