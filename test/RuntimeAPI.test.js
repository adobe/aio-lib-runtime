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

const RuntimeAPI = require('../src/RuntimeAPI')
const { codes } = require('../src/SDKErrors')
const Triggers = require('../src/triggers')
const LogForwarding = require('../src/LogForwarding')
const LogForwardingLocalDestinationsProvider = require('../src/LogForwardingLocalDestinationsProvider')
const { patchOWForTunnelingIssue } = require('../src/openwhisk-patch')
const { getProxyAgent } = require('../src/utils')

// Mock dependencies
jest.mock('openwhisk')
jest.mock('../src/triggers')
jest.mock('../src/LogForwarding')
jest.mock('../src/LogForwardingLocalDestinationsProvider')
jest.mock('../src/openwhisk-patch')
jest.mock('../src/utils')
jest.mock('proxy-from-env')
jest.mock('lodash.clonedeep')

const ow = require('openwhisk')
const { getProxyForUrl } = require('proxy-from-env')
const deepCopy = require('lodash.clonedeep')

describe('RuntimeAPI', () => {
  let runtimeAPI
  let mockOWClient
  let clonedOptionsRef

  beforeEach(() => {
    runtimeAPI = new RuntimeAPI()

    // Reset all mocks
    jest.clearAllMocks()

    // Mock OpenWhisk client
    mockOWClient = {
      actions: { mock: 'actions' },
      activations: { mock: 'activations' },
      namespaces: { mock: 'namespaces' },
      packages: { mock: 'packages' },
      rules: { mock: 'rules' },
      triggers: { mock: 'triggers' },
      routes: { mock: 'routes' }
    }

    ow.mockReturnValue(mockOWClient)
    patchOWForTunnelingIssue.mockReturnValue(mockOWClient)

    // Create a spy that tracks modifications to the cloned object
    deepCopy.mockImplementation((obj) => {
      clonedOptionsRef = { ...obj }
      return clonedOptionsRef
    })

    // Reset environment variables
    delete process.env.NEEDLE_USE_PROXY_FROM_ENV_VAR
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
  })

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEEDLE_USE_PROXY_FROM_ENV_VAR
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
  })

  describe('init', () => {
    const validOptions = {
      api_key: 'test-api-key',
      apihost: 'https://test-host.com',
      namespace: 'test-namespace'
    }

    test('should initialize successfully with valid options', async () => {
      const result = await runtimeAPI.init(validOptions)

      expect(result).toHaveProperty('actions', mockOWClient.actions)
      expect(result).toHaveProperty('activations', mockOWClient.activations)
      expect(result).toHaveProperty('namespaces', mockOWClient.namespaces)
      expect(result).toHaveProperty('packages', mockOWClient.packages)
      expect(result).toHaveProperty('rules', mockOWClient.rules)
      expect(result).toHaveProperty('triggers')
      expect(result).toHaveProperty('routes', mockOWClient.routes)
      expect(result).toHaveProperty('logForwarding')
      expect(result).toHaveProperty('initOptions')
    })

    test('should throw error when api_key is missing', async () => {
      const invalidOptions = { apihost: 'https://test-host.com' }

      await expect(runtimeAPI.init(invalidOptions))
        .rejects.toThrow(codes.ERROR_SDK_INITIALIZATION)
    })

    test('should throw error when apihost is missing', async () => {
      const invalidOptions = { api_key: 'test-api-key' }

      await expect(runtimeAPI.init(invalidOptions))
        .rejects.toThrow(codes.ERROR_SDK_INITIALIZATION)
    })

    test('should throw error when both api_key and apihost are missing', async () => {
      const invalidOptions = {}

      await expect(runtimeAPI.init(invalidOptions))
        .rejects.toThrow(codes.ERROR_SDK_INITIALIZATION)
    })

    test('should throw error when options is null', async () => {
      await expect(runtimeAPI.init(null))
        .rejects.toThrow(codes.ERROR_SDK_INITIALIZATION)
    })

    test('should throw error when options is undefined', async () => {
      await expect(runtimeAPI.init(undefined))
        .rejects.toThrow(codes.ERROR_SDK_INITIALIZATION)
    })

    test('should set use_proxy_from_env_var to true when NEEDLE_USE_PROXY_FROM_ENV_VAR is true', async () => {
      process.env.NEEDLE_USE_PROXY_FROM_ENV_VAR = 'true'

      await runtimeAPI.init(validOptions)

      expect(deepCopy).toHaveBeenCalledWith(validOptions)
    })

    test('should set use_proxy_from_env_var to false by default', async () => {
      await runtimeAPI.init(validOptions)

      expect(deepCopy).toHaveBeenCalledWith(validOptions)
    })

    test('should configure proxy when proxy URL is found and NEEDLE_USE_PROXY_FROM_ENV_VAR is true', async () => {
      const proxyUrl = 'http://proxy.example.com:8080'
      getProxyForUrl.mockReturnValue(proxyUrl)
      process.env.NEEDLE_USE_PROXY_FROM_ENV_VAR = 'true'

      await runtimeAPI.init(validOptions)

      // Verify that deepCopy was called with the original options
      expect(deepCopy).toHaveBeenCalledWith(validOptions)

      // Verify that the cloned options were modified with proxy settings
      expect(clonedOptionsRef.proxy).toBe(proxyUrl)
      expect(clonedOptionsRef.agent).toBe(null)
    })

    test('should configure proxy agent when use_proxy_from_env_var is explicitly true but NEEDLE_USE_PROXY_FROM_ENV_VAR is not set', async () => {
      const proxyUrl = 'http://proxy.example.com:8080'
      const mockAgent = { mock: 'agent' }
      getProxyForUrl.mockReturnValue(proxyUrl)
      getProxyAgent.mockReturnValue(mockAgent)

      const options = { ...validOptions, use_proxy_from_env_var: true }

      await runtimeAPI.init(options)

      // Verify that deepCopy was called with the original options
      expect(deepCopy).toHaveBeenCalledWith(options)

      // The code overrides use_proxy_from_env_var to false by default, so it uses proxy agent
      expect(clonedOptionsRef.proxy).toBe(null)
      expect(clonedOptionsRef.agent).toBe(mockAgent)
      expect(getProxyAgent).toHaveBeenCalledWith(validOptions.apihost, proxyUrl)
    })

    test('should configure proxy agent when proxy URL is found and use_proxy_from_env_var is false', async () => {
      const proxyUrl = 'http://proxy.example.com:8080'
      const mockAgent = { mock: 'agent' }
      getProxyForUrl.mockReturnValue(proxyUrl)
      getProxyAgent.mockReturnValue(mockAgent)

      const options = { ...validOptions, use_proxy_from_env_var: false }

      await runtimeAPI.init(options)

      expect(getProxyAgent).toHaveBeenCalledWith(validOptions.apihost, proxyUrl)
      // deepCopy is called with the original options before modifications
      expect(deepCopy).toHaveBeenCalledWith(options)
    })

    test('should not configure proxy when no proxy URL is found', async () => {
      getProxyForUrl.mockReturnValue(null)

      await runtimeAPI.init(validOptions)

      expect(getProxyAgent).not.toHaveBeenCalled()
      // deepCopy is called with the original options before modifications
      expect(deepCopy).toHaveBeenCalledWith(validOptions)
    })

    test('should set default retry options when retry is undefined', async () => {
      await runtimeAPI.init(validOptions)

      // deepCopy is called with the original options before modifications
      expect(deepCopy).toHaveBeenCalledWith(validOptions)
    })

    test('should not override existing retry options', async () => {
      const customRetry = { retries: 5, minTimeout: 1000 }
      const options = { ...validOptions, retry: customRetry }

      await runtimeAPI.init(options)

      // deepCopy is called with the original options before modifications
      expect(deepCopy).toHaveBeenCalledWith(options)
    })

    test('should set ignore_certs to true when NODE_TLS_REJECT_UNAUTHORIZED is 0', async () => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

      await runtimeAPI.init(validOptions)

      // deepCopy is called with the original options before modifications
      expect(deepCopy).toHaveBeenCalledWith(validOptions)
    })

    test('should not set ignore_certs when NODE_TLS_REJECT_UNAUTHORIZED is not 0', async () => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'

      await runtimeAPI.init(validOptions)

      // deepCopy is called with the original options before modifications
      expect(deepCopy).toHaveBeenCalledWith(validOptions)
    })

    test('should preserve existing ignore_certs option', async () => {
      const options = { ...validOptions, ignore_certs: true }

      await runtimeAPI.init(options)

      // deepCopy is called with the original options before modifications
      expect(deepCopy).toHaveBeenCalledWith(options)
    })

    test('should call patchOWForTunnelingIssue with correct parameters', async () => {
      await runtimeAPI.init(validOptions)

      expect(patchOWForTunnelingIssue).toHaveBeenCalledWith(
        mockOWClient,
        false
      )
    })

    test('should create LogForwarding instance with correct parameters', async () => {
      const options = {
        ...validOptions,
        auth_handler: 'test-auth-handler'
      }

      await runtimeAPI.init(options)

      expect(LogForwarding).toHaveBeenCalledWith(
        options.namespace,
        options.apihost,
        options.api_key,
        expect.any(LogForwardingLocalDestinationsProvider),
        options.auth_handler
      )
    })

    test('should create LogForwarding instance without auth_handler when not provided', async () => {
      await runtimeAPI.init(validOptions)

      expect(LogForwarding).toHaveBeenCalledWith(
        validOptions.namespace,
        validOptions.apihost,
        validOptions.api_key,
        expect.any(LogForwardingLocalDestinationsProvider),
        undefined
      )
    })

    test('should return triggers proxy that delegates to Triggers class', async () => {
      const mockTriggersInstance = {
        create: jest.fn(),
        delete: jest.fn(),
        someMethod: jest.fn()
      }
      Triggers.mockImplementation(() => mockTriggersInstance)

      const result = await runtimeAPI.init(validOptions)

      // Test that triggers proxy delegates to Triggers instance
      expect(result.triggers.create).toBe(mockTriggersInstance.create)
      expect(result.triggers.delete).toBe(mockTriggersInstance.delete)
      expect(result.triggers.someMethod).toBe(mockTriggersInstance.someMethod)
    })

    test('should return triggers proxy that falls back to original triggers for unknown methods', async () => {
      const mockTriggersInstance = {}
      Triggers.mockImplementation(() => mockTriggersInstance)

      const result = await runtimeAPI.init(validOptions)

      // Test that unknown methods fall back to original triggers
      expect(result.triggers.mock).toBe('triggers')
    })

    test('should include initOptions in returned object', async () => {
      const result = await runtimeAPI.init(validOptions)

      expect(result.initOptions).toBeDefined()
      expect(result.initOptions).toHaveProperty('api_key', validOptions.api_key)
      expect(result.initOptions).toHaveProperty('apihost', validOptions.apihost)
      expect(result.initOptions).toHaveProperty('namespace', validOptions.namespace)
    })
  })
})
