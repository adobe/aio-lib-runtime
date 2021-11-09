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

/* global ow, LogForwarding */

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
 */
