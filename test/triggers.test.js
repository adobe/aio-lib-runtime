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

const Triggers = require('../src/triggers')
const { createKeyValueObjectFromArray } = require('../src/utils')

// Mock dependencies
jest.mock('../src/utils')
jest.mock('lodash.clonedeep')

const cloneDeep = require('lodash.clonedeep')

describe('Triggers', () => {
  let triggers
  let mockOWClient

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create mock OpenWhisk client
    mockOWClient = {
      triggers: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn()
      },
      feeds: {
        create: jest.fn(),
        delete: jest.fn()
      }
    }

    // Create Triggers instance
    triggers = new Triggers(mockOWClient)

    // Mock cloneDeep to return a modified copy
    cloneDeep.mockImplementation((obj) => {
      if (!obj) return obj
      return JSON.parse(JSON.stringify(obj))
    })

    // Mock createKeyValueObjectFromArray
    createKeyValueObjectFromArray.mockImplementation((arr) => {
      if (!arr) return {}
      const result = {}
      arr.forEach(item => {
        if (item && item.key !== undefined && item.key !== null && item.key !== '') {
          result[item.key] = item.value
        }
      })
      return result
    })
  })

  describe('constructor', () => {
    test('should store the OpenWhisk client', () => {
      expect(triggers.owclient).toBe(mockOWClient)
    })
  })

  describe('create', () => {
    test('should create a trigger without feed', async () => {
      const options = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger'
        }
      }

      const expectedResult = { name: 'testTrigger', created: true }
      mockOWClient.triggers.create.mockResolvedValue(expectedResult)

      const result = await triggers.create(options)

      expect(cloneDeep).toHaveBeenCalledWith(options)
      expect(mockOWClient.triggers.create).toHaveBeenCalledWith(options)
      expect(result).toBe(expectedResult)
    })

    test('should create a trigger with feed', async () => {
      const options = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger',
          feed: '/whisk.system/alarms/alarm',
          parameters: [
            { key: 'cron', value: '0 0 1 * *' },
            { key: 'trigger_payload', value: 'test' }
          ]
        }
      }

      const expectedResult = { name: 'testTrigger', created: true }
      mockOWClient.triggers.create.mockResolvedValue(expectedResult)
      mockOWClient.feeds.delete.mockResolvedValue({})
      mockOWClient.feeds.create.mockResolvedValue({})

      const result = await triggers.create(options)

      // Verify cloneDeep was called
      expect(cloneDeep).toHaveBeenCalledWith(options)

      // Verify trigger creation with feed annotation
      const expectedTriggerOptions = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger',
          feed: '/whisk.system/alarms/alarm',
          parameters: [
            { key: 'cron', value: '0 0 1 * *' },
            { key: 'trigger_payload', value: 'test' }
          ],
          annotations: [
            { key: 'feed', value: '/whisk.system/alarms/alarm' }
          ]
        }
      }
      expect(mockOWClient.triggers.create).toHaveBeenCalledWith(expectedTriggerOptions)

      // Verify feed operations
      expect(mockOWClient.feeds.delete).toHaveBeenCalledWith({
        name: '/whisk.system/alarms/alarm',
        trigger: 'testTrigger'
      })
      expect(mockOWClient.feeds.create).toHaveBeenCalledWith({
        name: '/whisk.system/alarms/alarm',
        trigger: 'testTrigger',
        params: { cron: '0 0 1 * *', trigger_payload: 'test' }
      })

      expect(result).toBe(expectedResult)
    })

    test('should create a trigger with feed and existing annotations', async () => {
      const options = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger',
          feed: '/whisk.system/alarms/alarm',
          annotations: [
            { key: 'existing', value: 'annotation' }
          ]
        }
      }

      const expectedResult = { name: 'testTrigger', created: true }
      mockOWClient.triggers.create.mockResolvedValue(expectedResult)
      mockOWClient.feeds.delete.mockResolvedValue({})
      mockOWClient.feeds.create.mockResolvedValue({})

      const result = await triggers.create(options)

      // Verify trigger creation with both existing and feed annotations
      const expectedTriggerOptions = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger',
          feed: '/whisk.system/alarms/alarm',
          annotations: [
            { key: 'existing', value: 'annotation' },
            { key: 'feed', value: '/whisk.system/alarms/alarm' }
          ]
        }
      }
      expect(mockOWClient.triggers.create).toHaveBeenCalledWith(expectedTriggerOptions)

      expect(result).toBe(expectedResult)
    })

    test('should handle feed creation error and clean up trigger', async () => {
      const options = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger',
          feed: '/whisk.system/alarms/alarm'
        }
      }

      const triggerResult = { name: 'testTrigger', created: true }
      const feedError = new Error('Feed creation failed')

      mockOWClient.triggers.create.mockResolvedValue(triggerResult)
      mockOWClient.feeds.delete.mockResolvedValue({})
      mockOWClient.feeds.create.mockRejectedValue(feedError)
      mockOWClient.triggers.delete.mockResolvedValue({})

      await expect(triggers.create(options)).rejects.toThrow('Feed creation failed')

      // Verify trigger was created
      expect(mockOWClient.triggers.create).toHaveBeenCalledTimes(1)

      // Verify feed operations
      expect(mockOWClient.feeds.delete).toHaveBeenCalledTimes(1)
      expect(mockOWClient.feeds.create).toHaveBeenCalledTimes(1)

      // Verify trigger cleanup
      const expectedCleanupOptions = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger',
          feed: '/whisk.system/alarms/alarm',
          annotations: [
            { key: 'feed', value: '/whisk.system/alarms/alarm' }
          ]
        }
      }
      expect(mockOWClient.triggers.delete).toHaveBeenCalledWith(expectedCleanupOptions)
    })

    test('should handle feed delete error gracefully', async () => {
      const options = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger',
          feed: '/whisk.system/alarms/alarm'
        }
      }

      const expectedResult = { name: 'testTrigger', created: true }
      const deleteError = new Error('Feed delete failed')

      mockOWClient.triggers.create.mockResolvedValue(expectedResult)
      mockOWClient.feeds.delete.mockRejectedValue(deleteError)
      mockOWClient.feeds.create.mockResolvedValue({})

      const result = await triggers.create(options)

      // Verify feed delete was attempted but error was ignored
      expect(mockOWClient.feeds.delete).toHaveBeenCalledTimes(1)

      // Verify feed create still succeeded
      expect(mockOWClient.feeds.create).toHaveBeenCalledTimes(1)

      // Verify result is returned
      expect(result).toBe(expectedResult)
    })

    test('should handle null/undefined options', async () => {
      const expectedResult = { created: true }
      mockOWClient.triggers.create.mockResolvedValue(expectedResult)

      const result = await triggers.create(null)

      expect(cloneDeep).toHaveBeenCalledWith(null)
      expect(mockOWClient.triggers.create).toHaveBeenCalledWith(null)
      expect(result).toBe(expectedResult)
    })

    test('should handle options without trigger property', async () => {
      const options = {
        name: 'testTrigger'
      }

      const expectedResult = { name: 'testTrigger', created: true }
      mockOWClient.triggers.create.mockResolvedValue(expectedResult)

      const result = await triggers.create(options)

      expect(mockOWClient.triggers.create).toHaveBeenCalledWith(options)
      expect(result).toBe(expectedResult)
    })

    test('should handle trigger without feed property', async () => {
      const options = {
        name: 'testTrigger',
        trigger: {
          name: 'testTrigger'
        }
      }

      const expectedResult = { name: 'testTrigger', created: true }
      mockOWClient.triggers.create.mockResolvedValue(expectedResult)

      const result = await triggers.create(options)

      expect(mockOWClient.triggers.create).toHaveBeenCalledWith(options)
      expect(result).toBe(expectedResult)
    })
  })

  describe('delete', () => {
    test('should delete a trigger without feed annotations', async () => {
      const options = { name: 'testTrigger' }
      const triggerInfo = {
        name: 'testTrigger',
        annotations: [
          { key: 'other', value: 'annotation' }
        ]
      }
      const deleteResult = { deleted: true }

      mockOWClient.triggers.get.mockResolvedValue(triggerInfo)
      mockOWClient.triggers.delete.mockResolvedValue(deleteResult)

      const result = await triggers.delete(options)

      expect(mockOWClient.triggers.get).toHaveBeenCalledWith(options)
      expect(mockOWClient.triggers.delete).toHaveBeenCalledWith(options)
      expect(mockOWClient.feeds.delete).not.toHaveBeenCalled()
      expect(result).toBe(deleteResult)
    })

    test('should delete a trigger with feed annotations', async () => {
      const options = { name: 'testTrigger' }
      const triggerInfo = {
        name: 'testTrigger',
        annotations: [
          { key: 'other', value: 'annotation' },
          { key: 'feed', value: '/whisk.system/alarms/alarm' },
          { key: 'another', value: 'annotation' }
        ]
      }
      const deleteResult = { deleted: true }

      mockOWClient.triggers.get.mockResolvedValue(triggerInfo)
      mockOWClient.feeds.delete.mockResolvedValue({})
      mockOWClient.triggers.delete.mockResolvedValue(deleteResult)

      const result = await triggers.delete(options)

      expect(mockOWClient.triggers.get).toHaveBeenCalledWith(options)
      expect(mockOWClient.feeds.delete).toHaveBeenCalledWith({
        name: '/whisk.system/alarms/alarm',
        trigger: 'testTrigger'
      })
      expect(mockOWClient.triggers.delete).toHaveBeenCalledWith(options)
      expect(result).toBe(deleteResult)
    })

    test('should delete a trigger with multiple feed annotations', async () => {
      const options = { name: 'testTrigger' }
      const triggerInfo = {
        name: 'testTrigger',
        annotations: [
          { key: 'feed', value: '/whisk.system/alarms/alarm1' },
          { key: 'other', value: 'annotation' },
          { key: 'feed', value: '/whisk.system/alarms/alarm2' }
        ]
      }
      const deleteResult = { deleted: true }

      mockOWClient.triggers.get.mockResolvedValue(triggerInfo)
      mockOWClient.feeds.delete.mockResolvedValue({})
      mockOWClient.triggers.delete.mockResolvedValue(deleteResult)

      const result = await triggers.delete(options)

      expect(mockOWClient.triggers.get).toHaveBeenCalledWith(options)
      expect(mockOWClient.feeds.delete).toHaveBeenCalledTimes(2)
      expect(mockOWClient.feeds.delete).toHaveBeenCalledWith({
        name: '/whisk.system/alarms/alarm1',
        trigger: 'testTrigger'
      })
      expect(mockOWClient.feeds.delete).toHaveBeenCalledWith({
        name: '/whisk.system/alarms/alarm2',
        trigger: 'testTrigger'
      })
      expect(mockOWClient.triggers.delete).toHaveBeenCalledWith(options)
      expect(result).toBe(deleteResult)
    })

    test('should delete a trigger without annotations', async () => {
      const options = { name: 'testTrigger' }
      const triggerInfo = {
        name: 'testTrigger'
      }
      const deleteResult = { deleted: true }

      mockOWClient.triggers.get.mockResolvedValue(triggerInfo)
      mockOWClient.triggers.delete.mockResolvedValue(deleteResult)

      const result = await triggers.delete(options)

      expect(mockOWClient.triggers.get).toHaveBeenCalledWith(options)
      expect(mockOWClient.feeds.delete).not.toHaveBeenCalled()
      expect(mockOWClient.triggers.delete).toHaveBeenCalledWith(options)
      expect(result).toBe(deleteResult)
    })

    test('should handle trigger get error', async () => {
      const options = { name: 'testTrigger' }
      const getError = new Error('Trigger not found')

      mockOWClient.triggers.get.mockRejectedValue(getError)

      await expect(triggers.delete(options)).rejects.toThrow('Trigger not found')

      expect(mockOWClient.triggers.get).toHaveBeenCalledWith(options)
      expect(mockOWClient.feeds.delete).not.toHaveBeenCalled()
      expect(mockOWClient.triggers.delete).not.toHaveBeenCalled()
    })

    test('should handle feed delete error', async () => {
      const options = { name: 'testTrigger' }
      const triggerInfo = {
        name: 'testTrigger',
        annotations: [
          { key: 'feed', value: '/whisk.system/alarms/alarm' }
        ]
      }
      const feedError = new Error('Feed delete failed')
      const deleteResult = { deleted: true }

      mockOWClient.triggers.get.mockResolvedValue(triggerInfo)
      mockOWClient.feeds.delete.mockRejectedValue(feedError)
      mockOWClient.triggers.delete.mockResolvedValue(deleteResult)

      await expect(triggers.delete(options)).rejects.toThrow('Feed delete failed')

      expect(mockOWClient.triggers.get).toHaveBeenCalledWith(options)
      expect(mockOWClient.feeds.delete).toHaveBeenCalledTimes(1)
      expect(mockOWClient.triggers.delete).not.toHaveBeenCalled()
    })

    test('should handle trigger delete error', async () => {
      const options = { name: 'testTrigger' }
      const triggerInfo = {
        name: 'testTrigger',
        annotations: [
          { key: 'feed', value: '/whisk.system/alarms/alarm' }
        ]
      }
      const deleteError = new Error('Trigger delete failed')

      mockOWClient.triggers.get.mockResolvedValue(triggerInfo)
      mockOWClient.feeds.delete.mockResolvedValue({})
      mockOWClient.triggers.delete.mockRejectedValue(deleteError)

      await expect(triggers.delete(options)).rejects.toThrow('Trigger delete failed')

      expect(mockOWClient.triggers.get).toHaveBeenCalledWith(options)
      expect(mockOWClient.feeds.delete).toHaveBeenCalledTimes(1)
      expect(mockOWClient.triggers.delete).toHaveBeenCalledWith(options)
    })
  })
})
