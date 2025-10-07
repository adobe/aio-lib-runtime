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

/**
 * HttpsProxyAgent needs a patch for TLS connections.
 * It doesn't pass in the original options during a SSL connect.
 *
 * See https://github.com/TooTallNate/proxy-agents/issues/89
 * @private
 */
class PatchedHttpsProxyAgent extends HttpsProxyAgent {
  constructor (proxyUrl, opts) {
    super(proxyUrl, opts)
    this.savedOpts = opts
  }

  async connect (req, opts) {
    return super.connect(req, { 
      ...this.savedOpts, 
      keepAliveInitialDelay: 1000, 
      keepAlive: true, 
      ...opts
    })
  }
}

module.exports = PatchedHttpsProxyAgent
