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

# Adobe I/O Runtime Lib

[![Version](https://img.shields.io/npm/v/@adobe/aio-lib-runtime.svg)](https://npmjs.org/package/@adobe/aio-lib-runtime)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-lib-runtime.svg)](https://npmjs.org/package/@adobe/aio-lib-runtime)
![Node.js CI](https://github.com/adobe/aio-lib-runtime/workflows/Node.js%20CI/badge.svg)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-lib-runtime/master.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-lib-runtime/)

## Installing

```bash
npm install @adobe/aio-lib-runtime
```

## Usage

1) Initialize the SDK

    ```javascript
    const sdk = require('@adobe/aio-lib-runtime')

    async function sdkTest() {
      //initialize sdk
      const client = await sdk.init('<tenant>', 'x-api-key', '<valid auth token>')
    }
    ```

2) Call methods using the initialized SDK

    ```javascript
    const sdk = require('@adobe/aio-lib-runtime')

    async function sdkTest() {
      // initialize sdk
      const client = await sdk.init('<tenant>', 'x-api-key', '<valid auth token>')

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

{{>main-index~}}
{{>all-docs~}}

## Insecure Connection

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 <your_call_here>
```

Prepend the `NODE_TLS_REJECT_UNAUTHORIZED` [environment variable](https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue) and `0` value to the call that invokes your function, on the command line. This will ignore any certificate errors when connecting to the Openwhisk server. Usage of this is not recommended, but may be necesary in certain corporate environments.

## Debug Logs

```bash
LOG_LEVEL=debug <your_call_here>
```

Prepend the `LOG_LEVEL` environment variable and `debug` value to the call that invokes your function, on the command line. This should output a lot of debug data for your SDK calls.

## Contributing

Contributions are welcome! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
