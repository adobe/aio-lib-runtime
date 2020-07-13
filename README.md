<!--
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
-->

[![Version](https://img.shields.io/npm/v/@adobe/aio-lib-runtime.svg)](https://npmjs.org/package/@adobe/aio-lib-runtime)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-lib-runtime.svg)](https://npmjs.org/package/@adobe/aio-lib-runtime)
[![Build Status](https://travis-ci.com/adobe/aio-lib-runtime.svg?branch=master)](https://travis-ci.com/adobe/aio-lib-runtime)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![Greenkeeper badge](https://badges.greenkeeper.io/adobe/aio-lib-runtime.svg)](https://greenkeeper.io/)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-lib-runtime/master.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-lib-runtime/)

# Adobe I/O Runtime Lib

### Installing

```bash
$ npm install @adobe/aio-lib-runtime
```

### Usage
1) Initialize the SDK

```javascript
const sdk = require('@adobe/aio-lib-runtime')

async function sdkTest() {
  //initialize sdk
  const client = await sdk.init({ apihost: 'apihost', api_key: 'api_key'})
}
```

2) Call methods using the initialized SDK

```javascript
const sdk = require('@adobe/aio-lib-runtime')

async function sdkTest() {
  // initialize sdk
  const client = await sdk.init({ apihost: 'apihost', api_key: 'api_key'})

  // call methods
  try {
    // get... something
    const result = await client.getSomething({})
    console.log(result)

  } catch (e) {
    console.error(e)
  }
}
```

## Classes

<dl>
<dt><a href="#RuntimeAPI">RuntimeAPI</a></dt>
<dd><p>This class provides methods to call your RuntimeAPI APIs.
Before calling any method initialize the instance by calling the <code>init</code> method on it
with valid options argument</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#createKeyValueObjectFromArray">createKeyValueObjectFromArray(inputsArray)</a> ⇒ <code>object</code></dt>
<dd><p>returns key value pairs in an object from the key value array supplied. Used to create parameters object</p>
</dd>
<dt><a href="#init">init(options)</a> ⇒ <code><a href="#OpenwhiskClient">Promise.&lt;OpenwhiskClient&gt;</a></code></dt>
<dd><p>Returns a Promise that resolves with a new RuntimeAPI object.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#OpenwhiskOptions">OpenwhiskOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#OpenwhiskClient">OpenwhiskClient</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="RuntimeAPI"></a>

## RuntimeAPI
This class provides methods to call your RuntimeAPI APIs.
Before calling any method initialize the instance by calling the `init` method on it
with valid options argument

**Kind**: global class  
<a name="RuntimeAPI+init"></a>

### runtimeAPI.init(options) ⇒ [<code>Promise.&lt;OpenwhiskClient&gt;</code>](#OpenwhiskClient)
Initializes a RuntimeAPI object and returns it.

**Kind**: instance method of [<code>RuntimeAPI</code>](#RuntimeAPI)  
**Returns**: [<code>Promise.&lt;OpenwhiskClient&gt;</code>](#OpenwhiskClient) - a RuntimeAPI object  

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>OpenwhiskOptions</code>](#OpenwhiskOptions) | options for initialization |

<a name="createKeyValueObjectFromArray"></a>

## createKeyValueObjectFromArray(inputsArray) ⇒ <code>object</code>
returns key value pairs in an object from the key value array supplied. Used to create parameters object

**Kind**: global function  
**Returns**: <code>object</code> - An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}  

| Param | Type | Description |
| --- | --- | --- |
| inputsArray | <code>Array</code> | Array in the form of [{'key':'key1', 'value': 'value1'}] |

<a name="init"></a>

## init(options) ⇒ [<code>Promise.&lt;OpenwhiskClient&gt;</code>](#OpenwhiskClient)
Returns a Promise that resolves with a new RuntimeAPI object.

**Kind**: global function  
**Returns**: [<code>Promise.&lt;OpenwhiskClient&gt;</code>](#OpenwhiskClient) - a Promise with a RuntimeAPI object  

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>OpenwhiskOptions</code>](#OpenwhiskOptions) | options for initialization |

<a name="OpenwhiskOptions"></a>

## OpenwhiskOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| apihost | <code>string</code> | Hostname and optional port for openwhisk platform |
| api_key | <code>string</code> | Authorisation key |
| [api] | <code>string</code> | Full API URL |
| [apiversion] | <code>string</code> | Api version |
| [namespace] | <code>string</code> | Namespace for resource requests |
| [ignore_certs] | <code>boolean</code> | Turns off server SSL/TLS certificate verification |
| [key] | <code>string</code> | Client key to use when connecting to the apihost |

<a name="OpenwhiskClient"></a>

## OpenwhiskClient : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| actions | <code>ow.Actions</code> | actions |
| activations | <code>ow.Activations</code> | activations |
| namespaces | <code>ow.Namespaces</code> | namespaces |
| packages | <code>ow.Packages</code> | packages |
| rules | <code>ow.Rules</code> | rules |
| triggers | <code>ow.Triggers</code> | triggers |
| routes | <code>ow.Routes</code> | routes |

### Debug Logs

```bash
LOG_LEVEL=debug <your_call_here>
```

Prepend the `LOG_LEVEL` environment variable and `debug` value to the call that invokes your function, on the command line. This should output a lot of debug data for your SDK calls.

### Contributing

Contributions are welcome! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

### Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
