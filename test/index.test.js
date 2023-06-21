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
const { getProxyForUrl } = require('proxy-from-env')

jest.mock('proxy-from-env')

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
