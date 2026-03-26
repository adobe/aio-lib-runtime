# Sandbox Quickstart

## Install

```bash
npm install github:adobe/aio-lib-runtime#agent-sandboxes
```

## Init

```js
const { init } = require('@adobe/aio-lib-runtime')

const runtime = await init({
  apihost: process.env.AIO_RUNTIME_APIHOST,
  namespace: process.env.AIO_RUNTIME_NAMESPACE,
  api_key: process.env.AIO_RUNTIME_AUTH
})
```

## Create Sandbox

```js
const { SandboxNetworkPolicy } = require('@adobe/aio-lib-runtime')

const sandbox = await runtime.compute.sandbox.create({
  name: 'my-sandbox',
  type: 'cpu:nodejs',
  workspace: 'workspace',
  maxLifetime: 3600,
  envs: {
    API_KEY: 'your-api-key'
  },
  policy: {
    network: SandboxNetworkPolicy.base
  }
})
```

## Get Status

```js
const status = await runtime.compute.sandbox.getStatus(sandbox.id)
console.log('status:', status)
```

## Exec

```js
const result = await sandbox.exec('ls -al', { timeout: 10000 })
console.log('stdout:', result.stdout.trim())
console.log('exit code:', result.exitCode)
```

## File Management

```js
const script = `console.log('hello from sandbox script', process.version)\n`
await sandbox.writeFile('hello.js', script)

const content = await sandbox.readFile('hello.js')
console.log('readFile content:', content.trim())

const entries = await sandbox.listFiles('.')
console.log('listFiles entries:', entries)
```

## Exec a File

```js
const result = await sandbox.exec('node hello.js', { timeout: 10000 })
console.log('stdout:', result.stdout.trim())
console.log('stderr:', result.stderr.trim())
console.log('exit code:', result.exitCode)
```

## Curl a Site

```js
const result = await sandbox.exec('curl -s --connect-timeout 5 -o /dev/null -w "%{http_code}" https://github.com', { timeout: 10000 })
console.log(`  github.com   (allowed) → HTTP ${result.stdout.trim()}`)
```

## Destroy

```js
await sandbox.destroy()
```
