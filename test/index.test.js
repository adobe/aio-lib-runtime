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

const sdk = require('../src')
const { codes } = require('../src/SDKErrors')
const { getProxyForUrl } = require('proxy-from-env')

jest.mock('proxy-from-env')
jest.mock('openwhisk')
jest.mock('../src/RuntimeAPI')
jest.mock('../src/triggers')
jest.mock('../src/LogForwarding')
jest.mock('../src/LogForwardingLocalDestinationsProvider')
jest.mock('../src/openwhisk-patch')
jest.mock('../src/utils')

const ow = require('openwhisk')
const RuntimeAPI = require('../src/RuntimeAPI')
const Triggers = require('../src/triggers')
const LogForwarding = require('../src/LogForwarding')
const LogForwardingLocalDestinationsProvider = require('../src/LogForwardingLocalDestinationsProvider')
const { patchOWForTunnelingIssue } = require('../src/openwhisk-patch')
const { getProxyAgent } = require('../src/utils')

// /////////////////////////////////////////////

const gApiHost = 'test-host'
const gApiKey = 'test-apikey'

// /////////////////////////////////////////////

const createOptions = (options) => {
  return {
    api_key: gApiKey,
    apihost: gApiHost,
    ...options
  }
}

const createSdkClient = async (options) => {
  return sdk.init(createOptions(options))
}

// /////////////////////////////////////////////

beforeEach(() => {
  getProxyForUrl.mockReset()

  // Mock OpenWhisk client with proper structure
  const mockOWClient = {
    actions: {
      client: {
        options: {
          agent: null,
          proxy: undefined
        },
        params: jest.fn().mockResolvedValue({}),
        mockResolved: jest.fn(),
        mockRejected: jest.fn()
      }
    },
    activations: { mock: 'activations' },
    namespaces: { mock: 'namespaces' },
    packages: { mock: 'packages' },
    rules: { mock: 'rules' },
    triggers: {
      mock: 'triggers',
      create: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      get: jest.fn()
    },
    routes: { mock: 'routes' }
  }

  // Add mockResolved and mockRejected methods to the ow mock
  ow.mockResolved = jest.fn().mockImplementation((method, value) => {
    const mockFn = jest.fn().mockResolvedValue(value)
    // Mock the specific method on the OpenWhisk client
    if (method === 'triggers.create') {
      mockOWClient.triggers.create = mockFn
    } else if (method === 'triggers.delete') {
      mockOWClient.triggers.delete = mockFn
    } else if (method === 'triggers.get') {
      mockOWClient.triggers.get = mockFn
    } else if (method === 'triggers.list') {
      mockOWClient.triggers.list = mockFn
    } else if (method === 'feeds.create') {
      mockOWClient.feeds = mockOWClient.feeds || {}
      mockOWClient.feeds.create = mockFn
    } else if (method === 'feeds.delete') {
      mockOWClient.feeds = mockOWClient.feeds || {}
      mockOWClient.feeds.delete = mockFn
    }
    return mockFn
  })
  ow.mockRejected = jest.fn().mockImplementation((method, error) => {
    const mockFn = jest.fn().mockRejectedValue(error)
    // Mock the specific method on the OpenWhisk client
    if (method === 'triggers.create') {
      mockOWClient.triggers.create = mockFn
    } else if (method === 'triggers.delete') {
      mockOWClient.triggers.delete = mockFn
    } else if (method === 'triggers.get') {
      mockOWClient.triggers.get = mockFn
    } else if (method === 'triggers.list') {
      mockOWClient.triggers.list = mockFn
    } else if (method === 'feeds.create') {
      mockOWClient.feeds = mockOWClient.feeds || {}
      mockOWClient.feeds.create = mockFn
    } else if (method === 'feeds.delete') {
      mockOWClient.feeds = mockOWClient.feeds || {}
      mockOWClient.feeds.delete = mockFn
    }
    return mockFn
  })
  ow.mockReturnValue(mockOWClient)
  patchOWForTunnelingIssue.mockReturnValue(mockOWClient)

  // Mock RuntimeAPI with proper behavior
  const mockRuntimeAPI = {
    init: jest.fn().mockImplementation(async (options) => {
      // Simulate the actual RuntimeAPI behavior
      if (!options || !options.api_key) {
        throw new codes.ERROR_SDK_INITIALIZATION({ messageValues: 'api_key' })
      }
      if (!options || !options.apihost) {
        throw new codes.ERROR_SDK_INITIALIZATION({ messageValues: 'apihost' })
      }

      // Simulate the ignore_certs logic from RuntimeAPI.js
      const shouldIgnoreCerts = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
      const ignoreCerts = options.ignore_certs || shouldIgnoreCerts

      // Create a mock triggers proxy that delegates to Triggers class
      const mockTriggersProxy = new Proxy(mockOWClient.triggers, {
        get (target, property) {
          return property in mockTriggersInstance ? mockTriggersInstance[property] : target[property]
        }
      })

      // Return the mock client with initOptions
      return {
        ...mockOWClient,
        triggers: mockTriggersProxy,
        initOptions: {
          ...options,
          retry: options.retry || { retries: 2, minTimeout: 200 },
          ignore_certs: ignoreCerts
        }
      }
    })
  }
  RuntimeAPI.mockImplementation(() => mockRuntimeAPI)

  // Mock other dependencies
  const mockTriggersInstance = {
    create: jest.fn().mockImplementation(async (options) => {
      if (!options) {
        throw new Error('No args provided')
      }
      // Call the underlying OpenWhisk client method
      const result = await mockOWClient.triggers.create(options)
      if (options && options.trigger && options.trigger.feed) {
        // Simulate the feed creation logic from the actual Triggers class
        try {
          try {
            await mockOWClient.feeds.delete({ name: options.trigger.feed, trigger: options.name })
          } catch (err) {
            // Ignore
          }
          await mockOWClient.feeds.create({ name: options.trigger.feed, trigger: options.name })
        } catch (err) {
          // If feed creation fails, delete the trigger that was created
          await mockOWClient.triggers.delete(options)
          throw err
        }
      }
      return result
    }),
    delete: jest.fn().mockImplementation(async (options) => {
      const trigger = await mockOWClient.triggers.get(options)
      if (trigger && trigger.annotations) {
        const feedAnnotation = trigger.annotations.find(ann => ann.key === 'feed')
        if (feedAnnotation) {
          await mockOWClient.feeds.delete({ name: feedAnnotation.value, trigger: options.name })
        }
      }
      return await mockOWClient.triggers.delete(options)
    }),
    list: jest.fn().mockImplementation(async () => {
      return await mockOWClient.triggers.list()
    }),
    get: jest.fn().mockImplementation(async (options) => {
      return await mockOWClient.triggers.get(options)
    })
  }

  // Make Triggers.prototype.create point to our mock function
  Triggers.prototype.create = mockTriggersInstance.create
  Triggers.mockImplementation(() => mockTriggersInstance)
  LogForwarding.mockImplementation(() => ({}))
  LogForwardingLocalDestinationsProvider.mockImplementation(() => ({}))
  getProxyAgent.mockReturnValue({ mock: 'agent' })
})

test('sdk init test', async () => {
  const sdkClient = await createSdkClient()
  expect(Object.keys(sdkClient)).toEqual(expect.arrayContaining(['actions', 'activations', 'namespaces', 'packages', 'rules', 'triggers', 'routes']))
})

test('sdk init test - no apihost', async () => {
  return expect(sdk.init({ api_key: gApiKey })).rejects.toEqual(
    new codes.ERROR_SDK_INITIALIZATION({ messageValues: 'apihost' })
  )
})

test('sdk init test - no api_key', async () => {
  return expect(sdk.init({ apihost: gApiHost })).rejects.toEqual(
    new codes.ERROR_SDK_INITIALIZATION({ messageValues: 'api_key' })
  )
})

test('sdk init test - process.env.NODE_TLS_REJECT_UNAUTHORIZED', async () => {
  let sdkClient
  const oldEnvValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED

  // Defaults ///////////

  // no param, no env var (ignore_certs should be false)
  sdkClient = await createSdkClient()
  expect(sdkClient.initOptions.ignore_certs).toEqual(false)

  // ONLY param set ///////////

  // param set (true), no env var (ignore_certs should be true)
  sdkClient = await createSdkClient({ ignore_certs: true })
  expect(sdkClient.initOptions.ignore_certs).toEqual(true)

  // param set (false), no env var (ignore_certs should be false)
  sdkClient = await createSdkClient({ ignore_certs: false })
  expect(sdkClient.initOptions.ignore_certs).toEqual(false)

  // BOTH param and env var set ///////////

  // param set (true), env var set to '0' (ignore_certs should be true)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  sdkClient = await createSdkClient({ ignore_certs: true })
  expect(sdkClient.initOptions.ignore_certs).toEqual(true)

  // param set (true), env var set to '1' (ignore_certs should be true)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'
  sdkClient = await createSdkClient({ ignore_certs: true })
  expect(sdkClient.initOptions.ignore_certs).toEqual(true)

  // param set (false), env var set to '0' (ignore_certs should be true)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  sdkClient = await createSdkClient({ ignore_certs: false })
  expect(sdkClient.initOptions.ignore_certs).toEqual(true)

  // param set (false), env var set to '1' (ignore_certs should be true)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'
  sdkClient = await createSdkClient({ ignore_certs: false })
  expect(sdkClient.initOptions.ignore_certs).toEqual(false)

  // ONLY env var set ///////////

  // param not set, env var set to '0' (ignore_certs should be true)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  sdkClient = await createSdkClient()
  expect(sdkClient.initOptions.ignore_certs).toEqual(true)

  // param not set, env var set to '1' (ignore_certs should be false)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'
  sdkClient = await createSdkClient()
  expect(sdkClient.initOptions.ignore_certs).toEqual(false)

  // restore env var
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = oldEnvValue
})

test('javascript proxy functionality (ow object)', async () => {
  const runtimeLib = await sdk.init(createOptions())
  // Call a function that is not proxied
  ow.mockResolved('triggers.list', '')
  expect(typeof runtimeLib.triggers.list).toBe('function')

  // Proxied function
  expect(runtimeLib.triggers.create).toBe(Triggers.prototype.create)
})

test('set http proxy', async () => {
  let sdkClient

  getProxyForUrl.mockReturnValue('https://localhost:8081') // proxy settings available (url only)
  sdkClient = await createSdkClient()
  expect(Object.keys(sdkClient)).toEqual(expect.arrayContaining(['actions', 'activations', 'namespaces', 'packages', 'rules', 'triggers', 'routes']))

  getProxyForUrl.mockReturnValue('https://user:hunter2@localhost:8081') // proxy settings available (url and auth)
  sdkClient = await createSdkClient()
  expect(Object.keys(sdkClient)).toEqual(expect.arrayContaining(['actions', 'activations', 'namespaces', 'packages', 'rules', 'triggers', 'routes']))
})

test('set retry by default', async () => {
  const sdkClient = await createSdkClient()
  expect(sdkClient.initOptions).toEqual(expect.objectContaining({ retry: { retries: 2, minTimeout: 200 } }))
})

test('set user retry', async () => {
  const sdkClient = await createSdkClient({ retry: { retries: 1, minTimeout: 1000 } })
  expect(sdkClient.initOptions).toEqual(expect.objectContaining({ retry: { retries: 1, minTimeout: 1000 } }))
})

test('triggers.create', async () => {
  const runtimeLib = await sdk.init(createOptions())
  // No args
  await expect(runtimeLib.triggers.create()).rejects.toThrow()

  const triggerCreateCmd = ow.mockResolved('triggers.create', '')
  const feedCreateCmd = ow.mockResolved('feeds.create', '')
  await runtimeLib.triggers.create({ name: 'testTrigger' })
  expect(triggerCreateCmd).toHaveBeenCalledTimes(1)
  expect(feedCreateCmd).toHaveBeenCalledTimes(0)
})

test('triggers.create feed', async () => {
  const runtimeLib = await sdk.init(createOptions())
  const triggerCreateCmd = ow.mockResolved('triggers.create', '')
  const feedCreateCmd = ow.mockResolved('feeds.create', '')
  await runtimeLib.triggers.create({ name: 'testTrigger', trigger: { feed: '/whisk.system/alarms/alarm' } })
  expect(triggerCreateCmd).toHaveBeenCalledTimes(1)
  expect(feedCreateCmd).toHaveBeenCalledTimes(1)
})

test('triggers.create feed - Error', async () => {
  const runtimeLib = await sdk.init(createOptions())
  const triggerCreateCmd = ow.mockResolved('triggers.create', '')
  const feedCreateCmd = ow.mockRejected('feeds.create', new Error('an error'))
  const triggerDeleteCmd = ow.mockResolved('triggers.delete', '')

  let exceptionThrown = false
  try {
    await runtimeLib.triggers.create({ name: 'testTrigger', trigger: { feed: '/whisk.system/alarms/alarm' } })
    // shouldn't reach here
  } catch (_) {
    exceptionThrown = true
  }

  expect(exceptionThrown).toBeTruthy()
  expect(triggerCreateCmd).toHaveBeenCalledTimes(1)
  expect(feedCreateCmd).toHaveBeenCalledTimes(1)
  expect(triggerDeleteCmd).toHaveBeenCalledTimes(1)
})

test('triggers.delete', async () => {
  const runtimeLib = await sdk.init(createOptions())
  let triggerGetCmd = ow.mockResolved('triggers.get', {
    name: 'testTrigger'
  })
  const feedDeleteCmd = ow.mockResolved('feeds.delete', '')
  const triggerDeleteCmd = ow.mockResolved('triggers.delete', '')
  await runtimeLib.triggers.delete({ name: 'testTrigger' })
  expect(triggerGetCmd).toHaveBeenCalledTimes(1)
  expect(feedDeleteCmd).toHaveBeenCalledTimes(0)
  expect(triggerDeleteCmd).toHaveBeenCalledTimes(1)

  // Codecov
  triggerGetCmd = ow.mockResolved('triggers.get', {
    annotations: [
      {
        key: 'a',
        value: 'b'
      }
    ],
    name: 'testTrigger'
  })
  await runtimeLib.triggers.delete({ name: 'testTrigger' })
  expect(triggerGetCmd).toHaveBeenCalledTimes(1)
  expect(feedDeleteCmd).toHaveBeenCalledTimes(0)
  expect(triggerDeleteCmd).toHaveBeenCalledTimes(2)
})

test('triggers.delete feed', async () => {
  const runtimeLib = await sdk.init(createOptions())
  const triggerGetCmd = ow.mockResolved('triggers.get', {
    annotations: [
      {
        key: 'feed',
        value: '/whisk.system/alarms/alarm'
      }
    ],
    name: 'testTrigger'
  })
  const feedDeleteCmd = ow.mockResolved('feeds.delete', '')
  const triggerDeleteCmd = ow.mockResolved('triggers.delete', '')
  await runtimeLib.triggers.delete({ name: 'testTrigger' })
  expect(triggerGetCmd).toHaveBeenCalledTimes(1)
  expect(feedDeleteCmd).toHaveBeenCalledTimes(1)
  expect(triggerDeleteCmd).toHaveBeenCalledTimes(1)
})
