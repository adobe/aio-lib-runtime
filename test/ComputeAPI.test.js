const SandboxAPI = require('../src/SandboxAPI')
const Sandbox = require('../src/Sandbox')
const { codes } = require('../src/SDKErrors')
const { createFetch } = require('@adobe/aio-lib-core-networking')

jest.mock('../src/Sandbox')
jest.mock('@adobe/aio-lib-core-networking')

describe('SandboxAPI', () => {
  let sandboxInstance
  let mockFetch

  beforeEach(() => {
    sandboxInstance = {
      connect: jest.fn().mockResolvedValue(undefined)
    }

    Sandbox.mockImplementation((options) => ({
      ...sandboxInstance,
      options
    }))

    mockFetch = jest.fn()
    createFetch.mockReturnValue(mockFetch)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('normalizes apihost and exposes sizes', () => {
    const compute = new SandboxAPI('runtime.example.net', '1234-demo', 'uuid:key')

    expect(compute.apiHost).toBe('https://runtime.example.net')
    expect(compute.sizes).toEqual(SandboxAPI.sizes)
  })

  test('create posts sandbox payload and returns a connected sandbox', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', '1234-demo', 'uuid:key')
    const responsePayload = {
      sandboxId: 'sb-1234',
      token: 'sandbox-token',
      status: 'ready',
      wsEndpoint: 'wss://runtime.example.net/ws/v1/namespaces/1234-demo/sandbox/sb-1234/exec',
      cluster: 'cluster-a',
      region: 'va6',
      maxLifetime: 7200
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(responsePayload)
    })

    const result = await compute.create({
      name: 'app-instance',
      cluster: 'cluster-a',
      region: 'va6',
      workspace: 'workspace-a',
      size: compute.sizes.SMALL,
      type: 'gpu:python',
      maxLifetime: 7200,
      envs: { API_KEY: 'secret' }
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://runtime.example.net/api/v1/namespaces/1234-demo/sandbox',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from('uuid:key').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      })
    )
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      name: 'app-instance',
      cluster: 'cluster-a',
      region: 'va6',
      workspace: 'workspace-a',
      size: 'SMALL',
      type: 'gpu:python',
      maxLifetime: 7200,
      envs: { API_KEY: 'secret' }
    })
    expect(Sandbox).toHaveBeenCalledWith(expect.objectContaining({
      id: 'sb-1234',
      endpoint: responsePayload.wsEndpoint,
      status: 'ready',
      cluster: 'cluster-a',
      region: 'va6',
      maxLifetime: 7200,
      token: 'sandbox-token'
    }))
    expect(result.connect).toHaveBeenCalledTimes(1)
  })

  test('create uses default values and respects full auth keys', async () => {
    const compute = new SandboxAPI('runtime.example.net', 'ignored-namespace', 'uuid:key')

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sandboxId: 'sb-5678',
        token: 'sandbox-token',
        status: 'ready'
      })
    })

    await compute.create({
      name: 'defaulted',
      size: 'LARGE'
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://runtime.example.net/api/v1/namespaces/ignored-namespace/sandbox',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'defaulted',
          size: 'LARGE',
          type: 'cpu:default',
          maxLifetime: 3600
        }),
        headers: {
          Authorization: `Basic ${Buffer.from('uuid:key').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    )

    expect(Sandbox).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: 'wss://runtime.example.net/ws/v1/namespaces/ignored-namespace/sandbox/sb-5678/exec'
    }))
  })

  test('rest sandbox operations forward configured transport options', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', '1234-demo', 'uuid:key', {
      agent: { name: 'proxy-agent' },
      ignore_certs: true
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sandboxId: 'sb-1234',
        token: 'sandbox-token',
        status: 'ready'
      })
    })
    await compute.create({ name: 'proxy-aware' })

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://runtime.example.net/api/v1/namespaces/1234-demo/sandbox',
      expect.objectContaining({
        method: 'POST',
        agent: { name: 'proxy-agent' }
      })
    )
  })

  test('create supports omitted option objects and http websocket endpoints', async () => {
    const compute = new SandboxAPI('http://runtime.example.net', 'plainnamespace', 'uuid:key')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sandboxId: 'sb-http',
        token: 'token',
        status: 'ready'
      })
    })

    await compute.create()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://runtime.example.net/api/v1/namespaces/plainnamespace/sandbox',
      expect.objectContaining({
        headers: {
          Authorization: `Basic ${Buffer.from('uuid:key').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      })
    )
    expect(Sandbox).toHaveBeenNthCalledWith(1, expect.objectContaining({
      endpoint: 'ws://runtime.example.net/ws/v1/namespaces/plainnamespace/sandbox/sb-http/exec'
    }))
  })

  test('create surfaces timeout responses', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', '1234-demo', 'uuid:key')

    mockFetch.mockResolvedValue({
      ok: false,
      status: 504,
      text: jest.fn().mockResolvedValue('sandbox provisioning timed out')
    })

    await expect(compute.create({ name: 'timeout' })).rejects.toThrow(codes.ERROR_SANDBOX_TIMEOUT)
  })

  test('create surfaces authorization and not-found responses', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', '1234-demo', 'uuid:key')

    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: jest.fn().mockResolvedValue('unauthorized') })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: jest.fn().mockResolvedValue('forbidden') })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: jest.fn().mockResolvedValue('missing') })

    await expect(compute.create({ name: 'sb-401' })).rejects.toThrow(codes.ERROR_SANDBOX_UNAUTHORIZED)
    await expect(compute.create({ name: 'sb-403' })).rejects.toThrow(codes.ERROR_SANDBOX_UNAUTHORIZED)
    await expect(compute.create({ name: 'sb-missing' })).rejects.toThrow(codes.ERROR_SANDBOX_NOT_FOUND)
  })

  test('create throws on invalid sizes, generic server failures, and network failures', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', '1234-demo', 'uuid:key')

    await expect(compute.create({
      name: 'bad-size',
      size: { cpu: '1', memory: '1Gi', gpu: 7 }
    })).rejects.toThrow(codes.ERROR_SANDBOX_CLIENT)

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('server-error')
    })
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    await expect(compute.create({ name: 'server-error' })).rejects.toThrow(codes.ERROR_SANDBOX_CLIENT)
    await expect(compute.create({ name: 'network-error' })).rejects.toThrow(codes.ERROR_SANDBOX_CLIENT)
  })

  test('create surfaces generic failures with empty response bodies', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', '1234-demo', 'uuid:key')

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('')
    })

    await expect(compute.create()).rejects.toThrow('Could not create sandbox: 500')
  })

  test('sandbox operations require a namespace', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', undefined, 'uuid:key')

    await expect(compute.create()).rejects.toThrow(codes.ERROR_SANDBOX_CLIENT)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('builds an auth header from the provided api key', () => {
    const compute = new SandboxAPI('https://runtime.example.net', undefined, 'uuid:key')

    expect(compute._buildAuthorizationHeader()).toBe(
      `Basic ${Buffer.from('uuid:key').toString('base64')}`
    )
  })

  test('getStatus returns sandbox status for a given sandbox id', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', '1234-demo', 'uuid:key')
    const statusPayload = { sandboxId: 'sb-1234', status: 'ready', cluster: 'cluster-a' }

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(statusPayload)
    })

    const result = await compute.getStatus('sb-1234')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://runtime.example.net/api/v1/namespaces/1234-demo/sandbox/sb-1234',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('uuid:key').toString('base64')}`
        })
      })
    )
    expect(result).toEqual(statusPayload)
  })

  test('getStatus surfaces server errors', async () => {
    const compute = new SandboxAPI('https://runtime.example.net', '1234-demo', 'uuid:key')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue('not found')
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('internal error')
    })

    await expect(compute.getStatus('sb-missing')).rejects.toThrow(codes.ERROR_SANDBOX_NOT_FOUND)
    await expect(compute.getStatus('sb-broken')).rejects.toThrow(codes.ERROR_SANDBOX_CLIENT)
  })
})
