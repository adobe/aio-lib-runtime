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

const ow = require('openwhisk')()
const fs = require('fs-extra')
const cloneDeep = require('lodash.clonedeep')
const os = require('os')
const path = require('path')
const archiver = require('archiver')
const networking = require('@adobe/aio-lib-core-networking')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-lib-runtime:utils', { provider: 'debug', level: process.env.LOG_LEVEL })
networking.createFetch = jest.fn()
const mockFetch = jest.fn()
networking.createFetch.mockReturnValue(mockFetch)
jest.mock('archiver')
jest.mock('@adobe/aio-lib-core-networking')
jest.mock('globby')

const utils = require('../src/utils')
const activationLog = { logs: ['2020-06-25T05:50:23.641Z       stdout: logged from action code'] }
const owPackage = 'packages.update'
const owAction = 'actions.update'
const owAPI = 'routes.create'
const owTriggers = 'triggers.update'
const owRules = 'rules.update'
const owActionDel = 'actions.delete'
const owPackageDel = 'packages.delete'
const owRulesDel = 'rules.delete'
const owTriggerDel = 'triggers.delete'
const owAPIDel = 'routes.delete'
const owInitOptions = 'initOptions'

const libEnv = require('@adobe/aio-lib-env')
const { STAGE_ENV, PROD_ENV } = jest.requireActual('@adobe/aio-lib-env')
jest.mock('@adobe/aio-lib-env')

beforeEach(() => {
  const json = {
    'file.json': global.fixtureFile('/trigger/parameters.json'),
    'hello.js': global.fixtureFile('/deploy/hello.js'),
    'goodbye.js': global.fixtureFile('/deploy/goodbye.js'),
    'basic_manifest.json': global.fixtureFile('/deploy/basic_manifest.json'),
    'basic_manifest_unsupported_kind.json': global.fixtureFile('/deploy/basic_manifest_unsupported_kind.json'),
    'basic_manifest_res.json': global.fixtureFile('/deploy/basic_manifest_res.json'),
    'pkgparam_manifest_res.json': global.fixtureFile('/deploy/pkgparam_manifest_res.json'),
    'pkgparam_manifest_res_multi.json': global.fixtureFile('/deploy/pkgparam_manifest_res_multi.json'),
    'basic_manifest_res_namesonly.json': global.fixtureFile('/deploy/basic_manifest_res_namesonly.json')
  }
  global.fakeFileSystem.addJson(json)
  mockFetch.mockReset()
})

afterEach(() => {
  // reset back to normal
  global.fakeFileSystem.reset()
})

describe('utils has the right functions', () => {
  test('exports', () => {
    expect(typeof utils).toEqual('object')
    expect(typeof utils.createKeyValueArrayFromFile).toEqual('function')
    expect(typeof utils.createKeyValueArrayFromFlag).toEqual('function')
    expect(typeof utils.createKeyValueObjectFromFile).toEqual('function')
    expect(typeof utils.createKeyValueObjectFromFlag).toEqual('function')
    expect(typeof utils.getKeyValueArrayFromMergedParameters).toEqual('function')
    expect(typeof utils.getKeyValueObjectFromMergedParameters).toEqual('function')
    expect(typeof utils.parsePathPattern).toEqual('function')

    expect(typeof utils.createKeyValueObjectFromArray).toEqual('function')
    expect(typeof utils.createKeyValueArrayFromObject).toEqual('function')
    expect(typeof utils.parsePackageName).toEqual('function')
    expect(typeof utils.createComponentsFromSequence).toEqual('function')
    expect(typeof utils.processInputs).toEqual('function')

    expect(typeof utils.createKeyValueInput).toEqual('function')
    expect(typeof utils.getManifestPath).toEqual('function')
    expect(typeof utils.returnUnion).toEqual('function')
    expect(typeof utils.returnDeploymentTriggerInputs).toEqual('function')
    expect(typeof utils.getDeploymentPath).toEqual('function')
    expect(typeof utils.createActionObject).toEqual('function')
    expect(typeof utils.checkWebFlags).toEqual('function')
    expect(typeof utils.createSequenceObject).toEqual('function')
    expect(typeof utils.createApiRoutes).toEqual('function')
    expect(typeof utils.returnAnnotations).toEqual('function')
    expect(typeof utils.deployPackage).toEqual('function')
    expect(typeof utils.undeployPackage).toEqual('function')
    expect(typeof utils.processPackage).toEqual('function')
    expect(typeof utils.setPaths).toEqual('function')
    expect(typeof utils.getProjectEntities).toEqual('function')
    expect(typeof utils.syncProject).toEqual('function')
    expect(typeof utils.findProjectHashOnServer).toEqual('function')
    expect(typeof utils.getProjectHash).toEqual('function')
    expect(typeof utils.addManagedProjectAnnotations).toEqual('function')
    expect(typeof utils.printLogs).toEqual('function')
    expect(typeof utils.getActionZipFileName).toEqual('function')
    expect(typeof utils.getActionNameFromZipFile).toEqual('function')
    expect(typeof utils.dumpActionsBuiltInfo).toEqual('function')
    expect(typeof utils.actionBuiltBefore).toEqual('function')
    expect(typeof utils.getSupportedServerRuntimes).toEqual('function')

    expect(utils.urlJoin).toBeDefined()
    expect(typeof utils.urlJoin).toBe('function')

    expect(utils.zip).toBeDefined()
    expect(typeof utils.zip).toBe('function')
  })
})

describe('createKeyValueArrayFromObject', () => {
  test('array of key:value (string) pairs', () => {
    const res = utils.createKeyValueArrayFromObject({ key1: 'val2' })
    expect(res).toMatchObject([{ key: 'key1', value: 'val2' }])
  })

  test('array of key:value (number) pairs', () => {
    const res = utils.createKeyValueArrayFromObject({ key1: 52 })
    expect(res).toMatchObject([{ key: 'key1', value: 52 }])
  })

  test('array of key:value (numberic string) pairs', () => {
    const res = utils.createKeyValueArrayFromObject({ key1: '52' })
    expect(res).toMatchObject([{ key: 'key1', value: '52' }])
  })

  test('not really json ... ', () => {
    const res = utils.createKeyValueArrayFromObject({ key1: '{52}' })
    expect(res).toMatchObject([{ key: 'key1', value: '{52}' }])
  })
})
describe('parsePackageName', () => {
  test('only package name', () => {
    const res = utils.parsePackageName('packagename')
    expect(res).toMatchObject({ namespace: '_', name: 'packagename' })
  })
  test('package name and namespace', () => {
    const res = utils.parsePackageName('namespace/packagename')
    expect(res).toMatchObject({ namespace: 'namespace', name: 'packagename' })
  })
  test('package name and namespace with leading slash', () => {
    const res = utils.parsePackageName('/namespace/packagename')
    expect(res).toMatchObject({ namespace: 'namespace', name: 'packagename' })
  })
  test('invalid 1', () => {
    const func = () => utils.parsePackageName('/ns/p/a')
    expect(func).toThrow(new Error('Package name is not valid'))
  })
  test('invalid 2', () => {
    const func = () => utils.parsePackageName('/ns/')
    expect(func).toThrow(new Error('Package name is not valid'))
  })
})

describe('createComponentsFromSequence', () => {
  test('sequence components', () => {
    const res = utils.createComponentsFromSequence(['a', 'p/b', '/ns/p/c', '/ns2/p/d', '/ns3/e'])
    expect(res).toMatchObject({
      kind: 'sequence',
      components: ['/_/a', '/_/p/b', '/ns/p/c', '/ns2/p/d', '/ns3/e']
    })
  })
})
/* eslint-disable no-template-curly-in-string */
describe('processInputs', () => {
  test('input = {}, params = {}', () => {
    const res = utils.processInputs({}, {})
    expect(res).toEqual({})
  })
  test('input = { a: 123 }, params = {}', () => {
    const res = utils.processInputs({ a: 123 }, {})
    expect(res).toEqual({ a: 123 })
  })
  test('input = { a: 123, b: 456 }, params = { a: 0, c: 789 }', () => {
    const res = utils.processInputs({ a: 123, b: 456 }, { a: 0 })
    expect(res).toEqual({ a: 0, b: 456 })
  })
  test('input = { I: { am: an object } }, params = { I: { am: another object } }', () => {
    const res = utils.processInputs({ I: { am: 'an object' } }, { I: { am: 'another object' } })
    expect(res).toEqual({ I: { am: 'another object' } })
  })
  test('input = { I : { value: am } }, params = { }', () => {
    const res = utils.processInputs({ I: { value: 'am' } }, { })
    expect(res).toEqual({ I: 'am' })
  })
  test('input = { I : { default: am } }, params = { }', () => {
    const res = utils.processInputs({ I: { default: 'am' } }, { })
    expect(res).toEqual({ I: 'am' })
  })
  test('input = { I : { value: am } }, params = { I : nitpicking }', () => {
    const res = utils.processInputs({ I: { value: 'am' } }, { I: 'nitpicking' })
    expect(res).toEqual({ I: 'nitpicking' })
  })
  test('input = { a : string, one : number, an: integer }, params = { }', () => {
    const res = utils.processInputs({ a: 'string', one: 'number', an: 'integer' }, { })
    expect(res).toEqual({ a: '', one: 0, an: 0 })
  })
  test('input = { an: $undefEnvVar, a: $definedEnvVar, another: $definedEnvVar, the: ${definedEnvVar}, one: ${ definedEnvVar  } }, params = { a: 123 }', () => {
    process.env.definedEnvVar = 'giraffe'
    const res = utils.processInputs({ an: '$undefEnvVar', a: '$definedEnvVar', another: '$definedEnvVar', the: '${definedEnvVar}', one: '${ definedEnvVar  }' }, { a: 123 })
    expect(res).toStrictEqual({ a: 123, another: 'giraffe', an: '', the: 'giraffe', one: 'giraffe' })
    delete process.env.definedEnvVar
  })
  test('invalid input returns undefined (coverage)', () => {
    let res = utils.processInputs({}, { a: 123 })
    expect(res).toEqual({})
    res = utils.processInputs(undefined, { a: 123 })
    expect(res).toEqual(undefined)
    res = utils.processInputs('string', { a: 123 })
    expect(res).toEqual(undefined)
  })
  test('nested input and params', () => {
    process.env.BAR = 'itWorks'
    process.env.BAR_VAR = 'barVar'
    process.env.FOO = 'fooo'
    const input = {
      a: 'I will be replaced',
      stuff: '$BAR_VAR $BAR_VAR, ${ BAR_VAR }, $FOO',
      foo: '${BAR}',
      bar: {
        default: '${BAR}, $BAR, ${FOO}'
      },
      config: {
        nestedFoo: {
          extraNested: '${BAR}, $BAR, ${FOO}'
        },
        a: 'I will not be replaced'
      }
    }
    const expectedOutput = {
      a: 123,
      stuff: 'barVar barVar, barVar, fooo',
      foo: process.env.BAR,
      bar: `${process.env.BAR}, ${process.env.BAR}, ${process.env.FOO}`,
      config: {
        nestedFoo: {
          extraNested: `${process.env.BAR}, ${process.env.BAR}, ${process.env.FOO}`
        },
        a: 'I will not be replaced'
      }
    }
    const res = utils.processInputs(input, { a: 123 })
    expect(res).toStrictEqual(expectedOutput)
    delete process.env.BAR
    delete process.env.BAR_VAR
    delete process.env.FOO
  })
})

describe('createKeyValueInput', () => {
  test('input = { a: 1, b: str, c: { d: 4 }, e: [1, 2, 3] }', () => {
    const res = utils.createKeyValueInput({ a: 1, b: 'str', c: { d: 4 }, e: [1, 2, 3] })
    expect(res).toEqual([
      { key: 'a', value: 1 },
      { key: 'b', value: 'str' },
      { key: 'c', value: { d: 4 } },
      { key: 'e', value: [1, 2, 3] }
    ])
  })
})

describe('getDeploymentPath', () => {
  let spy
  beforeEach(() => {
    spy = jest.spyOn(fs, 'existsSync')
  })

  afterEach(() => {
    spy.mockRestore()
  })
  test('no file exists', () => {
    const res = utils.getDeploymentPath()
    expect(res).toEqual(undefined)
  })

  test('./deployment.yaml exists', () => {
    spy.mockImplementation(f => f === './deployment.yaml')
    const res = utils.getDeploymentPath()
    expect(res).toEqual('deployment.yaml')
  })

  test('./deployment.yml exists', () => {
    spy.mockImplementation(f => f === './deployment.yml')
    const res = utils.getDeploymentPath()
    expect(res).toEqual('deployment.yml')
  })

  test('./deployment.yaml and ./deployment.yml exists', () => {
    spy.mockImplementation(f => f === './deployment.yaml' || f === './deployment.yml')
    const res = utils.getDeploymentPath()
    expect(res).toEqual('deployment.yaml')
  })
})

describe('getManifestPath', () => {
  let spy
  beforeEach(() => {
    spy = jest.spyOn(fs, 'existsSync')
  })

  afterEach(() => {
    spy.mockRestore()
  })

  test('no file exists', () => {
    expect(() => utils.getManifestPath()).toThrow('Manifest file not found')
  })

  test('./manifest.yaml exists', () => {
    spy.mockImplementation(f => f === './manifest.yaml')
    const res = utils.getManifestPath()
    expect(res).toEqual('manifest.yaml')
  })

  test('./manifest.yml exists', () => {
    spy.mockImplementation(f => f === './manifest.yml')
    const res = utils.getManifestPath()
    expect(res).toEqual('manifest.yml')
  })

  test('./manifest.yaml and ./manifest.yml exists', () => {
    spy.mockImplementation(f => f === './manifest.yaml' || f === './manifest.yml')
    const res = utils.getManifestPath()
    expect(res).toEqual('manifest.yaml')
  })
})

describe('returnDeploymentTriggerInputs', () => {
  test('deploymentPackages = {}', () => {
    const res = utils.returnDeploymentTriggerInputs({ })
    expect(res).toEqual({})
  })
  test('deploymentPackages = { pkg1: { actions: {} } }', () => {
    const res = utils.returnDeploymentTriggerInputs({ pkg1: { actions: {} } })
    expect(res).toEqual({})
  })
  test('deploymentPackages = { pkg1: { triggers: { a: { action: hello } } }, pkg2: { actions: {} } }', () => {
    const res = utils.returnDeploymentTriggerInputs({ pkg1: { triggers: { a: { action: 'hello' } } }, pkg2: { actions: {} } })
    expect(res).toEqual({ a: {} })
  })
  test('deploymentPackages = { pkg1: { triggers: { a: { action: hello } } }, pkg2: { triggers: { another: { inputs: { a: 1, b: str, c: [1,2,3] } } } } }', () => {
    const res = utils.returnDeploymentTriggerInputs({ pkg1: { triggers: { a: { action: 'hello' } } }, pkg2: { triggers: { another: { inputs: { a: 1, b: 'str', c: [1, 2, 3] } } } } })
    expect(res).toEqual({ a: {}, another: { a: 1, b: 'str', c: [1, 2, 3] } })
  })
})

describe('returnAnnotations', () => {
  test('action = {}', () => {
    const res = utils.returnAnnotations({})
    expect(res).toEqual({ 'raw-http': false, 'web-export': false })
  })
  test('action = { inputs: { a: 123 } }', () => {
    const res = utils.returnAnnotations({ inputs: { a: 123 } })
    expect(res).toEqual({ 'raw-http': false, 'web-export': false })
  })
  test('action = { annotations: { conductor: true } }', () => {
    const res = utils.returnAnnotations({ annotations: { conductor: true } })
    expect(res).toEqual({ 'raw-http': false, 'web-export': false, conductor: true })
  })
  test('action = { web: true, annotations: { conductor: true } }', () => {
    const res = utils.returnAnnotations({ web: true, annotations: { conductor: true } })
    expect(res).toEqual({ 'web-export': true, conductor: true })
  })
  test('action = { web: raw, annotations: { conductor: true } }', () => {
    const res = utils.returnAnnotations({ web: 'raw', annotations: { conductor: true } })
    expect(res).toEqual({ 'raw-http': true, 'web-export': true, conductor: true })
  })
  test('action = { web: yes, annotations: { raw-htttp: true } }', () => {
    const res = utils.returnAnnotations({ web: 'yes', annotations: { 'raw-http': true } })
    expect(res).toEqual({ 'raw-http': true, 'web-export': true })
  })
  test('action = { web-export: true }', () => {
    const res = utils.returnAnnotations({ 'web-export': true })
    expect(res).toEqual({ 'web-export': true })
  })
  test('action = { web: yes, annotations: { final: true } }', () => {
    const res = utils.returnAnnotations({ web: 'yes', annotations: { final: true } })
    expect(res).toEqual({ final: true, 'web-export': true })
  })
  test('action = { web: false, annotations: { final: true } }', () => {
    const res = utils.returnAnnotations({ web: false, annotations: { final: true } })
    expect(res).toEqual(expect.objectContaining({ 'web-export': false, 'raw-http': false }))
  })
  test('action = { web: false, annotations: { raw-http: true } }', () => {
    const res = utils.returnAnnotations({ web: false, annotations: { 'raw-http': true } })
    expect(res).toEqual({ 'web-export': false, 'raw-http': false })
  })
  test('action = { web: false, annotations: { require-whisk-auth: true } }', () => {
    const res = utils.returnAnnotations({ web: false, annotations: { 'require-whisk-auth': true } })
    expect(res).toEqual(expect.objectContaining({ 'web-export': false, 'raw-http': false }))
  })
  test('action = { web: true, annotations: { require-whisk-auth: true } }', () => {
    const res = utils.returnAnnotations({ web: true, annotations: { 'require-whisk-auth': true } })
    expect(res).toEqual({ 'web-export': true, 'require-whisk-auth': true })
  })
})

describe('createApiRoutes', () => {
  test('pkg={ apis: {} }, pkgName=pkg, apiName=api, allowedActions=[], allowedSequences=[], pathOnly=false', () => {
    expect(() => utils.createApiRoutes({ apis: {} }, 'pkg', 'api', [], [], false))
      .toThrow('Arguments to create API not provided')
  })
  test('pkg={ apis: { api1: { base1: { resource1: action1 } } } }, pkgName=pkg1, apiName=api1, allowedActions=[], allowedSequences=[], pathOnly=false', () => {
    expect(() => utils.createApiRoutes({ apis: { api1: { base1: { resource1: 'action1' } } } }, 'pkg1', 'api1', [], [], false))
      .toThrow('Action provided in the api not present in the package')
  })
  test('pkg={ actions: {}, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: POST, response: json } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[ action1 ], allowedSequences=[ ], pathOnly=false', () => {
    expect(() => utils.createApiRoutes({ actions: {}, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'json' } } } } } }, 'pkg1', 'api1', ['action1'], [], false))
      .toThrow('Action provided in the api not present in the package')
  })
  test('pkg={ actions: {}, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: POST, response: json } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[], allowedSequences=[ action1 ], pathOnly=false', () => {
    expect(() => utils.createApiRoutes({ actions: {}, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'json' } } } } } }, 'pkg1', 'api1', [], ['action1'], false))
      .toThrow('Action provided in the api not present in the package')
  })
  test('pkg={ actions: { action1: {} }, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: POST, response: json } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[action1], allowedSequences=[], pathOnly=false', () => {
    expect(() => utils.createApiRoutes({ actions: { action1: {} }, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'json' } } } } } }, 'pkg1', 'api1', ['action1'], [], false))
      .toThrow('Action or sequence provided in api is not a web action')
  })
  test('pkg={ actions: { action1: { web: true } }, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: POST, response: json } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[action1], allowedSequences=[], pathOnly=false', () => {
    const res = utils.createApiRoutes({ actions: { action1: { web: true } }, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'json' } } } } } }, 'pkg1', 'api1', ['action1'], [], false)
    expect(res).toEqual([{ action: 'pkg1/action1', basepath: '/base1', name: 'api1', operation: 'POST', relpath: '/resource1', responsetype: 'json' }])
  })
  test('pkg={ actions: { action1: { web-export: true } }, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: POST, response: json } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[action1], allowedSequences=[], pathOnly=false', () => {
    const res = utils.createApiRoutes({ actions: { action1: { 'web-export': true } }, sequences: {}, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'json' } } } } } }, 'pkg1', 'api1', ['action1'], [], false)
    expect(res).toEqual([{ action: 'pkg1/action1', basepath: '/base1', name: 'api1', operation: 'POST', relpath: '/resource1', responsetype: 'json' }])
  })
  test('pkg={ actions: {}, sequences: { action1: { web: true } }, apis: { api1: { base1: { resource1: { action1: { method: POST, response: json } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[action1], allowedSequences=[], pathOnly=false', () => {
    const res = utils.createApiRoutes({ actions: {}, sequences: { action1: { web: true } }, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'json' } } } } } }, 'pkg1', 'api1', [], ['action1'], false)
    expect(res).toEqual([{ action: 'pkg1/action1', basepath: '/base1', name: 'api1', operation: 'POST', relpath: '/resource1', responsetype: 'json' }])
  })
  test('pkg={ actions: {}, sequences: { action1: { web-export: true } }, apis: { api1: { base1: { resource1: { action1: { method: POST, response: json } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[action1], allowedSequences=[], pathOnly=false', () => {
    const res = utils.createApiRoutes({ actions: {}, sequences: { action1: { 'web-export': true } }, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'json' } } } } } }, 'pkg1', 'api1', [], ['action1'], false)
    expect(res).toEqual([{ action: 'pkg1/action1', basepath: '/base1', name: 'api1', operation: 'POST', relpath: '/resource1', responsetype: 'json' }])
  })
  test('pkg={ actions: {}, sequences: { action1: { web-export: true } }, apis: { api1: { base1: { resource1: { action1: { method: POST, response: html } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[action1], allowedSequences=[], pathOnly=false', () => {
    const res = utils.createApiRoutes({ actions: {}, sequences: { action1: { 'web-export': true } }, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'html' } } } } } }, 'pkg1', 'api1', [], ['action1'], false)
    expect(res).toEqual([{ action: 'pkg1/action1', basepath: '/base1', name: 'api1', operation: 'POST', relpath: '/resource1', responsetype: 'html' }])
  })
  test('pkg={ actions: {}, sequences: { action1: { web-export: true } }, apis: { api1: { base1: { resource1: { action1: { method: POST, response: html } } } } }, pkgName=pkg1, apiName=api1, allowedActions=[action1], allowedSequences=[], pathOnly=true', () => {
    const res = utils.createApiRoutes({ actions: {}, sequences: { action1: { 'web-export': true } }, apis: { api1: { base1: { resource1: { action1: { method: 'POST', response: 'html' } } } } } }, 'pkg1', 'api1', [], ['action1'], true)
    expect(res).toEqual([{ basepath: '/base1', name: 'api1', relpath: '/resource1' }])
  })
})

describe('returnUnion', () => { /* TODO */ })
describe('checkWebFlags', () => { /* TODO */ })

describe('createSequenceObject', () => {
  test('no args', async () => {
    expect(() => utils.createSequenceObject())
      .toThrow()
  })
  test('sequence=name, sequenceManifest has no actions set', async () => {
    expect(() => utils.createSequenceObject('name', {}))
      .toThrow('Actions for the sequence not provided.')
  })
  test('sequence=name, sequenceManifest with actions', async () => {
    expect(utils.createSequenceObject('name', { actions: 'pkg1/c  ,otherns/pkg2/b, nopackage' }, 'fakepackage'))
      .toEqual({ action: '', exec: { components: ['pkg1/c', 'otherns/pkg2/b', 'fakepackage/nopackage'], kind: 'sequence' }, name: 'name' })
  })
})

describe('setPaths', () => {
  test('no args', async () => {
    expect(() => utils.setPaths())
      .toThrowError('Manifest file not found')
  })
  test('bad args with manifest', async () => {
    expect(() => utils.setPaths({ manifest: 'manifest.yml' }))
      .toThrowError('no such file or directory')
  })
  test('bad args with manifest and deployment', async () => {
    expect(() => utils.setPaths({ manifest: 'manifest.yml', deployment: 'chik' }))
      .toThrowError('no such file or directory')
  })
  test('with manifest', async () => {
    global.fakeFileSystem.addJson({ 'manifest.yml': 'packages: testpackage' })
    const res = utils.setPaths({ manifest: '/manifest.yml' })
    expect(res).toEqual(expect.objectContaining({ packages: 'testpackage' }))
  })
  test('with manifest (including project)', async () => {
    global.fakeFileSystem.addJson({
      'manifest.yml': `
    project:
      name: testproject
      packages: testpackage`
    })
    const res = utils.setPaths({ manifest: '/manifest.yml' })
    expect(res).toEqual(expect.objectContaining({ projectName: 'testproject', packages: 'testpackage' }))
  })
  test('with manifest (including project with no name)', async () => {
    global.fakeFileSystem.addJson({
      'manifest.yml': `
    project:
      packages: testpackage`
    })
    const res = utils.setPaths({ manifest: '/manifest.yml' })
    expect(res).toEqual(expect.objectContaining({ projectName: '', packages: 'testpackage' }))
  })
  test('with manifest and deployment', async () => {
    global.fakeFileSystem.addJson({
      'manifest.yml': `
    project:
      name: testproject
      packages: testpackage`,
      'deployment.yml': `
    project:
      name: testproject
      packages: testpackage`
    })
    const res = utils.setPaths({ manifest: '/manifest.yml', deployment: '/deployment.yml' })
    expect(res).toEqual(expect.objectContaining({
      deploymentPackages: 'testpackage',
      deploymentTriggers: {},
      manifestContent: { project: { name: 'testproject', packages: 'testpackage' } },
      manifestPath: '/manifest.yml',
      packages: 'testpackage',
      projectName: 'testproject'
    }))
  })
  test('with manifest and deployment using different project names', async () => {
    global.fakeFileSystem.addJson({
      'manifest.yml': `
    project:
      name: testproject`,
      'deployment.yml': `
    project:
      packages: testpackage`
    })
    expect(() => utils.setPaths({ manifest: '/manifest.yml', deployment: '/deployment.yml' }))
      .toThrowError('The project name in the deployment file does not match the project name in the manifest file')
  })
})

describe('createActionObject', () => {
  let readFileSyncSpy
  beforeEach(() => {
    readFileSyncSpy = jest.spyOn(fs, 'readFileSync')
  })
  afterEach(() => {
    readFileSyncSpy.mockRestore()
  })

  test('action zip - no runtime prop', () => {
    expect(() => utils.createActionObject('action', { function: 'some.zip' }))
      .toThrowError('Invalid or missing property')
    expect(() => utils.createActionObject('action', { function: 'some.zip' }))
      .toThrowError('Invalid or missing property')
    expect(() => utils.createActionObject('action', { function: 'some.zip', runtime: 'something' }))
      .toThrowError('no such file or directory')
  })

  test('action js - runtime prop w/ docker', () => {
    readFileSyncSpy.mockImplementation(() => 'fake source code')
    const res = utils.createActionObject('fake', {
      function: 'fake.js',
      runtime: 'something',
      docker: 'docker',
      main: 'fakeSrcMain',
      limits: { concurrency: 12 }
    })
    expect(res).toEqual({ action: 'fake source code', annotations: { 'raw-http': false, 'web-export': false }, exec: { image: 'docker', kind: 'blackbox', main: 'fakeSrcMain' }, limits: { concurrency: 12, logs: 10, memory: 256, timeout: 60000 }, name: 'fake' })
  })

  test('action js - runtime prop w/ docker, actionCode false', () => {
    readFileSyncSpy.mockImplementation(() => 'fake source code')
    const res = utils.createActionObject('fake', {
      function: 'fake.zip',
      runtime: 'something',
      docker: 'docker',
      main: 'fakeSrcMain',
      limits: { concurrency: 12 }
    }, { actionCode: false })
    expect(res).toEqual({ annotations: { 'raw-http': false, 'web-export': false }, exec: { image: 'docker', kind: 'blackbox', main: 'fakeSrcMain' }, limits: { concurrency: 12, logs: 10, memory: 256, timeout: 60000 }, name: 'fake' })
  })

  test('action zip - runtime prop w/ docker, actionCode false', () => {
    readFileSyncSpy.mockImplementation(() => 'fake source code')
    const res = utils.createActionObject('fake', {
      function: 'fake.js',
      runtime: 'something',
      docker: 'docker',
      main: 'fakeSrcMain',
      limits: { concurrency: 12 }
    }, { actionCode: false })
    expect(res).toEqual({ annotations: { 'raw-http': false, 'web-export': false }, exec: { image: 'docker', kind: 'blackbox', main: 'fakeSrcMain' }, limits: { concurrency: 12, logs: 10, memory: 256, timeout: 60000 }, name: 'fake' })
  })

  test('action js - runtime prop w/ docker, no main', () => {
    readFileSyncSpy.mockImplementation(() => 'fake source code')
    const res = utils.createActionObject('fake', {
      function: 'fake.js',
      runtime: 'something',
      docker: 'docker',
      limits: { concurrency: 12 }
    })
    expect(res).toEqual({ action: 'fake source code', annotations: { 'raw-http': false, 'web-export': false }, exec: { image: 'docker', kind: 'blackbox' }, limits: { concurrency: 12, logs: 10, memory: 256, timeout: 60000 }, name: 'fake' })
  })

  test('action js - runtime prop w/ docker, no main, no limits', () => {
    readFileSyncSpy.mockImplementation(() => 'fake source code')
    const res = utils.createActionObject('fake', {
      function: 'fake.js',
      runtime: 'something',
      docker: 'docker',
      limits: {}
    })
    expect(res).toEqual({ action: 'fake source code', annotations: { 'raw-http': false, 'web-export': false }, exec: { image: 'docker', kind: 'blackbox' }, limits: { logs: 10, memory: 256, timeout: 60000 }, name: 'fake' })
  })

  test('action js -  no runtime prop, no docker, yes main', () => {
    readFileSyncSpy.mockImplementation(() => 'fake source code')
    const res = utils.createActionObject('fake', {
      function: 'fake.js',
      main: 'main'
    })
    expect(res).toEqual({ action: 'fake source code', annotations: { 'raw-http': false, 'web-export': false }, exec: { main: 'main' }, name: 'fake' })
  })

  test('action js - runtime prop no docker', () => {
    readFileSyncSpy.mockImplementation(() => 'fake source code')
    const result = utils.createActionObject('fake', {
      function: 'fake.js',
      runtime: 'something',
      main: 'fakeSrcMain'
    })

    expect(result).toEqual(expect.objectContaining({
      action: 'fake source code',
      annotations: {
        'raw-http': false,
        'web-export': false
      },
      exec: {
        kind: 'something',
        main: 'fakeSrcMain'
      },
      name: 'fake'
    }))
  })

  describe('action supported limits', () => {
    const manifestAction = {
      function: 'fake.js',
      runtime: 'something'
    }
    test('action supported limits alternative name memory', () => {
      manifestAction.limits = {
        memory: 1
      }
      readFileSyncSpy.mockImplementation(() => 'some source code')
      const res = utils.createActionObject('fake', manifestAction)
      expect(res.limits.memory).toEqual(1)
    })
    test('action supported limits, concurrentActivations set', () => {
      manifestAction.limits = {
        memorySize: 1,
        logSize: 2,
        timeout: 3,
        concurrentActivations: 4
      }
      readFileSyncSpy.mockImplementation(() => 'some source code')
      const res = utils.createActionObject('fake', manifestAction)
      expect(res).toEqual({ action: 'some source code', annotations: { 'raw-http': false, 'web-export': false }, exec: { kind: 'something' }, limits: { logs: 2, memory: 1, timeout: 3, concurrency: 4 }, name: 'fake' })
    })
    test('action supported limits, concurrency set', () => {
      manifestAction.limits = {
        memorySize: 1,
        logSize: 2,
        timeout: 3,
        concurrency: 4
      }
      readFileSyncSpy.mockImplementation(() => 'some source code')
      const res = utils.createActionObject('fake', manifestAction)
      expect(res).toEqual({ action: 'some source code', annotations: { 'raw-http': false, 'web-export': false }, exec: { kind: 'something' }, limits: { logs: 2, memory: 1, timeout: 3, concurrency: 4 }, name: 'fake' })
    })
    test('action supported limits, concurrency | concurrentActivations not set', () => {
      manifestAction.limits = {
        memorySize: 1,
        logSize: 2,
        timeout: 3
      }
      readFileSyncSpy.mockImplementation(() => 'some source code')
      const res = utils.createActionObject('fake', manifestAction)
      expect(res).toEqual({ action: 'some source code', annotations: { 'raw-http': false, 'web-export': false }, exec: { kind: 'something' }, limits: { logs: 2, memory: 1, timeout: 3 }, name: 'fake' })
    })
  })
})

describe('deployPackage', () => {
  test('basic manifest', async () => {
    const imsOrgId = 'MyIMSOrgId'
    const mockLogger = jest.fn()
    const cmdPkg = ow.mockResolved(owPackage, '')
    const cmdAction = ow.mockResolved(owAction, '')
    const cmdAPI = ow.mockResolved(owAPI, '')
    const cmdTrigger = ow.mockResolved(owTriggers, '')
    const cmdRule = ow.mockResolved(owRules, '')
    ow.mockResolvedProperty(owInitOptions, {})
    ow.mockResolvedProperty('actions.client.options', { apiKey: 'my-key', namespace: 'my-namespace' })

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn()
    })
    await utils.deployPackage(JSON.parse(fs.readFileSync('/basic_manifest_res.json')), ow, mockLogger, imsOrgId)
    expect(cmdPkg).toHaveBeenCalledWith(expect.objectContaining({ name: 'hello' }))
    expect(cmdPkg).toHaveBeenCalledWith(expect.objectContaining({ name: 'mypackage', package: { binding: { name: 'oauth', namespace: 'adobeio' } } }))
    expect(cmdAction).toHaveBeenCalled()
    expect(cmdAPI).toHaveBeenCalled()
    expect(cmdTrigger).toHaveBeenCalled()
    expect(cmdRule).toHaveBeenCalled()

    // this assertion is specific to the tmp implementation of the require-adobe-annotation
    expect(mockFetch).toHaveBeenCalledWith(
      'https://adobeio.adobeioruntime.net/api/v1/web/state/put',
      {
        body: '{"namespace":"my-namespace","key":"__aio","value":{"project":{"org":{"ims_org_id":"MyIMSOrgId"}}},"ttl":-1}',
        headers: { Authorization: 'Basic bXkta2V5', 'Content-Type': 'application/json' },
        method: 'post'
      })
  })

  test('basic manifest - unsupported kind', async () => {
    const imsOrgId = 'MyIMSOrgId'
    const mockLogger = jest.fn()
    const actionOptions = {
      apiKey: 'my-key',
      namespace: 'my-namespace'
    }
    const initOptions = {
      apihost: 'https://adobeio.adobeioruntime.net'
    }
    ow.mockResolvedProperty('actions.client.options', actionOptions)
    ow.mockResolvedProperty(owInitOptions, initOptions)

    const result = {
      runtimes: {
        nodejs: [
          { kind: 'nodejs:14' },
          { kind: 'nodejs:16' }
        ]
      }
    }
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => result
    })

    const supportedClientRuntimes = ['nodejs:10', 'nodejs:12', 'nodejs:14', 'nodejs:16']
    const supportedServerRuntimes = await utils.getSupportedServerRuntimes(initOptions.apihost)

    await expect(() =>
      utils.deployPackage(JSON.parse(fs.readFileSync('/basic_manifest_unsupported_kind.json')), ow, mockLogger, imsOrgId)
    ).rejects.toThrow(`Unsupported node version 'nodejs:8' in action hello/helloAction. Supported versions are ${supportedClientRuntimes}. Supported runtimes on ${initOptions.apihost}: ${supportedServerRuntimes}`)
  })

  test('basic manifest (fetch error)', async () => {
    // this test is specific to the tmp implementation of the require-adobe-annotation
    const imsOrgId = 'MyIMSOrgId'
    const mockLogger = jest.fn()
    ow.mockResolvedProperty('actions.client.options', { apiKey: 'my-key', namespace: 'my-namespace' })
    ow.mockResolvedProperty(owInitOptions, {})

    const res = {
      ok: false,
      status: 403,
      json: jest.fn()
    }
    mockFetch.mockResolvedValue(res)

    await expect(utils.deployPackage(JSON.parse(fs.readFileSync('/basic_manifest_res.json')), ow, mockLogger, imsOrgId))
      .rejects.toThrowError(`failed setting ims_org_id=${imsOrgId} into state lib, received status=${res.status}, please make sure your runtime credentials are correct`)
  })

  test('basic manifest (no IMS Org Id)', async () => {
    // this test is specific to the tmp implementation of the require-adobe-annotation
    const mockLogger = jest.fn()
    ow.mockResolvedProperty(owInitOptions, {})

    await expect(utils.deployPackage(JSON.parse(fs.readFileSync('/basic_manifest_res.json')), ow, mockLogger, null))
      .rejects.toThrowError(new Error('imsOrgId must be defined when using the Adobe headless auth validator'))
  })
})

describe('undeployPackage', () => {
  test('basic manifest', async () => {
    const mockLogger = jest.fn()
    const cmdPkgDel = ow.mockResolved(owPackageDel, '')
    const cmdActionDel = ow.mockResolved(owActionDel, '')
    const cmdAPIDel = ow.mockResolved(owAPIDel, '')
    const cmdTriggerDel = ow.mockResolved(owTriggerDel, '')
    const cmdRuleDel = ow.mockResolved(owRulesDel, '')
    await utils.undeployPackage(JSON.parse(fs.readFileSync('/basic_manifest_res.json')), ow, mockLogger)
    expect(cmdPkgDel).toHaveBeenCalledWith(expect.objectContaining({ name: 'hello' }))
    expect(cmdPkgDel).toHaveBeenCalledWith(expect.objectContaining({ name: 'mypackage' }))
    expect(cmdActionDel).toHaveBeenCalled()
    expect(cmdAPIDel).toHaveBeenCalled()
    expect(cmdTriggerDel).toHaveBeenCalled()
    expect(cmdRuleDel).toHaveBeenCalled()
  })
})

describe('processPackage', () => {
  const HEADLESS_VALIDATOR = '/adobeio/shared-validators-v1/headless-v2'
  const HEADLESS_VALIDATOR_STAGE = '/adobeio-stage/shared-validators-v1/headless-v2'
  const basicPackage = {
    pkg1: {
      actions: {
        theaction: {
          function: 'fake.js',
          web: 'yes',
          annotations: {
            'require-adobe-auth': true
          }
        }
      }
    }
  }

  test('basic manifest', async () => {
    const entities = utils.processPackage(JSON.parse(fs.readFileSync('/basic_manifest.json')), {}, {}, {})
    const res = JSON.parse(fs.readFileSync('/basic_manifest_res.json'))
    res.actions[0].action = res.actions[0].action.split('\n').join(os.EOL)
    res.actions[1].action = res.actions[1].action.split('\n').join(os.EOL)
    expect(entities).toMatchObject(res)
  })

  test('basic manifest with actionCode as false', async () => {
    const entities = utils.processPackage(JSON.parse(fs.readFileSync('/basic_manifest.json')), {}, {}, {}, false, {}, { actionCode: false })
    const res = JSON.parse(fs.readFileSync('/basic_manifest_res.json'))
    delete res.actions[0].action
    delete res.actions[1].action
    expect(entities).toMatchObject(res)
  })

  test('basic manifest with namesOnly flag', async () => {
    const entities = utils.processPackage(JSON.parse(fs.readFileSync('/basic_manifest.json')), {}, {}, {}, true, {})
    expect(entities).toMatchObject(JSON.parse(fs.readFileSync('/basic_manifest_res_namesonly.json')))
  })

  test('basic manifest with package parameters', async () => {
    const packages = JSON.parse(fs.readFileSync('/basic_manifest.json'))
    packages.hello.inputs = { 'my-pkg-param': 'pkg-param-value' }
    const entities = utils.processPackage(packages, {}, {}, {})
    expect(entities).toMatchObject(JSON.parse(fs.readFileSync('/pkgparam_manifest_res.json')))
  })

  test('basic manifest with package parameters in multiple packages', async () => {
    const packages = JSON.parse(fs.readFileSync('/basic_manifest.json'))
    packages.hello.inputs = { 'my-pkg-param': 'pkg-param-value' }
    packages.hello2 = { inputs: { 'my-pkg-param2': 'pkg-param-value2' } }
    const entities = utils.processPackage(packages, {}, {}, {})
    expect(entities).toMatchObject(JSON.parse(fs.readFileSync('/pkgparam_manifest_res_multi.json')))
  })

  test('shared package', async () => {
    const res = utils.processPackage({ pkg1: { public: true } }, {}, {}, {}, false, {})
    expect(res).toEqual(expect.objectContaining({ pkgAndDeps: [{ name: 'pkg1', package: { publish: true } }] }))
  })

  test('dependency with no location property', async () => {
    expect(() => utils.processPackage({ pkg1: { dependencies: { mypackage: {} } } }, {}, {}, {}, false, {}))
      .toThrow('Invalid or missing property "location" in the manifest for this action: mypackage')
  })

  test('dependency with inputs', async () => {
    const res = utils.processPackage({ pkg1: { dependencies: { mypackage: { location: '/adobe/auth', inputs: { key1: 'value1' } } } } }, {}, {}, {}, false, {})
    expect(res).toEqual(expect.objectContaining({
      pkgAndDeps: [
        { name: 'pkg1' },
        {
          name: 'mypackage',
          package: {
            binding: {
              namespace: 'adobe',
              name: 'auth'
            },
            parameters: [{
              key: 'key1',
              value: 'value1'
            }]
          }
        }]
    }))
  })

  test('dependencies with deployment inputs', async () => {
    const deploymentPackages = { pkg1: { dependencies: { mydependencypkg: { inputs: { key1: 'value1' } } } } }
    const packages = { pkg1: { dependencies: { mydependencypkg: { location: '/adobe/auth' } } } }
    const res = utils.processPackage(packages, deploymentPackages, {}, {})
    expect(res.pkgAndDeps).toEqual(expect.arrayContaining([{
      name: 'mydependencypkg',
      package: {
        binding: {
          name: 'auth',
          namespace: 'adobe'
        },
        parameters: [
          {
            key: 'key1',
            value: 'value1'
          }
        ]
      }
    }]))
  })

  test('dependencies with deployment (empty) inputs', async () => {
    const deploymentPackages = { pkg1: { dependencies: { mydependencypkg: { inputs: null } } } }
    const packages = { pkg1: { dependencies: { mydependencypkg: { location: '/adobe/auth' } } } }
    const res = utils.processPackage(packages, deploymentPackages, {}, {})
    expect(res.pkgAndDeps).toEqual(expect.arrayContaining([{
      name: 'mydependencypkg',
      package: {
        binding: {
          name: 'auth',
          namespace: 'adobe'
        }
      }
    }]))
  })

  test('dependencies with action (empty) inputs', async () => {
    const deploymentPackages = { pkg1: { actions: { mydependencypkg: { inputs: null } } } }
    const packages = { pkg1: { dependencies: { mydependencypkg: { location: '/adobe/auth' } } } }
    const res = utils.processPackage(packages, deploymentPackages, {}, {})
    expect(res.pkgAndDeps).toEqual(expect.arrayContaining([{
      name: 'mydependencypkg',
      package: {
        binding: {
          name: 'auth',
          namespace: 'adobe'
        }
      }
    }]))
  })

  test('triggers with deploymentTriggerInputs', async () => {
    const deploymenTriggerInputs = { a: {}, another: { a: 1, b: 'str', c: [1, 2, 3] } }
    const res = utils.processPackage({ pkg1: { triggers: { another: {} } } }, {}, deploymenTriggerInputs, {})
    expect(res.triggers[0].name).toEqual('another')
    expect(res.triggers[0].trigger.parameters).toEqual([{ key: 'a', value: 1 }, { key: 'b', value: 'str' }, { key: 'c', value: [1, 2, 3] }])
  })

  test('triggers with no inputs (codecov)', async () => {
    const res = utils.processPackage({ pkg1: { triggers: { mytrigger: {} } } }, {}, {}, {})
    expect(res.triggers).toEqual([{ name: 'mytrigger', trigger: {} }])
  })

  test('rule with no action', async () => {
    expect(() => utils.processPackage({ pkg1: { rules: { myrule: {} } } }, {}, {}, {}, false, {}))
      .toThrow('Trigger and Action are both required for rule creation')
  })

  test('rule with full path of action', async () => {
    expect(() => utils.processPackage({ pkg1: { rules: { myrule: { action: '/ns/p/action', trigger: 'mytrigger' } } } }, {}, {}, {}, false, {}))
      .toThrow('Action/Trigger provided in the rule not found in manifest file')
  })

  test('rule with non-existent action', async () => {
    expect(() => utils.processPackage({ pkg1: { rules: { myrule: { action: 'non-existent', trigger: 'non-existent' } } } }, {}, {}, {}, false, {}))
      .toThrow('Action/Trigger provided in the rule not found in manifest file')
  })
  // the adobe auth annotation is a temporarily implemented on the client side
  // simply remove this test when the feature will be moved server side, to I/O Runtime
  test('manifest with adobe auth annotation', () => {
    const spy = jest.spyOn(fs, 'readFileSync')
    const fakeCode = 'fake action code'
    spy.mockImplementation(() => fakeCode)

    // does not rewrite if apihost is not 'https://adobeioruntime.net'
    let res = utils.processPackage(basicPackage, {}, {}, {}, false, {})
    expect(res).toEqual({
      actions: [{
        name: 'pkg1/theaction',
        annotations: expect.objectContaining({ 'web-export': true }),
        action: fakeCode
      }],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })

    // does not rewrite if action is not web
    let packagesCopy = cloneDeep(basicPackage)
    delete packagesCopy.pkg1.actions.theaction.web
    res = utils.processPackage(packagesCopy, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [{
        name: 'pkg1/theaction',
        annotations: expect.objectContaining({ 'web-export': false, 'raw-http': false }),
        action: fakeCode
      }],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })

    // does not rewrite if there are no actions
    packagesCopy = cloneDeep(basicPackage)
    delete packagesCopy.pkg1.actions
    res = utils.processPackage(packagesCopy, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })

    // does not rewrite if the annotation is not set
    packagesCopy = cloneDeep(basicPackage)
    delete packagesCopy.pkg1.actions.theaction.annotations['require-adobe-auth']
    res = utils.processPackage(packagesCopy, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/theaction', annotations: { 'web-export': true }, action: fakeCode }
      ],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })

    // fails if an action with the rewrite name exists
    packagesCopy = cloneDeep(basicPackage)
    packagesCopy.pkg1.actions.__secured_theaction = {}
    expect(() => utils.processPackage(packagesCopy, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' }))
      .toThrow('Failed to rename the action \'pkg1/theaction\' to \'pkg1/__secured_theaction\': an action with the same name exists already.')

    // fails if a sequence with the same action name exists
    packagesCopy = cloneDeep(basicPackage)
    packagesCopy.pkg1.sequences = { theaction: {} }
    expect(() => utils.processPackage(packagesCopy, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' }))
      .toThrow('The name \'pkg1/theaction\' is defined both for an action and a sequence, it should be unique')

    // basic case 1 action using the annotation
    res = utils.processPackage(basicPackage, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/__secured_theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode },
        { name: 'pkg1/theaction', action: '', annotations: { 'web-export': true }, exec: { components: [HEADLESS_VALIDATOR, 'pkg1/__secured_theaction'], kind: 'sequence' } }
      ],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })

    // test stage validator
    libEnv.getCliEnv.mockReturnValue(STAGE_ENV)
    res = utils.processPackage(basicPackage, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/__secured_theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode },
        { name: 'pkg1/theaction', action: '', annotations: { 'web-export': true }, exec: { components: [HEADLESS_VALIDATOR_STAGE, 'pkg1/__secured_theaction'], kind: 'sequence' } }
      ],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })
    // reset to prod for next tests
    libEnv.getCliEnv.mockReturnValue(PROD_ENV)

    // test default env => PROD
    libEnv.getCliEnv.mockReturnValue(null)
    res = utils.processPackage(basicPackage, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/__secured_theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode },
        { name: 'pkg1/theaction', action: '', annotations: { 'web-export': true }, exec: { components: [HEADLESS_VALIDATOR, 'pkg1/__secured_theaction'], kind: 'sequence' } }
      ],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })
    // reset to prod for next tests
    libEnv.getCliEnv.mockReturnValue(PROD_ENV)

    // action uses web-export
    packagesCopy = cloneDeep(basicPackage)
    packagesCopy.pkg1.actions.theaction['web-export'] = true
    delete packagesCopy.pkg1.actions.theaction.web
    res = utils.processPackage(packagesCopy, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/__secured_theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode },
        { name: 'pkg1/theaction', action: '', annotations: { 'web-export': true }, exec: { components: [HEADLESS_VALIDATOR, 'pkg1/__secured_theaction'], kind: 'sequence' } }
      ],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })

    // action is raw
    packagesCopy = cloneDeep(basicPackage)
    packagesCopy.pkg1.actions.theaction.web = 'raw'
    res = utils.processPackage(packagesCopy, {}, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/__secured_theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode },
        { name: 'pkg1/theaction', action: '', annotations: { 'web-export': true, 'raw-http': true }, exec: { components: [HEADLESS_VALIDATOR, 'pkg1/__secured_theaction'], kind: 'sequence' } }
      ],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })

    spy.mockRestore()
  })

  test('1 action using the annotation + rewrite deployment package', () => {
    const spy = jest.spyOn(fs, 'readFileSync')
    const fakeCode = 'fake action code'
    spy.mockImplementation(() => fakeCode)
    const deploymentPackages = { pkg1: { actions: { theaction: { inputs: { a: 34 } } } } }
    const res = utils.processPackage(basicPackage, deploymentPackages, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/__secured_theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode, params: { a: 34 } },
        { name: 'pkg1/theaction', action: '', annotations: { 'web-export': true }, exec: { components: [HEADLESS_VALIDATOR, 'pkg1/__secured_theaction'], kind: 'sequence' } }
      ],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })
    spy.mockRestore()
  })

  test('action using the annotation + rewrite deployment package => action has empty imputs', () => {
    const spy = jest.spyOn(fs, 'readFileSync')
    const fakeCode = 'fake action code'
    spy.mockImplementation(() => fakeCode)
    const deploymentPackages = { pkg1: { actions: { theaction: { inputs: null } } } }
    const res = utils.processPackage(basicPackage, deploymentPackages, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/__secured_theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode },
        { name: 'pkg1/theaction', action: '', annotations: { 'web-export': true }, exec: { components: [HEADLESS_VALIDATOR, 'pkg1/__secured_theaction'], kind: 'sequence' } }
      ],
      apis: [],
      pkgAndDeps: [{ name: 'pkg1' }],
      rules: [],
      triggers: []
    })
    spy.mockRestore()
  })
})

describe('syncProject', () => {
  const projectName = 'my-project'
  const projectHash = 'project-hash'
  const newProjectHash = 'new-project-hash'
  const manifestPath = 'deploy/app.boo'
  const manifestContent = 'manifest-content'
  const logger = jest.fn()
  const imsOrgId = 'MyIMSOrg'

  test('syncProject', async () => {
    ow.mockResolved('actions.list', [])
    ow.mockResolved('triggers.list', [])
    ow.mockResolved('rules.list', [])
    ow.mockResolvedProperty(owInitOptions, {})

    const resultObject = {
      annotations: [
        {
          key: 'whisk-managed',
          value: {
            projectName,
            projectHash
          }
        }
      ]
    }
    ow.mockResolved('packages.list', [resultObject]) // for findProjectHashOnServer
    fs.statSync = jest.fn(() => ({ size: () => 1 }))
    global.fakeFileSystem.addJson({ [manifestPath]: newProjectHash }) // for getProjectHash

    const entities = { // for addManagedProjectAnnotations and deployPackage
      pkgAndDeps: [],
      actions: [],
      triggers: [],
      apis: [],
      rules: []
    }

    // deleteEntities = false
    await expect(utils.syncProject(projectName, manifestPath, manifestContent, entities, ow, logger, imsOrgId, false)).resolves.not.toThrow()
    // deleteEntities = true
    await expect(utils.syncProject(projectName, manifestPath, manifestContent, entities, ow, logger, imsOrgId, true)).resolves.not.toThrow()
    // deleteEntities = null
    await expect(utils.syncProject(projectName, manifestPath, manifestContent, entities, ow, logger, imsOrgId)).resolves.not.toThrow()
  })
})

describe('getProjectEntities', () => {
  const projectName = 'my-project'
  const projectHash = 'my-project-hash'

  test('empty entity lists', async () => {
    let entities
    ow.mockResolved('actions.list', [])
    ow.mockResolved('triggers.list', [])
    ow.mockResolved('rules.list', [])
    ow.mockResolved('packages.list', [])

    entities = await utils.getProjectEntities(projectHash, true, ow)
    expect(entities.actions).toEqual([])
    expect(entities.triggers).toEqual([])
    expect(entities.rules).toEqual([])
    expect(entities.pkgAndDeps).toEqual([])
    expect(entities.apis).toEqual([])

    entities = await utils.getProjectEntities(projectName, false, ow)
    expect(entities.actions).toEqual([])
    expect(entities.triggers).toEqual([])
    expect(entities.rules).toEqual([])
    expect(entities.pkgAndDeps).toEqual([])
    expect(entities.apis).toEqual([])
  })

  test('non-empty entity lists (projectName)', async () => {
    const action = {
      namespace: 'my/foo',
      name: 'bar',
      annotations: [
        {
          key: 'whisk-managed',
          value: {
            projectHash,
            projectName
          }
        }
      ]
    }

    ow.mockResolved('actions.list', [action])
    ow.mockResolved('triggers.list', [])
    ow.mockResolved('rules.list', [])
    ow.mockResolved('packages.list', [])

    const expectedAction = JSON.parse(JSON.stringify(action)) // clone
    expectedAction.name = 'foo/bar'

    const entities = await utils.getProjectEntities(projectName, false, ow)
    expect(entities.actions).toEqual([expectedAction])
    expect(entities.triggers).toEqual([])
    expect(entities.rules).toEqual([])
    expect(entities.pkgAndDeps).toEqual([])
    expect(entities.apis).toEqual([])
  })

  test('non-split with namespace', async () => {
    const action = {
      namespace: '_',
      name: 'bar',
      annotations: [
        {
          key: 'whisk-managed',
          value: {
            projectHash,
            projectName
          }
        }
      ]
    }

    ow.mockResolved('actions.list', [action])
    ow.mockResolved('triggers.list', [])
    ow.mockResolved('rules.list', [])
    ow.mockResolved('packages.list', [])

    const expectedAction = JSON.parse(JSON.stringify(action)) // clone
    expectedAction.name = 'bar'

    const entities = await utils.getProjectEntities(projectName, false, ow)
    expect(entities.actions).toEqual([expectedAction])
    expect(entities.triggers).toEqual([])
    expect(entities.rules).toEqual([])
    expect(entities.pkgAndDeps).toEqual([])
    expect(entities.apis).toEqual([])
  })

  test('non-split with namespace, whiskManaged:null', async () => {
    const action = {
      namespace: '_',
      name: 'bar',
      annotations: [
        {
          key: 'whisk-UNmanaged',
          value: 'some-value'
        }
      ]
    }

    ow.mockResolved('actions.list', [action])
    ow.mockResolved('triggers.list', [])
    ow.mockResolved('rules.list', [])
    ow.mockResolved('packages.list', [])

    const expectedAction = JSON.parse(JSON.stringify(action)) // clone
    expectedAction.name = 'bar'

    const entities = await utils.getProjectEntities(projectName, false, ow)
    expect(entities.actions).toEqual([])
    expect(entities.triggers).toEqual([])
    expect(entities.rules).toEqual([])
    expect(entities.pkgAndDeps).toEqual([])
    expect(entities.apis).toEqual([])
  })

  test('non-split with namespace, no annotations', async () => {
    const action = {
      namespace: '_',
      name: 'bar',
      annotations: []
    }

    ow.mockResolved('actions.list', [action])
    ow.mockResolved('triggers.list', [])
    ow.mockResolved('rules.list', [])
    ow.mockResolved('packages.list', [])

    const entities = await utils.getProjectEntities(projectName, false, ow)
    expect(entities.actions).toEqual([])
    expect(entities.triggers).toEqual([])
    expect(entities.rules).toEqual([])
    expect(entities.pkgAndDeps).toEqual([])
    expect(entities.apis).toEqual([])
  })

  test('non-empty entity lists (projectHash)', async () => {
    const action = {
      namespace: 'my/foo',
      name: 'bar',
      annotations: [
        {
          key: 'whisk-managed',
          value: {
            projectHash,
            projectName
          }
        }
      ]
    }

    ow.mockResolved('actions.list', [action])
    ow.mockResolved('triggers.list', [])
    ow.mockResolved('rules.list', [])
    ow.mockResolved('packages.list', [])

    const expectedAction = JSON.parse(JSON.stringify(action)) // clone
    expectedAction.name = 'foo/bar'

    const entities = await utils.getProjectEntities(projectHash, true, ow)
    expect(entities.actions).toEqual([expectedAction])
    expect(entities.triggers).toEqual([])
    expect(entities.rules).toEqual([])
    expect(entities.pkgAndDeps).toEqual([])
    expect(entities.apis).toEqual([])
  })
})

describe('addManagedProjectAnnotations', () => {
  const projectName = 'my-project'
  const projectHash = 'my-project-hash'
  const manifestPath = '/my/manifest/path'

  const expectedAnnotation = {
    file: manifestPath,
    projectDeps: [],
    projectHash: projectHash,
    projectName: projectName
  }
  const managedAnnotation = {
    key: 'whisk-managed',
    value: expectedAnnotation
  }

  test('one package, action, and trigger (trigger has annotations)', () => {
    const pkg = {
      annotations: {}
    }
    const action = {
      annotations: {}
    }
    const trigger = {
      trigger: {
        annotations: [] // has annotations (coverage)
      }
    }
    const entities = {
      pkgAndDeps: [pkg], // one package
      actions: [action], // one action
      triggers: [trigger] // one trigger
    }

    utils.addManagedProjectAnnotations(entities, manifestPath, projectName, projectHash)
    expect(entities.pkgAndDeps[0].annotations['whisk-managed']).toEqual(expectedAnnotation)
    expect(entities.actions[0].annotations['whisk-managed']).toEqual(expectedAnnotation)
    expect(entities.triggers[0].trigger.annotations[0]).toEqual(managedAnnotation)
  })

  test('one package, action, and trigger ( package has empty annotations )', () => {
    const pkg = {
      annotations: null
    }
    const action = {
      annotations: {}
    }
    const trigger = {
      trigger: {
        annotations: [] // has annotations (coverage)
      }
    }
    const entities = {
      pkgAndDeps: [pkg], // one package
      actions: [action], // one action
      triggers: [trigger] // one trigger
    }

    utils.addManagedProjectAnnotations(entities, manifestPath, projectName, projectHash)
    expect(entities.pkgAndDeps[0].annotations['whisk-managed']).toEqual(expectedAnnotation)
    expect(entities.actions[0].annotations['whisk-managed']).toEqual(expectedAnnotation)
    expect(entities.triggers[0].trigger.annotations[0]).toEqual(managedAnnotation)
  })

  test('one package, action, and trigger (trigger has no annotations)', () => {
    const pkg = {
      annotations: {}
    }
    const action = {
      annotations: {}
    }
    const trigger = {
      trigger: { // no annotations (coverage)
      }
    }
    const entities = {
      pkgAndDeps: [pkg], // one package
      actions: [action], // one action
      triggers: [trigger] // one trigger
    }

    utils.addManagedProjectAnnotations(entities, manifestPath, projectName, projectHash)
    expect(entities.pkgAndDeps[0].annotations['whisk-managed']).toEqual(expectedAnnotation)
    expect(entities.actions[0].annotations['whisk-managed']).toEqual(expectedAnnotation)
    expect(entities.triggers[0].trigger.annotations[0]).toEqual(managedAnnotation)
  })
})

describe('printLogs', () => {
  test('activation logs', () => {
    const mockLogger = jest.fn()
    utils.printLogs(activationLog, false, mockLogger)
    expect(mockLogger).toHaveBeenCalledWith('2020-06-25T05:50:23.641Z       stdout: logged from action code')
  })
  test('activation logs - with no logs', () => {
    const mockLogger = jest.fn()
    utils.printLogs(0, false, mockLogger)
    expect(mockLogger).not.toHaveBeenCalled()
  })
  test('activation logs with --strip', () => {
    const mockLogger = jest.fn()
    utils.printLogs(activationLog, true, mockLogger)
    expect(mockLogger).toHaveBeenCalledWith('logged from action code')
  })
  test('activation logs with --strip no timestamp', () => {
    const mockLogger = jest.fn()
    utils.printLogs({ logs: ['logged from action code'] }, true, mockLogger)
    expect(mockLogger).toHaveBeenCalledWith('logged from action code')
  })
  test('activation logs with --strip no text', () => {
    const mockLogger = jest.fn()
    utils.printLogs({ logs: ['2020-06-25T05:50:23.641Z       stdout: '] }, true, mockLogger)
    expect(mockLogger).toHaveBeenCalledWith('')
  })
})

describe('createKeyValueObjectFromArray', () => {
  test('fail when array item does not have key or value', () => {
    const func = () => utils.createKeyValueObjectFromArray([{}])
    expect(func).toThrow(new Error('Please provide correct input array with key and value params in each array item'))
  })
  test('array of key:value (string) pairs', () => {
    const res = utils.createKeyValueObjectFromArray([{ key: 'key1', value: 'val2' }])
    expect(res).toMatchObject({ key1: 'val2' })
  })

  test('array of key:value (number) pairs', () => {
    const res = utils.createKeyValueObjectFromArray([{ key: 'key1', value: 1 }])
    expect(res).toMatchObject({ key1: 1 })
  })

  test('array of key:value (numeric string) pairs', () => {
    const res = utils.createKeyValueObjectFromArray([{ key: 'key1', value: '11' }])
    expect(res).toMatchObject({ key1: '11' })
  })

  test('array of key:value (not really json)) pairs', () => {
    const res = utils.createKeyValueObjectFromArray([{ key: 'key1', value: '{did you think this was json}' }])
    expect(res).toMatchObject({ key1: '{did you think this was json}' })
  })

  test('a value of 0 should be passed through', () => {
    const res = utils.createKeyValueObjectFromArray([{ key: 'key1', value: 0 }])
    expect(res).toMatchObject({ key1: 0 })
  })

  test('a value of true/false should be passed through', () => {
    const res = utils.createKeyValueObjectFromArray([{ key: 'key1', value: 'true' }, { key: 'key2', value: 'false' }])
    expect(res).toMatchObject({ key1: true, key2: false })
  })

  test('a value of empty string should be passed through', () => {
    const res = utils.createKeyValueObjectFromArray([{ key: 'key1', value: '' }])
    expect(res).toMatchObject({ key1: '' })
  })

  test('a null input should throw', () => {
    const func = () => utils.createKeyValueObjectFromArray([null])
    expect(func).toThrow(new Error('Please provide correct input array with key and value params in each array item'))
  })

  test('undefined input should throw', () => {
    const func = () => utils.createKeyValueObjectFromArray([undefined])
    expect(func).toThrow(new Error('Please provide correct input array with key and value params in each array item'))
  })

  test('more tests', () => {
    expect(() => utils.createKeyValueObjectFromArray([{}])).toThrow('Please provide correct input array')
    // missing key
    expect(() => utils.createKeyValueObjectFromArray([{ value: 'keyless entry' }])).toThrow('Please provide correct input array')
    // falsy key
    expect(() => utils.createKeyValueObjectFromArray([{ key: 0 }])).not.toThrow()
    // key but no value
    expect(() => utils.createKeyValueObjectFromArray([{ key: 'a' }])).not.toThrow()
    // falsy value, but actually a number
    expect(() => utils.createKeyValueObjectFromArray([{ key: 'a', value: 0 }])).not.toThrow()
    // falsy value, empty string
    expect(() => utils.createKeyValueObjectFromArray([{ key: 'a', value: '' }])).not.toThrow()
  })
})

describe('createKeyValueArrayFromFlag', () => {
  test('fail when flag length is odd', () => {
    const func = () => utils.createKeyValueArrayFromFlag(['key1'])
    expect(func).toThrow(new Error('Please provide correct values for flags'))
  })
  test('array of key:value (string) pairs', () => {
    const res = utils.createKeyValueArrayFromFlag(['name1', 'val1', 'name2', 'val2'])
    expect(res).toMatchObject([{ key: 'name1', value: 'val1' }, { key: 'name2', value: 'val2' }])
  })

  test('array of key:value (number) pairs', () => {
    const res = utils.createKeyValueArrayFromFlag(['name1', 12, 'name2', 23])
    expect(res).toMatchObject([{ key: 'name1', value: 12 }, { key: 'name2', value: 23 }])
  })

  test('array of key:value (numeric string) pairs', () => {
    const res = utils.createKeyValueArrayFromFlag(['name1', '12', 'name2', '23'])
    expect(res).toMatchObject([{ key: 'name1', value: '12' }, { key: 'name2', value: '23' }])
  })

  test('array of key:value (boolean string) pairs', () => {
    const res = utils.createKeyValueArrayFromFlag(['yes', 'true', 'no', 'false'])
    expect(res).toMatchObject([{ key: 'yes', value: true }, { key: 'no', value: false }])
  })

  test('array of key:value (object) pairs', () => {
    const res = utils.createKeyValueArrayFromFlag(['name1', '["val0","val1"]', 'name2', 'val2'])
    expect(typeof res[0].value).toEqual('object')
    expect(res).toMatchObject([{ key: 'name1', value: ['val0', 'val1'] }, { key: 'name2', value: 'val2' }])
  })

  test('array of key:value (looks like a json object) pairs', () => {
    const res = utils.createKeyValueArrayFromFlag(['name1', '[this is a literal string value with brackets]', 'name2', '{literal value with curlies}'])
    expect(typeof res[0].value).toEqual('string')
    expect(typeof res[1].value).toEqual('string')
    expect(res).toMatchObject([{ key: 'name1', value: '[this is a literal string value with brackets]' }, { key: 'name2', value: '{literal value with curlies}' }])
  })
})

describe('createKeyValueObjectFromFlag', () => {
  test('fail when flag length is odd', () => {
    const func = () => utils.createKeyValueObjectFromFlag(['key1'])
    expect(func).toThrow(new Error('Please provide correct values for flags'))
  })
  test('array of key:value (string) pairs', () => {
    const res = utils.createKeyValueObjectFromFlag(['name1', 'val1', 'name2', 'val2'])
    expect(res).toMatchObject({ name1: 'val1', name2: 'val2' })
  })
  test('array of key:value (object) pairs', () => {
    const res = utils.createKeyValueObjectFromFlag(['name1', '["val0","val1"]', 'name2', 'val2'])
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ name1: ['val0', 'val1'], name2: 'val2' })
  })

  test('return expected large number', () => {
    const res = utils.createKeyValueObjectFromFlag(['foo', '4566206088344615922'])
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ foo: '4566206088344615922' })
  })

  test('bad json object', () => {
    const res = utils.createKeyValueObjectFromFlag(['foo', '{ looks like json but its not }'])
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ foo: '{ looks like json but its not }' })
  })

  test('number is a number', () => {
    const res = utils.createKeyValueObjectFromFlag(['num', 108])
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ num: 108 })
  })

  test('true is true', () => {
    const res = utils.createKeyValueObjectFromFlag(['num', true])
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ num: true })
  })

  test('false is false', () => {
    const res = utils.createKeyValueObjectFromFlag(['num', false])
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ num: false })
  })
})

describe('createKeyValueArrayFromFile', () => {
  test('array of key:value pairs', () => {
    const res = utils.createKeyValueArrayFromFile('/file.json')
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject([{ key: 'param1', value: 'param1value' }, { key: 'param2', value: 'param2value' }])
  })
})

describe('createKeyValueObjectFromFile', () => {
  test('object with key:value pairs', () => {
    const res = utils.createKeyValueObjectFromFile('/file.json')
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ param1: 'param1value', param2: 'param2value' })
  })
})

describe('getKeyValueObjectFromMergedParameters', () => {
  test('empty -p and empty -P', () => {
    const res = utils.getKeyValueObjectFromMergedParameters(undefined, undefined)
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({})
  })
  test('empty -p with some params from -P', () => {
    const res = utils.getKeyValueObjectFromMergedParameters(undefined, '/file.json')
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ param1: 'param1value', param2: 'param2value' })
  })
  test('some params from -p with empty -P', () => {
    const res = utils.getKeyValueObjectFromMergedParameters(['param1', 'cmdline1'], undefined)
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ param1: 'cmdline1' })
  })
  test('-p overriding some params from -P', () => {
    const res = utils.getKeyValueObjectFromMergedParameters(['param1', 'cmdline1'], '/file.json')
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ param1: 'cmdline1', param2: 'param2value' })
  })
  test('-p overriding all params from -P', () => {
    const res = utils.getKeyValueObjectFromMergedParameters(['param1', 'cmdline1', 'param2', 'cmdline2'], '/file.json')
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject({ param1: 'cmdline1', param2: 'cmdline2' })
  })
})

describe('getKeyValueArrayFromMergedParameters', () => {
  test('empty -p and empty -P', () => {
    const res = utils.getKeyValueArrayFromMergedParameters(undefined, undefined)
    expect(typeof res).toEqual('undefined')
    expect(res).toBe(undefined)
  })
  test('empty -p with some params from -P', () => {
    const res = utils.getKeyValueArrayFromMergedParameters(undefined, '/file.json')
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject([{ key: 'param1', value: 'param1value' }, { key: 'param2', value: 'param2value' }])
  })
  test('some params from -p with empty -P', () => {
    const res = utils.getKeyValueArrayFromMergedParameters(['param1', 'cmdline1'], undefined)
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject([{ key: 'param1', value: 'cmdline1' }])
  })
  test('-p overriding some params from -P', () => {
    const res = utils.getKeyValueArrayFromMergedParameters(['param1', 'cmdline1'], '/file.json')
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject([{ key: 'param1', value: 'cmdline1' }, { key: 'param2', value: 'param2value' }])
  })
  test('-p overriding all params from -P', () => {
    const res = utils.getKeyValueArrayFromMergedParameters(['param1', 'cmdline1', 'param2', 'cmdline2'], '/file.json')
    expect(typeof res).toEqual('object')
    expect(res).toMatchObject([{ key: 'param1', value: 'cmdline1' }, { key: 'param2', value: 'cmdline2' }])
  })
})

describe('parsePathPattern', () => {
  // expect(Vishal)toWriteThis()
  test('test with namespace and name in path', () => {
    const [, namespace, name] = utils.parsePathPattern('/53444_28782/name1')
    expect(typeof namespace).toEqual('string')
    expect(namespace).toEqual('53444_28782')
    expect(typeof name).toEqual('string')
    expect(name).toEqual('name1')
  })
  test('test with only name in path', () => {
    const [, namespace, name] = utils.parsePathPattern('name1')
    expect(namespace).toEqual(null)
    expect(typeof name).toEqual('string')
    expect(name).toEqual('name1')
  })
})

describe('getProjectHash', () => {
  test('returns hash', () => {
    fs.statSync = jest.fn(() => ({ size: () => 1 }))
    global.fakeFileSystem.addJson({ 'deploy/app.boo': 'fake' })
    const result = utils.getProjectHash('content', 'deploy/app.boo')
    expect(result).toBe('39dd19238aee745328b860ecbeea23e774dfbcc2')
  })
})

describe('findProjectHashOnServer', () => {
  test('default projectHash (no packages, actions, triggers, rules found)', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    // const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', '')
    const actList = ow.mockResolved('actions.list', '')
    const trgList = ow.mockResolved('triggers.list', '')
    const rlzList = ow.mockResolved('rules.list', '')
    const result = await utils.findProjectHashOnServer(ow, testProjectName)
    expect(pkgList).toHaveBeenCalled()
    expect(actList).toHaveBeenCalled()
    expect(trgList).toHaveBeenCalled()
    expect(rlzList).toHaveBeenCalled()
    expect(result).toBe('')
  })

  test('default projectHash (empty annotations in existing packages, actions, triggers, rules)', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    // const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', [{ annotations: [] }])
    const actList = ow.mockResolved('actions.list', [{ annotations: [] }])
    const trgList = ow.mockResolved('triggers.list', [{ annotations: [] }])
    const rlzList = ow.mockResolved('rules.list', [{ annotations: [] }])
    const result = await utils.findProjectHashOnServer(ow, testProjectName)
    expect(pkgList).toHaveBeenCalled()
    expect(actList).toHaveBeenCalled()
    expect(trgList).toHaveBeenCalled()
    expect(rlzList).toHaveBeenCalled()
    expect(result).toBe('')
  })

  test('default projectHash (no whisk-managed annotation in existing packages, actions, triggers, rules)', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    // const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', [{ annotations: [{ key: 'not-whisk-managed', value: {} }] }])
    const actList = ow.mockResolved('actions.list', [{ annotations: [{ key: 'not-whisk-managed', value: {} }] }])
    const trgList = ow.mockResolved('triggers.list', [{ annotations: [{ key: 'not-whisk-managed', value: {} }] }])
    const rlzList = ow.mockResolved('rules.list', [{ annotations: [{ key: 'not-whisk-managed', value: {} }] }])
    const result = await utils.findProjectHashOnServer(ow, testProjectName)
    expect(pkgList).toHaveBeenCalled()
    expect(actList).toHaveBeenCalled()
    expect(trgList).toHaveBeenCalled()
    expect(rlzList).toHaveBeenCalled()
    expect(result).toBe('')
  })

  test('return projectHash from packages.list if it finds it', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', resultObject)
    const actList = ow.mockResolved('actions.list', '')
    const trgList = ow.mockResolved('triggers.list', '')
    const rlzList = ow.mockResolved('rules.list', '')
    const result = await utils.findProjectHashOnServer(ow, testProjectName)
    expect(pkgList).toHaveBeenCalled()
    expect(actList).not.toHaveBeenCalled()
    expect(trgList).not.toHaveBeenCalled()
    expect(rlzList).not.toHaveBeenCalled()
    expect(result).toBe('projectHash')
  })

  test('return projectHash from actions.list if it finds it', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', '')
    const actList = ow.mockResolved('actions.list', resultObject)
    const trgList = ow.mockResolved('triggers.list', '')
    const rlzList = ow.mockResolved('rules.list', '')
    const result = await utils.findProjectHashOnServer(ow, testProjectName)
    expect(pkgList).toHaveBeenCalled()
    expect(actList).toHaveBeenCalled()
    expect(trgList).not.toHaveBeenCalled()
    expect(rlzList).not.toHaveBeenCalled()
    expect(result).toBe('projectHash')
  })

  test('return projectHash from triggers.list if it finds it', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', '')
    const actList = ow.mockResolved('actions.list', '')
    const trgList = ow.mockResolved('triggers.list', resultObject)
    const rlzList = ow.mockResolved('rules.list', '')
    const result = await utils.findProjectHashOnServer(ow, testProjectName)
    expect(pkgList).toHaveBeenCalled()
    expect(actList).toHaveBeenCalled()
    expect(trgList).toHaveBeenCalled()
    expect(rlzList).not.toHaveBeenCalled()
    expect(result).toBe('projectHash')
  })

  test('return projectHash from rules.list if it finds it', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', '')
    const actList = ow.mockResolved('actions.list', '')
    const trgList = ow.mockResolved('triggers.list', '')
    const rlzList = ow.mockResolved('rules.list', resultObject)
    const result = await utils.findProjectHashOnServer(ow, testProjectName)
    expect(pkgList).toHaveBeenCalled()
    expect(actList).toHaveBeenCalled()
    expect(trgList).toHaveBeenCalled()
    expect(rlzList).toHaveBeenCalled()
    expect(result).toBe('projectHash')
  })
})

describe('checkOpenWhiskCredentials', () => {
  let config
  beforeEach(async () => {
    config = cloneDeep(global.sampleAppConfig)
  })

  test('check valid OW creds', () => {
    const result = utils.checkOpenWhiskCredentials(config)
    expect(result).toBe(undefined)
  })
  test('no ow config', () => {
    delete config.ow
    const func = () => utils.checkOpenWhiskCredentials(config)
    expect(func).toThrow(new Error('missing aio runtime config, did you set AIO_RUNTIME_XXX env variables?'))
  })
  test('no ow apihost', () => {
    delete config.ow.apihost
    const func = () => utils.checkOpenWhiskCredentials(config)
    expect(func).toThrow(new Error('missing Adobe I/O Runtime apihost, did you set the AIO_RUNTIME_APIHOST environment variable?'))
  })
  test('no ow namespace', () => {
    delete config.ow.namespace
    const func = () => utils.checkOpenWhiskCredentials(config)
    expect(func).toThrow(new Error('missing Adobe I/O Runtime namespace, did you set the AIO_RUNTIME_NAMESPACE environment variable?'))
  })
  test('no ow auth', () => {
    delete config.ow.auth
    const func = () => utils.checkOpenWhiskCredentials(config)
    expect(func).toThrow(new Error('missing Adobe I/O Runtime auth, did you set the AIO_RUNTIME_AUTH environment variable?'))
  })
})

describe('getActionUrls', () => {
  let config
  beforeEach(async () => {
    config = cloneDeep(global.sampleAppConfig)
    // add a package, note: preferably this should be part of a multi package mock config
    config.manifest.full.packages.pkg2 = {
      actions: {
        thataction: cloneDeep(config.manifest.full.packages.__APP_PACKAGE__.actions.action)
      },
      sequences: {
        thatsequence: cloneDeep(config.manifest.full.packages.__APP_PACKAGE__.sequences['action-sequence'])
      }
    }
  })

  test('some non web actions, with ui, no dev, no custom apihost, no custom hostname', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://fake_ns.adobeioruntime.net/api/v1/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'https://fake_ns.adobeioruntime.net/api/v1/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg2/thatsequence'
    }

    config.manifest.full.packages.pkg2.actions.thataction.web = 'no'
    config.manifest.full.packages.__APP_PACKAGE__.actions.action.web = false
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expected)
  })

  test('return package/name if action is in separate packages', () => {
    /* insert extra package */

    const expected = {
      'pkg1/thisAction': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg1/thisAction',
      'pkg1/thisSequence': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg1/thisSequence',
      'pkg2/thataction': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg2/thatsequence'
    }
    const newConfig = cloneDeep(config)
    newConfig.manifest.full.packages.pkg1 = {}
    newConfig.manifest.full.packages.pkg1 = {
      actions: {
        thisAction: {
          function: 'thisAction/thisAction.js',
          web: 'yes',
          runtime: 'nodejs:12'
        }
      },
      sequences: {
        thisSequence: { actions: 'thisAction', web: 'yes' }
      }
    }
    delete newConfig.manifest.full.packages.__APP_PACKAGE__
    const result = utils.getActionUrls(newConfig, false, false)
    expect(result).toEqual(expected)
  })

  test('some non web actions, with ui, no dev, no custom apihost, custom hostname => use custom hostname everywhere', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://fake_ns.adobeioruntime.net/api/v1/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://fake_ns.custom.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.custom.net/api/v1/web/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'https://fake_ns.custom.net/api/v1/web/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.adobeioruntime.net/api/v1/pkg2/thatsequence'
    }
    config.app.hostname = 'custom.net'
    config.manifest.full.packages.__APP_PACKAGE__.actions.action.web = 'no'
    delete config.manifest.full.packages.pkg2.sequences.thatsequence.web
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expected)
  })

  test('some non web actions, with ui, no dev, custom apihost, custom hostname => use custom hostname everywhere', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://fake_ns.custom.net/api/v1/web/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://ow-custom.net/api/v1/fake_ns/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.custom.net/api/v1/web/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'https://fake_ns.custom.net/api/v1/web/pkg2/thataction',
      'pkg2/thatsequence': 'https://ow-custom.net/api/v1/fake_ns/pkg2/thatsequence'
    }
    config.ow.apihost = 'ow-custom.net'
    config.app.hostname = 'custom.net'
    config.manifest.full.packages.__APP_PACKAGE__.sequences['action-sequence'].web = 'no'
    delete config.manifest.full.packages.pkg2.sequences.thatsequence.web
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expected)
  })

  test('some non web actions, with ui, no dev, custom apihost, no custom hostname', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://ow-custom.net/api/v1/web/fake_ns/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://ow-custom.net/api/v1/fake_ns/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://ow-custom.net/api/v1/web/fake_ns/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'https://ow-custom.net/api/v1/web/fake_ns/pkg2/thataction',
      'pkg2/thatsequence': 'https://ow-custom.net/api/v1/web/fake_ns/pkg2/thatsequence'
    }
    config.ow.apihost = 'ow-custom.net'
    config.manifest.full.packages.__APP_PACKAGE__.sequences['action-sequence'].web = false
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expected)
  })

  test('some non web actions, with ui, local dev, custom apihost (localhost), no custom hostname', () => {
    const expected = {
      'sample-app-1.0.0/action': 'http://localhost:3030/api/v1/web/fake_ns/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'http://localhost:3030/api/v1/fake_ns/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'http://localhost:3030/api/v1/web/fake_ns/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'http://localhost:3030/api/v1/web/fake_ns/pkg2/thataction',
      'pkg2/thatsequence': 'http://localhost:3030/api/v1/web/fake_ns/pkg2/thatsequence'
    }
    config.ow.apihost = 'localhost:3030'
    delete config.manifest.full.packages.__APP_PACKAGE__.sequences['action-sequence'].web
    const result = utils.getActionUrls(config, false, true)
    expect(result).toEqual(expected)
  })

  test('some non web actions, with ui, remote dev, no custom apihost, no custom hostname', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.adobeioruntime.net/api/v1/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'https://fake_ns.adobeioruntime.net/api/v1/web/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.adobeioruntime.net/api/v1/web/pkg2/thatsequence'
    }
    delete config.manifest.full.packages.__APP_PACKAGE__.actions['action-zip'].web
    const result = utils.getActionUrls(config, true, false)
    expect(result).toEqual(expected)
  })

  test('some non web actions, no ui, no dev, no custom apihost, no custom hostname', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.adobeioruntime.net/api/v1/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'https://fake_ns.adobeioruntime.net/api/v1/web/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.adobeioruntime.net/api/v1/web/pkg2/thatsequence'
    }
    config.manifest.full.packages.__APP_PACKAGE__.actions['action-zip'].web = false
    config.app.hasFrontend = false
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expected)
  })

  test('some non web actions, no ui, no dev, custom apihost, custom hostname => use custom hostname', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://fake_ns.custom.net/api/v1/web/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://ow-custom.net/api/v1/fake_ns/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.custom.net/api/v1/web/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'https://fake_ns.custom.net/api/v1/web/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.custom.net/api/v1/web/pkg2/thatsequence'
    }
    config.ow.apihost = 'ow-custom.net'
    config.app.hostname = 'custom.net'
    config.manifest.full.packages.__APP_PACKAGE__.sequences['action-sequence'].web = 'no'
    config.app.hasFrontend = false
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expected)
  })

  test('some non web actions, same apihost without protocal, same hostname without protocol', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://fake_ns.adobeioruntime.net/api/v1/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-zip',
      'pkg2/thataction': 'https://fake_ns.adobeioruntime.net/api/v1/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg2/thatsequence'
    }
    config.ow.apihost = 'adobeioruntime.net'
    config.app.hostname = 'adobeio-static.net'
    config.manifest.full.packages.__APP_PACKAGE__.actions.action.web = false
    config.manifest.full.packages.pkg2.actions.thataction.web = 'no'
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expect.objectContaining(expected))
  })

  test('should not fail with a package that has no actions', () => {
    const expected = {
      'sample-app-1.0.0/action': 'https://fake_ns.adobeioruntime.net/api/v1/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-zip',
      'pkg2/thatsequence': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg2/thatsequence'
    }
    config.ow.apihost = 'adobeioruntime.net'
    config.app.hostname = 'adobeio-static.net'
    config.manifest.full.packages.__APP_PACKAGE__.actions.action.web = false
    delete config.manifest.full.packages.pkg2.actions
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expect.objectContaining(expected))
  })

  test('should not fail if default package has no actions', () => {
    const expected = {
      'sample-app-1.0.0/action-sequence': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'pkg2/thataction': 'https://fake_ns.adobeioruntime.net/api/v1/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg2/thatsequence'
    }
    config.ow.apihost = 'adobeioruntime.net'
    config.app.hostname = 'adobeio-static.net'
    config.manifest.full.packages.pkg2.actions.thataction.web = false
    delete config.manifest.full.packages.__APP_PACKAGE__.actions
    const result = utils.getActionUrls(config, false, false)
    expect(result).toEqual(expect.objectContaining(expected))
  })
  test('urls with action keys when legacy on', () => {
    const expected = {
      'pkg2/thataction': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg2/thataction',
      'pkg2/thatsequence': 'https://fake_ns.adobeio-static.net/api/v1/web/pkg2/thatsequence',
      'sample-app-1.0.0/action': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action',
      'sample-app-1.0.0/action-sequence': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'sample-app-1.0.0/action-zip': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-zip',
      action: 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action',
      'action-sequence': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-sequence',
      'action-zip': 'https://fake_ns.adobeio-static.net/api/v1/web/sample-app-1.0.0/action-zip'
    }
    const result = utils.getActionUrls(config, false, false, true)
    expect(result).toEqual(expected)
  })
})

describe('_absApp', () => {
  test('relative path', () => {
    const expected = '/test.txt'

    const result = utils._absApp('/', 'test.txt')
    expect(result).toEqual(path.normalize(expected))
  })

  test('absolute path', () => {
    const expected = '/fakedir/test.txt'

    const result = utils._absApp('/', '/fakedir/test.txt')
    expect(result).toEqual(expected)
  })
})

describe('getIncludesForAction', () => {
  test('invalid manifest', async () => {
    // include length == 0
    await expect(utils.getIncludesForAction({ include: [[]] })).rejects.toThrow('Invalid manifest `include` entry:')
    // include length > 2
    await expect(utils.getIncludesForAction({ include: [[1, 2, 3]] })).rejects.toThrow('Invalid manifest `include` entry:')
    // only src glob specified
    expect(await utils.getIncludesForAction({ include: [['src*']] }))
      .toEqual([{ dest: './', sources: undefined }])
    // src and dest specified
    expect(await utils.getIncludesForAction({ include: [['src*', 'dest/']] }))
      .toEqual([{ dest: 'dest/', sources: undefined }])
  })
})

// todo: cover all of getActionEntryFile from here ... LN:300
describe('getActionEntryFile', () => {
  test('empty package.json', () => {
    const ffs = global.fakeFileSystem
    ffs.reset()
    ffs.removeKeys(['/actions/action-zip/package.json'])
    ffs.addJson({
      'actions/action-zip/sample.js': global.fixtureFile('/sample-app/actions/action-zip/index.js')
    })
    const res = utils.getActionEntryFile('actions/action-zip/package.json')
    expect(res).toBe('index.js')
  })
})

describe('urlJoin', () => {
  test('a', () => {
    expect(utils.urlJoin('a', 'b')).toBe('a/b')
    expect(utils.urlJoin('/a', 'b')).toBe('/a/b')
    expect(utils.urlJoin('/', 'a', 'b')).toBe('/a/b')
  })
})

describe('zip', () => {
  beforeEach(async () => {
    global.fakeFileSystem.reset()
    archiver.mockReset()
  })

  test('should zip a directory', async () => {
    global.fakeFileSystem.addJson({
      '/indir/fake1.js': '// js file 1',
      '/indir/fake2.js': '// js file 2'
    })
    await utils.zip('/indir', '/out.zip')

    expect(archiver.mockDirectory).toHaveBeenCalledWith('/indir', false)
    expect(archiver.mockFile).toHaveBeenCalledTimes(0)
    expect(fs.existsSync('/out.zip')).toEqual(true)
  })

  test('should zip a file with pathInZip=false', async () => {
    global.fakeFileSystem.addJson({
      '/indir/fake1.js': '// js file 1',
      '/indir/fake2.js': '// js file 2'
    })
    await utils.zip('/indir/fake1.js', '/out.zip')

    expect(archiver.mockFile).toHaveBeenCalledWith('/indir/fake1.js', { name: 'fake1.js' })
    expect(archiver.mockDirectory).toHaveBeenCalledTimes(0)
    expect(fs.existsSync('/out.zip')).toEqual(true)
  })

  test('should zip a file with pathInZip=some/path.js', async () => {
    global.fakeFileSystem.addJson({
      '/indir/fake1.js': '// js file 1',
      '/indir/fake2.js': '// js file 2'
    })

    await utils.zip('/indir/fake1.js', '/out.zip', 'some/path.js')

    expect(archiver.mockFile).toHaveBeenCalledWith('/indir/fake1.js', { name: 'some/path.js' })
    expect(archiver.mockDirectory).toHaveBeenCalledTimes(0)
    expect(fs.existsSync('/out.zip')).toEqual(true)
  })

  test('should fail if file does not exists', async () => {
    await expect(utils.zip('/notexist.js', '/out.zip')).rejects.toEqual(expect.objectContaining({
      message: expect.stringContaining('ENOENT')
    }))
    expect(archiver.mockFile).toHaveBeenCalledTimes(0)
    expect(archiver.mockDirectory).toHaveBeenCalledTimes(0)
    expect(fs.existsSync('/out.zip')).toEqual(false)
  })

  test('should fail if there is a stream error', async () => {
    global.fakeFileSystem.addJson({
      '/indir/fake1.js': '// js file 1',
      '/indir/fake2.js': '// js file 2'
    })
    archiver.setFakeError(new Error('fake stream error'))
    await expect(utils.zip('/indir/fake1.js', '/out.zip')).rejects.toThrow('fake stream error')
  })
})

describe('validateActionRuntime', () => {
  beforeEach(async () => {
  })

  test('all good', async () => {
    expect(() => utils.validateActionRuntime({ exec: { kind: 'nodejs:12' } })).not.toThrow()
    expect(() => utils.validateActionRuntime({ exec: { kind: 'nodejs:14' } })).not.toThrow()
  })

  test('invalid nodejs version', async () => {
    const func = () => utils.validateActionRuntime({ exec: { kind: 'nodejs:17' } })
    expect(func).toThrowError('Unsupported node version')
  })

  test('dumpActionsBuiltInfo might catch some errors under unlikely conditions', async () => {
    const circ = {}
    circ.circ = circ
    const func = () => utils.dumpActionsBuiltInfo('./last-built-actions.mock.txt', circ)
    await expect(func).rejects.toThrowError(TypeError)
  })

  test('getActionNameFromZipFile expected output', async () => {
    const actionZipName = 'actions-zip.zip'
    const expectedOutput = 'actions-zip'
    await expect(utils.getActionNameFromZipFile(actionZipName)).toEqual(expectedOutput)
  })

  test('getActionNameFromZipFile empty string', async () => {
    const actionZipName = 'actions-zip'
    const expectedOutput = ''
    await expect(utils.getActionNameFromZipFile(actionZipName)).toEqual(expectedOutput)
  })
  test('actionBuiltBefore would call logger on invalid data, (coverage)', () => {
    const loggerSpy = jest.spyOn(aioLogger, 'debug')
    const builtBefore = utils.actionBuiltBefore(null, null)
    expect(loggerSpy).toHaveBeenLastCalledWith('actionBuiltBefore > Invalid actionBuiltData')
    expect(builtBefore).toBe(false)
    const builtBefore1 = utils.actionBuiltBefore('', { someAction: undefined })
    expect(builtBefore1).toBe(false)
  })
  test('getActionZipFileName, defaultPkg:true  (coverage)', () => {
    expect(utils.getActionZipFileName('pk1', 'action', true)).toEqual('action')
  })
})

describe('getSupportedServerRuntimes', () => {
  const APIHOST = 'https://some-server.net'

  test('success', async () => {
    const result = {
      runtimes: {
        nodejs: [
          { kind: 'nodejs:14' },
          { kind: 'nodejs:16' }
        ]
      }
    }
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => result
    })

    await expect(utils.getSupportedServerRuntimes(APIHOST))
      .resolves.toEqual([
        'nodejs:14',
        'nodejs:16'
      ])
  })

  test('http error', async () => {
    mockFetch.mockResolvedValue({
      status: 403,
      ok: false
    })

    await expect(utils.getSupportedServerRuntimes(APIHOST))
      .rejects.toThrow('HTTP 403 - An error occurred when retrieving supported runtimes.')
  })

  test('json error', async () => {
    const result = {
      runtimes: {}
    }

    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: () => result
    })

    await expect(utils.getSupportedServerRuntimes(APIHOST))
      .rejects.toThrowError()
  })
})
