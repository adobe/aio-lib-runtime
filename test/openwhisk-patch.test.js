/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { patchOWForTunnelingIssue } = require('../src/openwhisk-patch')

describe('openwhisk-patch', () => {
  let mockOWClient
  let originalConsoleError

  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    originalConsoleError = console.error
    console.error = jest.fn()

    // Create a mock OpenWhisk client with the expected structure
    mockOWClient = {
      actions: {
        client: {
          options: {
            agent: null,
            proxy: 'http://proxy.example.com:8080'
          },
          params: jest.fn()
        }
      }
    }
  })

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError
    jest.clearAllMocks()
  })

  describe('patchOWForTunnelingIssue', () => {
    test('should return the same OpenWhisk client object', () => {
      const result = patchOWForTunnelingIssue(mockOWClient, false)
      expect(result).toBe(mockOWClient)
    })

    test('should set proxy to undefined when agent is set and use_proxy_from_env_var is false', () => {
      // Set agent to a non-null value
      mockOWClient.actions.client.options.agent = { mock: 'agent' }

      patchOWForTunnelingIssue(mockOWClient, false)

      expect(mockOWClient.actions.client.options.proxy).toBeUndefined()
    })

    test('should not modify proxy when agent is null', () => {
      // agent is already null by default
      const originalProxy = mockOWClient.actions.client.options.proxy

      patchOWForTunnelingIssue(mockOWClient, false)

      expect(mockOWClient.actions.client.options.proxy).toBe(originalProxy)
    })

    test('should not modify proxy when agent is set but use_proxy_from_env_var is true', () => {
      // Set agent to a non-null value
      mockOWClient.actions.client.options.agent = { mock: 'agent' }
      const originalProxy = mockOWClient.actions.client.options.proxy

      patchOWForTunnelingIssue(mockOWClient, true)

      expect(mockOWClient.actions.client.options.proxy).toBe(originalProxy)
    })

    test('should not modify proxy when agent is set and use_proxy_from_env_var is undefined', () => {
      // Set agent to a non-null value
      mockOWClient.actions.client.options.agent = { mock: 'agent' }
      const originalProxy = mockOWClient.actions.client.options.proxy

      patchOWForTunnelingIssue(mockOWClient, undefined)

      expect(mockOWClient.actions.client.options.proxy).toBe(originalProxy)
    })

    test('should patch params function to add use_proxy_from_env_var parameter', async () => {
      const mockParams = { existing: 'param' }
      const mockOriginalParams = jest.fn().mockResolvedValue(mockParams)
      mockOWClient.actions.client.params = mockOriginalParams

      patchOWForTunnelingIssue(mockOWClient, true)

      // Call the patched params function
      const result = await mockOWClient.actions.client.params('arg1', 'arg2')

      // Verify original params was called with correct arguments
      expect(mockOriginalParams).toHaveBeenCalledWith('arg1', 'arg2')

      // Verify the result includes the use_proxy_from_env_var parameter
      expect(result).toEqual({
        existing: 'param',
        use_proxy_from_env_var: true
      })
    })

    test('should patch params function with use_proxy_from_env_var set to false', async () => {
      const mockParams = { existing: 'param' }
      const mockOriginalParams = jest.fn().mockResolvedValue(mockParams)
      mockOWClient.actions.client.params = mockOriginalParams

      patchOWForTunnelingIssue(mockOWClient, false)

      // Call the patched params function
      const result = await mockOWClient.actions.client.params()

      // Verify the result includes the use_proxy_from_env_var parameter set to false
      expect(result).toEqual({
        existing: 'param',
        use_proxy_from_env_var: false
      })
    })

    test('should handle params function error and re-throw it', async () => {
      const mockError = new Error('Original params error')
      const mockOriginalParams = jest.fn().mockRejectedValue(mockError)
      mockOWClient.actions.client.params = mockOriginalParams

      patchOWForTunnelingIssue(mockOWClient, true)

      // Call the patched params function and expect it to throw
      await expect(mockOWClient.actions.client.params()).rejects.toThrow('Original params error')

      // Verify console.error was called
      expect(console.error).toHaveBeenCalledWith('Error patching openwhisk client params: ', mockError)
    })

    test('should preserve original params function binding', () => {
      const originalParams = jest.fn().mockResolvedValue({})
      mockOWClient.actions.client.params = originalParams

      patchOWForTunnelingIssue(mockOWClient, true)

      // Verify the params function is now a different function (patched)
      expect(mockOWClient.actions.client.params).not.toBe(originalParams)
      expect(typeof mockOWClient.actions.client.params).toBe('function')
    })

    test('should handle multiple calls to patchOWForTunnelingIssue', () => {
      // First call
      const firstResult = patchOWForTunnelingIssue(mockOWClient, false)
      const firstPatchedParams = mockOWClient.actions.client.params

      // Second call
      const secondResult = patchOWForTunnelingIssue(mockOWClient, true)
      const secondPatchedParams = mockOWClient.actions.client.params

      // Both calls should return the same client object
      expect(firstResult).toBe(secondResult)
      expect(firstResult).toBe(mockOWClient)

      // The params function should be patched (different from original)
      expect(typeof firstPatchedParams).toBe('function')
      expect(typeof secondPatchedParams).toBe('function')
    })

    test('should handle edge case with undefined use_proxy_from_env_var', async () => {
      const mockParams = { existing: 'param' }
      const mockOriginalParams = jest.fn().mockResolvedValue(mockParams)
      mockOWClient.actions.client.params = mockOriginalParams

      patchOWForTunnelingIssue(mockOWClient, undefined)

      const result = await mockOWClient.actions.client.params()

      expect(result).toEqual({
        existing: 'param',
        use_proxy_from_env_var: undefined
      })
    })

    test('should handle edge case with null use_proxy_from_env_var', async () => {
      const mockParams = { existing: 'param' }
      const mockOriginalParams = jest.fn().mockResolvedValue(mockParams)
      mockOWClient.actions.client.params = mockOriginalParams

      patchOWForTunnelingIssue(mockOWClient, null)

      const result = await mockOWClient.actions.client.params()

      expect(result).toEqual({
        existing: 'param',
        use_proxy_from_env_var: null
      })
    })

    test('should handle complex params object', async () => {
      const complexParams = {
        nested: {
          object: {
            with: 'values'
          }
        },
        array: [1, 2, 3],
        boolean: true,
        number: 42
      }
      const mockOriginalParams = jest.fn().mockResolvedValue(complexParams)
      mockOWClient.actions.client.params = mockOriginalParams

      patchOWForTunnelingIssue(mockOWClient, true)

      const result = await mockOWClient.actions.client.params()

      expect(result).toEqual({
        ...complexParams,
        use_proxy_from_env_var: true
      })
    })
  })
})
