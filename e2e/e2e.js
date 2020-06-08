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

// load .env values in the e2e folder, if any
require('dotenv').config({ path: path.join(__dirname, '.env') })

let sdkClient = {}
const apiKey = process.env['RuntimeAPI_API_KEY']
const apihost = process.env['RuntimeAPI_APIHOST']

beforeAll(async () => {
  sdkClient = await sdk.init({ api_key: apiKey, apihost })
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
