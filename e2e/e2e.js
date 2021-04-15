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

const sdk = require('../src/index')
const path = require('path')
const deepClone = require('lodash.clonedeep')
const fs = require.requireActual('fs-extra')
jest.unmock('openwhisk')
jest.unmock('archiver')
jest.setTimeout(30000)

// load .env values in the e2e folder, if any
require('dotenv').config({ path: path.join(__dirname, '.env') })

let sdkClient = {}
let config = {}
const apiKey = process.env['RuntimeAPI_API_KEY']
const apihost = process.env['RuntimeAPI_APIHOST'] || 'https://adobeioruntime.net'
const namespace = process.env['RuntimeAPI_NAMESPACE']
// console.log(apiKey)

beforeAll(async () => {
  sdkClient = await sdk.init({ api_key: apiKey, apihost })
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

describe('build-actions', () => {
  test('full config', async () => {
    expect(await sdk.buildActions(config)).toEqual(expect.arrayContaining([
      expect.stringContaining('action.zip'),
      expect.stringContaining('action-zip.zip')
    ]))
    expect(fs.readdirSync(path.resolve(config.actions.dist))).toEqual(expect.arrayContaining(['action-temp', 'action-zip-temp', 'action-zip.zip', 'action.zip']))
    fs.emptydirSync(config.actions.dist)
    fs.rmdirSync(config.actions.dist)
  })
})

describe('build, deploy, invoke and undeploy of actions', () => {
  test('basic manifest', async () => {
    // console.log(config)
    // Build
    expect(await sdk.buildActions(config)).toEqual(expect.arrayContaining([
      expect.stringContaining('action.zip'),
      expect.stringContaining('action-zip.zip')
    ]))

    // Deploy
    config.root = path.resolve('./')
    const deployedEntities = await sdk.deployActions(config)
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

    // Undeploy
    await sdk.undeployActions(config)
    actions = await sdkClient.actions.list({ limit: 1 })
    if (actions.length > 0) {
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
    // console.log(config)
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
      expect(actions[0].name).not.toEqual('action')
    }
  })

  test('basic manifest with filter', async () => {
    // console.log(config)
    // Build
    expect(await sdk.buildActions(config, ['action'])).toEqual([expect.stringContaining('action.zip')])

    // Deploy
    config.root = path.resolve('./')
    const deployedEntities = await sdk.deployActions(config, { filterEntities: { actions: ['action'] } })
    expect(deployedEntities.actions.length).toBe(1)
    expect(deployedEntities.actions[0].url.endsWith('.adobeio-static.net/api/v1/web/sample-app-1.0.0/action')).toEqual(true)

    // Cleanup build files
    fs.emptydirSync(config.actions.dist)
    fs.rmdirSync(config.actions.dist)

    // Verify actions created in openwhisk
    const actions = await sdkClient.actions.list({ limit: 3 })
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'action', namespace: expect.stringContaining('/sample-app-1.0.0') })]))
    await sdkClient.actions.invoke('sample-app-1.0.0/action')
  })
})

describe('print logs', () => {
  test('basic', async () => {
    const logs = []
    const storeLogs = (str) => { logs.push(str) }
    const retResult = await sdk.printActionLogs(config, storeLogs, 1, [], false, false)
    // expect(logs[1]).toEqual(expect.stringContaining('stdout: hello'))
    expect(typeof retResult).toEqual('object')
  })
})

test('triggers', async () => {
  // Delete non existing trigger
  const call = sdkClient.triggers.delete({ name: 'e2eTrigger' })
  await expect(call).rejects.toThrow('The requested resource does not exist')

  // Create
  expect(await sdkClient.triggers.create({ name: 'e2eTrigger' })).toEqual(expect.objectContaining({ name: 'e2eTrigger', version: '0.0.1' }))
  // Get
  expect(await sdkClient.triggers.get({ name: 'e2eTrigger' })).toEqual(expect.objectContaining({ name: 'e2eTrigger', version: '0.0.1' }))
  // Delete
  expect(await sdkClient.triggers.delete({ name: 'e2eTrigger' })).toEqual(expect.objectContaining({ name: 'e2eTrigger', version: '0.0.1' }))
})

test('triggers with feed', async () => {
  // Create
  expect(await sdkClient.triggers.create({ name: 'e2eTrigger', trigger: { feed: '/whisk.system/alarms/alarm', parameters: [{ key: 'cron', value: '* * * * *' }] } })).toEqual(expect.objectContaining({ name: 'e2eTrigger', version: '0.0.1', annotations: expect.arrayContaining([expect.objectContaining({ key: 'feed' })]) }))
  // Get
  expect(await sdkClient.triggers.get({ name: 'e2eTrigger' })).toEqual(expect.objectContaining({ name: 'e2eTrigger', version: '0.0.1' }))
  // Delete
  expect(await sdkClient.triggers.delete({ name: 'e2eTrigger' })).toEqual(expect.objectContaining({ name: 'e2eTrigger', version: '0.0.1' }))
})
