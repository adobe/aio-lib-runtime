/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const sdk = require('../src/index')
const path = require('path')
const deepClone = require('lodash.clonedeep')
const { utils } = require('../src')
const fs = jest.requireActual('fs-extra')
const { createHttpsProxy } = require('@adobe/aio-lib-test-proxy')

jest.unmock('node-fetch')
jest.unmock('fs')
jest.unmock('fs-extra')
jest.unmock('fs/promises')
jest.unmock('openwhisk')
jest.unmock('archiver')
jest.setTimeout(60000)

// load .env values in the e2e folder, if any
require('dotenv').config({ path: path.join(__dirname, '.env') })

let proxyServer
let sdkClient = {}
let config = {}
const apiKey = process.env['RuntimeAPI_API_KEY']
const apihost = process.env['RuntimeAPI_APIHOST'] || 'https://adobeioruntime.net'
const namespace = process.env['RuntimeAPI_NAMESPACE']
const E2E_USE_PROXY = process.env.E2E_USE_PROXY
const HTTPS_PROXY = process.env.HTTPS_PROXY

beforeAll(async () => {
  if (E2E_USE_PROXY) {
    proxyServer = await createHttpsProxy()
    console.log(`Using test proxy at ${proxyServer.url}`)
  }

  sdkClient = await sdk.init({ api_key: apiKey, apihost })
})

afterAll(() => {
  if (proxyServer) {
    proxyServer.stop()
  }
})

beforeEach(() => {
  config = deepClone(global.sampleAppConfig)
  config.ow.namespace = namespace
  config.ow.auth = apiKey
  config.root = path.resolve('./test/__fixtures__/sample-app')
  config.actions.src = path.resolve(config.root + '/' + config.actions.src)
  config.actions.dist = path.resolve(config.root + '/' + config.actions.dist)
  config.manifest.src = path.resolve(config.root + '/' + 'manifest.yml')
})

// eslint-disable-next-line jest/expect-expect
test('HTTPS_PROXY must be set if E2E_USE_PROXY is set', () => {
  // jest wraps process.env, so libraries will not pick up an env change via code change, so it has to be set on the shell level
  if (E2E_USE_PROXY) {
    if (!HTTPS_PROXY) {
      throw new Error(`If you set E2E_USE_PROXY, you must set the HTTPS_PROXY environment variable. Please set it to HTTPS_PROXY=${proxyServer.url}.`)
    }
  }
})

describe('build, deploy, invoke and undeploy of actions', () => {
  test('basic manifest', async () => {
    utils.dumpActionsBuiltInfo = jest.fn(() => false)

    // Build
    expect(await sdk.buildActions(config, null, true)).toEqual(expect.arrayContaining([
      expect.stringContaining('action.zip'),
      expect.stringContaining('action-zip.zip')
    ]))

    // Deploy
    config.root = path.resolve('./')
    const deployedEntities = await sdk.deployActions(config, { useForce: true })
    expect(deployedEntities.actions[0].url.endsWith('.adobeio-static.net/api/v1/web/sample-app-1.0.0/action')).toEqual(true)
    expect(deployedEntities.actions[1].url.endsWith('.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-zip')).toEqual(true)
    expect(deployedEntities.actions[2].url.endsWith('.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-sequence')).toEqual(true)

    // Cleanup build files
    fs.emptydirSync(config.actions.dist)
    fs.rmdirSync(config.actions.dist)

    // Verify actions created in openwhisk
    let actions = await sdkClient.actions.list({ limit: 3 })
    expect(actions).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'action-sequence', namespace: expect.stringContaining('/sample-app-1.0.0') }),
      expect.objectContaining({ name: 'action-zip', namespace: expect.stringContaining('/sample-app-1.0.0') }),
      expect.objectContaining({ name: 'action', namespace: expect.stringContaining('/sample-app-1.0.0') })]))
    await sdkClient.actions.invoke('sample-app-1.0.0/action')

    // Verify apis are created in openwhisk
    const basepath = 'base'
    const relpath = 'path'
    const { apis } = await sdkClient.routes.list({ basepath, relpath })

    expect(apis.length).toEqual(1)
    expect(apis[0].value.apidoc.basePath).toEqual(`/${basepath}`)
    expect(apis[0].value.apidoc.info.title).toEqual('api1')
    expect(apis[0].value.apidoc.paths[`/${relpath}`].get).toEqual(expect.any(Object))

    // we can't test the reachability of the API paths below because it may take up
    // to 5 mins for an API to be available:
    // https://adobedocs.github.io/adobeio-runtime/guides/creating_rest_apis.html#how-long-does-it-take-to-createupdate-an-api

    // const api = apis[0]
    // const paths = api.value.apidoc.paths
    // for (const key of Object.keys(paths)) {
    //   if (!key.startsWith('/')) {
    //     return
    //   }

    //   const { createFetch } = require('@adobe/aio-lib-core-networking')
    //   const path = paths[key]
    //   for (const verb of Object.keys(path)) {
    //     const fetch = createFetch()
    //     const url = `${api.value.gwApiUrl}${key}`
    //     console.log('testing API Url:', url)
    //     const response = await fetch(url, { method: verb })
    //     console.log('API Url response status:', response.status)
    //     expect(response.status).not.toEqual(404)
    //   }
    // }

    // Undeploy
    await sdk.undeployActions(config)
    actions = await sdkClient.actions.list({ limit: 1 })
    if (actions.length > 0) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(actions[0].name).not.toEqual('action-sequence')
    }
  })

  test('manifest with includes', async () => {
    config = deepClone(global.sampleAppIncludesConfig)
    config.ow.namespace = namespace
    config.ow.auth = apiKey
    config.root = path.resolve('./test/__fixtures__/sample-app-includes')
    config.actions.src = path.resolve(config.root + '/' + config.actions.src)
    config.actions.dist = path.resolve(config.root + '/' + config.actions.dist)
    config.manifest.src = path.resolve(config.root + '/' + 'manifest.yml')

    // Build
    expect(await sdk.buildActions(config)).toEqual(expect.arrayContaining([
      expect.stringContaining('action.zip')
    ]))

    // Deploy
    config.root = path.resolve('./')
    const deployedEntities = await sdk.deployActions(config)
    expect(deployedEntities.actions[0].url.endsWith('.adobeio-static.net/api/v1/web/sample-app-include-1.0.0/action')).toEqual(true)

    // Cleanup build files
    fs.emptydirSync(config.actions.dist)
    fs.rmdirSync(config.actions.dist)

    // Verify actions created in openwhisk
    let actions = await sdkClient.actions.list({ limit: 3 })
    expect(actions).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'action', namespace: expect.stringContaining('/sample-app-include-1.0.0') })]))
    await sdkClient.actions.invoke('sample-app-include-1.0.0/action')

    // Undeploy
    await sdk.undeployActions(config)
    actions = await sdkClient.actions.list({ limit: 1 })
    if (actions.length > 0) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(actions[0].name).not.toEqual('action')
    }
  })

  test('manifest with default package', async () => {
    config = deepClone(global.sampleAppReducedDefaultPackageConfig)
    config.ow.namespace = namespace
    config.ow.auth = apiKey
    config.root = path.resolve('./test/__fixtures__/sample-app-reduced-default-package')
    config.actions.src = path.resolve(config.root + '/' + config.actions.src)
    config.actions.dist = path.resolve(config.root + '/' + config.actions.dist)
    config.manifest.src = path.resolve(config.root + '/' + 'manifest.yml')

    // Build
    expect(await sdk.buildActions(config)).toEqual(expect.arrayContaining([
      expect.stringContaining('action.zip')
    ]))

    // Deploy
    config.root = path.resolve('./')
    const deployedEntities = await sdk.deployActions(config)
    // action is not behind CDN since we don't have static assets
    expect(deployedEntities.actions[0].url.endsWith('.adobeioruntime.net/api/v1/web/default/action')).toEqual(true)

    // Cleanup build files
    fs.emptydirSync(config.actions.dist)
    fs.rmdirSync(config.actions.dist)

    // Verify actions created in openwhisk
    let actions = await sdkClient.actions.list({ limit: 3 })
    expect(actions).toEqual(expect.arrayContaining([expect.objectContaining({
      name: 'action',
      namespace: expect.not.stringContaining('/default') // if it's the default package, it won't show in the namespace property
    })]))
    await sdkClient.actions.invoke('action')

    // Undeploy
    await sdk.undeployActions(config)
    actions = await sdkClient.actions.list({ limit: 1 })
    if (actions.length > 0) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(actions[0].name).not.toEqual('action')
    }
  })

  test('basic manifest with filter', async () => {
    // Build
    expect(await sdk.buildActions(config, ['action'], true)).toEqual([expect.stringContaining('action.zip')])

    // Deploy
    config.root = path.resolve('./')
    const deployedEntities = await sdk.deployActions(config, { filterEntities: { actions: ['action'] } })
    expect(deployedEntities.actions.length).toBe(1)
    expect(deployedEntities.actions[0].url.endsWith('.adobeio-static.net/api/v1/web/sample-app-1.0.0/action')).toEqual(true)

    // Cleanup build files
    fs.emptydirSync(config.actions.dist)
    fs.rmdirSync(config.actions.dist)

    // Verify actions created in openwhisk
    let actions = await sdkClient.actions.list({ limit: 3 })
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'action', namespace: expect.stringContaining('/sample-app-1.0.0') })]))
    await sdkClient.actions.invoke('sample-app-1.0.0/action')

    // NOTE: undeploy does not have a corresponding filterEntities, we do a quick manual filter
    delete config.manifest.full.packages.__APP_PACKAGE__.rules.rule1
    delete config.manifest.package.rules.rule1

    // Undeploy
    await sdk.undeployActions(config)
    actions = await sdkClient.actions.list({ limit: 1 })
    if (actions.length > 0) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(actions[0].name).not.toEqual('action')
    }
  })
})

describe('print logs', () => {
  test('basic', async () => {
    const logs = []
    const storeLogs = (str) => { logs.push(str) }
    // Runtime waits for about 60 secs to return a 503 when it cannot serve the request.
    try {
      const retResult = await sdk.printActionLogs(config, storeLogs, 1, [], false, false)
      expect(typeof retResult).toEqual('object')
    } catch (err) {
      // If the request was not successful, it has to be a 503 from Runtime.
      expect(typeof err).toEqual('object') // eslint-disable-line jest/no-conditional-expect
      expect(err.message).toEqual(expect.stringContaining('503')) // eslint-disable-line jest/no-conditional-expect
      expect(err.message).toEqual(expect.stringContaining('Service Unavailable')) // eslint-disable-line jest/no-conditional-expect
    }
  }, 100000)
})

describe('trigger', () => {
  test('delete non-existing', async () => {
    const now = new Date()
    const triggerName = `e2eTrigger${now.getTime()}`

    // Delete non existing trigger
    const call = sdkClient.triggers.delete({ name: triggerName })
    await expect(call).rejects.toThrow('The requested resource does not exist')
  })

  test('basic', async () => {
    const now = new Date()
    const triggerName = `e2eTrigger${now.getTime()}`

    // Create
    expect(await sdkClient.triggers.create({ name: triggerName })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1' }))
    // Get
    expect(await sdkClient.triggers.get({ name: triggerName })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1' }))
    // Delete
    expect(await sdkClient.triggers.delete({ name: triggerName })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1' }))
  })

  test('with feed /whisk.system/alarms/alarm', async () => {
    const now = new Date()
    const triggerName = `e2eTrigger${now.getTime()}`

    // Create
    expect(await sdkClient.triggers.create({ name: triggerName, trigger: { feed: '/whisk.system/alarms/alarm', parameters: [{ key: 'cron', value: '* * * * *' }] } })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1', annotations: expect.arrayContaining([expect.objectContaining({ key: 'feed' })]) }))
    // Get
    expect(await sdkClient.triggers.get({ name: triggerName })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1' }))
    // Delete
    expect(await sdkClient.triggers.delete({ name: triggerName })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1' }))
  })

  test('with feed /whisk.system/alarms/once', async () => {
    const now = new Date()
    const triggerName = `e2eTrigger${now.getTime()}`

    // add 1 day. "now" is 1 day later. need this for the future alarm
    now.setDate(now.getDate() + 1)

    // Create
    expect(await sdkClient.triggers.create({ name: triggerName, trigger: { feed: '/whisk.system/alarms/once', parameters: [{ key: 'date', value: now.toISOString() }] } })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1', annotations: expect.arrayContaining([expect.objectContaining({ key: 'feed' })]) }))
    // Get
    expect(await sdkClient.triggers.get({ name: triggerName })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1' }))
    // Delete
    expect(await sdkClient.triggers.delete({ name: triggerName })).toEqual(expect.objectContaining({ name: triggerName, version: '0.0.1' }))
  })
})

describe('filter manifest based on built actions', () => {
  test('it should build & deploy just one of two.', async () => {
    // Prepare
    const fileData = JSON.stringify({ 'action-zip': 1632317755882 })
    fs.readFile = jest.fn(() => (fileData))
    const deployConfig = {
      filterEntities: {
        byBuiltActions: true
      },
      useForce: true
    }
    // Build
    const buildResult = await sdk.buildActions(config, null, true)
    console.log('buildResult = ', buildResult)
    expect(buildResult).toEqual(expect.arrayContaining([
      expect.stringContaining('action.zip')
    ]))

    // Deploy
    config.root = path.resolve('./')
    console.log('making the call')
    const deployedEntities = await sdk.deployActions(config, deployConfig)
    console.log('deployedEntities = ', deployedEntities)
    expect(deployedEntities.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'sample-app-1.0.0/action' }),
      expect.objectContaining({ name: 'sample-app-1.0.0/action-sequence' })
    ]))

    // Undeploy
    await sdk.undeployActions(config)
    const actions = await sdkClient.actions.list({ limit: 1 })
    if (actions.length > 0) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(actions[0].name).not.toEqual('action-sequence')
    }
  })
})
