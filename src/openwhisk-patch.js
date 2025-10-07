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

/**
 * This patches the Openwhisk client to handle a tunneling issue with openwhisk > v3.0.0
 * See https://github.com/tomas/needle/issues/406
 * 
 * Once openwhisk.js supports the use_proxy_from_env_var option (for needle), we can remove this patch.
 * 
 * @param {object} ow 
 * @param {boolean} use_proxy_from_env_var
 * @returns {object} the patched openwhisk object
 */
function patchOWForTunnelingIssue(ow, use_proxy_from_env_var) {
  // we must set proxy to null here if agent is set, since it was already
  //  internally initialzed in Openwhisk with the proxy url from env vars
  const agentIsSet = ow.actions.client.options.agent !== null
  if (agentIsSet && use_proxy_from_env_var === false) {
    ow.actions.client.options.proxy = undefined; 
  }

  // The issue is patching openwhisk.js to use use_proxy_from_env_var (a needle option) - the contribution process might take too long.
  // monkey-patch client.params: patch one, all the rest should be patched (shared client)
  // we wrap the original params to add the use_proxy_from_env_var boolean
  const originalParams = ow.actions.client.params.bind(ow.actions.client)
  ow.actions.client.params = function(...args) {
    return originalParams(...args).then(params => {
      params.use_proxy_from_env_var = use_proxy_from_env_var;
      return params;
    }).catch(err => {
      console.error('Error patching openwhisk client params: ', err)
      throw err
    })
  }

  return ow
}


module.exports = {
  patchOWForTunnelingIssue
}
