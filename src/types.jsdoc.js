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

/* global ow, LogForwarding, ComputeAPI */

/**
 * @typedef {object} OpenwhiskOptions
 * @property {string} apihost Hostname and optional port for openwhisk platform
 * @property {string} api_key Authorisation key
 * @property {string} [api] Full API URL
 * @property {string} [apiversion] Api version
 * @property {string} [namespace] Namespace for resource requests
 * @property {boolean} [ignore_certs] Turns off server SSL/TLS certificate verification
 * @property {string} [key] Client key to use when connecting to the apihost
 * @property {OpenwhiskRetryOptions} [retry] the retry options. Defaults to 2 retries, with a 200ms minTimeout.
 */

/**
 * @typedef {object} OpenwhiskRetryOptions
 * @property {number} retries the number of retries for an OpenWhisk call
 * @property {number} minTimeout the minimum number of milliseconds to wait before a retry
 */

/**
 * @typedef {object} OpenwhiskClient
 * @property {ow.Actions} actions actions
 * @property {ow.Activations} activations activations
 * @property {ow.Namespaces} namespaces namespaces
 * @property {ow.Packages} packages packages
 * @property {ow.Rules} rules rules
 * @property {ow.Triggers} triggers triggers
 * @property {ow.Routes} routes routes
 * @property {LogForwarding} logForwarding Log Forwarding management API
 * @property {ComputeAPI} compute Compute management API
 * @property {OpenwhiskOptions} initOptions init options
 */

/**
 * @typedef {object} L7Rule
 * @property {string[]} methods - HTTP methods to allow (e.g. ['GET', 'POST'])
 * @property {string} pathPattern - URL path pattern to match (e.g. '/repos/**')
 */

/**
 * @typedef {object} EgressRule
 * @property {string} host - FQDN, wildcard FQDN (*.domain), IP address, or CIDR range
 * @property {number} port - Destination port (1-65535)
 * @property {string} [protocol='TCP'] - 'TCP' or 'UDP'
 * @property {L7Rule[]} [rules] - Optional L7 HTTP rules; when present, only matching method+path combinations are allowed
 */

/**
 * @typedef {object} NetworkPolicyOptions
 * @property {EgressRule[]|'allow-all'} [egress] - Allowed outbound endpoints, or 'allow-all' to permit all egress
 */

/**
 * @typedef {object} PolicyOptions
 * @property {NetworkPolicyOptions} [network] - Network policy configuration
 */

/**
 * @typedef {object} SandboxCreateOptions
 * @property {string} name sandbox display name
 * @property {string} [cluster] target cluster
 * @property {string} [region] target region (e.g. "va6", "aus3")
 * @property {string} [workspace] sandbox workspace
 * @property {string|object} [size] sandbox size tier
 * @property {string} [type] sandbox runtime type
 * @property {number} [maxLifetime] maximum lifetime in seconds
 * @property {object} [envs] environment variables
 * @property {PolicyOptions} [policy] - Network policy for the sandbox. When omitted, default-deny applies (DNS + NATS only).
 */

/**
 * @typedef {object} SandboxSize
 * @property {string} cpu requested CPU
 * @property {string} memory requested memory
 * @property {number} gpu requested GPU count
 */

/**
 * @typedef {object} SandboxSizes
 * @property {SandboxSize} SMALL small sandbox size
 * @property {SandboxSize} MEDIUM medium sandbox size
 * @property {SandboxSize} LARGE large sandbox size
 * @property {SandboxSize} XLARGE extra large sandbox size
 */

/**
 * @typedef {object} SandboxExecOptions
 * @property {function(string): void} [onOutput] output callback
 * @property {number} [timeout] client-side timeout in milliseconds
 * @property {string|Buffer} [stdin] data to send to stdin and close automatically
 */

/**
 * @typedef {object} SandboxExecResult
 * @property {string} execId execution id
 * @property {string} stdout stdout output
 * @property {string} stderr stderr output
 * @property {number} exitCode process exit code
 */

/**
 * @typedef {object} SandboxFileEntry
 * @property {string} name file or directory name
 * @property {'file'|'dir'} type entry type
 * @property {number} [size] file size in bytes (present for files)
 */
