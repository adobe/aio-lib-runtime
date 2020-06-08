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
const Triggers = require('../src/triggers')
const ow = require('openwhisk')()
// /////////////////////////////////////////////

const gApiHost = 'test-host'
const gApiKey = 'test-apikey'

// /////////////////////////////////////////////

const createOptions = () => {
  return {
    api_key: gApiKey,
    apihost: gApiHost
  }
}

const createSdkClient = async () => {
  return sdk.init(createOptions())
}

// /////////////////////////////////////////////

beforeEach(() => {
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

test('proxy functionality', async () => {
  const runtimeLib = await sdk.init(createOptions())
  // Call a function that is not proxied
  ow.mockResolved('triggers.list', '')
  expect(typeof runtimeLib.triggers.list).toBe('function')

  // Proxied function
  expect(runtimeLib.triggers.create).toBe(Triggers.prototype.create)
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
  await runtimeLib.triggers.create({ name: 'testTrigger', trigger: { feed: '/whisk.system/alarms/alarm' } })
    .catch(() => {
      expect(triggerCreateCmd).toHaveBeenCalledTimes(1)
      expect(feedCreateCmd).toHaveBeenCalledTimes(1)
      expect(triggerDeleteCmd).toHaveBeenCalledTimes(1)
    })
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
