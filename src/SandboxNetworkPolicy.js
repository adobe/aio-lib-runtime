/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// ---------------------------------------------------------------------------
// Pre-built network policies for common services.
//
// Each entry is a frozen { egress: [...] } object that can be passed directly
// as the `network` field when creating a sandbox:
//
//   policy: { network: NetworkPolicy.base }
//
// Modelled after https://github.com/NVIDIA/OpenShell-Community/blob/main/sandboxes/base/policy.yaml
// ---------------------------------------------------------------------------

const freeze = obj => Object.freeze({ egress: Object.freeze(obj.egress) })

// -- AI / LLM providers ----------------------------------------------------

const anthropic = freeze({
  egress: [
    { host: 'api.anthropic.com', port: 443 },
    { host: 'statsig.anthropic.com', port: 443 },
    { host: 'sentry.io', port: 443 }
  ]
})

// -- GitHub -----------------------------------------------------------------

const github = freeze({
  egress: [
    { host: 'github.com', port: 443 },
    { host: 'api.github.com', port: 443 },
    { host: 'objects.githubusercontent.com', port: 443 },
    { host: 'raw.githubusercontent.com', port: 443 },
    { host: 'release-assets.githubusercontent.com', port: 443 }
  ]
})

const githubCopilot = freeze({
  egress: [
    { host: 'github.com', port: 443 },
    { host: 'api.github.com', port: 443 },
    { host: 'api.githubcopilot.com', port: 443 },
    { host: 'api.enterprise.githubcopilot.com', port: 443 },
    { host: 'release-assets.githubusercontent.com', port: 443 },
    { host: 'copilot-proxy.githubusercontent.com', port: 443 },
    { host: 'default.exp-tas.com', port: 443 }
  ]
})

// -- Package registries -----------------------------------------------------

const pypi = freeze({
  egress: [
    { host: 'pypi.org', port: 443 },
    { host: 'files.pythonhosted.org', port: 443 },
    { host: 'downloads.python.org', port: 443 }
  ]
})

const npm = freeze({
  egress: [
    { host: 'registry.npmjs.org', port: 443 }
  ]
})

// -- AI coding tools --------------------------------------------------------

const opencode = freeze({
  egress: [
    { host: 'opencode.ai', port: 443 },
    { host: 'integrate.api.nvidia.com', port: 443 }
  ]
})

// -- IDEs / editors ---------------------------------------------------------

const vscode = freeze({
  egress: [
    { host: 'update.code.visualstudio.com', port: 443 },
    { host: 'az764295.vo.msecnd.net', port: 443 },
    { host: 'vscode.download.prss.microsoft.com', port: 443 },
    { host: 'marketplace.visualstudio.com', port: 443 },
    { host: 'gallerycdn.vsassets.io', port: 443 }
  ]
})

const cursor = freeze({
  egress: [
    { host: 'cursor.blob.core.windows.net', port: 443 },
    { host: 'api2.cursor.sh', port: 443 },
    { host: 'repo.cursor.sh', port: 443 },
    { host: 'download.cursor.sh', port: 443 },
    { host: 'cursor.download.prss.microsoft.com', port: 443 }
  ]
})

// ---------------------------------------------------------------------------
// Base — GitHub + PyPI + npm + Anthropic
// ---------------------------------------------------------------------------

const base = freeze({
  egress: [
    ...github.egress,
    ...pypi.egress,
    ...npm.egress,
    ...anthropic.egress
  ]
})

module.exports = Object.freeze({
  anthropic,
  github,
  githubCopilot,
  opencode,
  pypi,
  npm,
  vscode,
  cursor,
  base
})
