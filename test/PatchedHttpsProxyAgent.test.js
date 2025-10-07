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

const { HttpsProxyAgent } = require('https-proxy-agent')
const PatchedHttpsProxyAgent = require('../src/PatchedHttpsProxyAgent')

jest.mock('https-proxy-agent')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('constructor', () => {
  test('should call parent constructor with proxyUrl and opts', () => {
    const proxyUrl = 'https://proxy.example.com:8080'
    const req = { url: 'https://example.com' }
    const constructorOpts = { hostname: 'example.com', port: 443 }
    const connectOpts = { some: 'value' }

    const patchedAgent = new PatchedHttpsProxyAgent(proxyUrl, constructorOpts)

    patchedAgent.connect(req, connectOpts)
    expect(patchedAgent.savedOpts).toBe(constructorOpts)

    expect(HttpsProxyAgent.prototype.connect).toHaveBeenCalledWith(req, {
      ...constructorOpts,
      keepAliveInitialDelay: 1000,
      keepAlive: true,
      ...connectOpts
    })
  })
})
