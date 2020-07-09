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
const fs = require('fs')
const cloneDeep = require('lodash.clonedeep')

jest.mock('cross-fetch')

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

beforeEach(() => {
  const json = {
    'file.json': global.fixtureFile('/trigger/parameters.json'),
    'hello.js': global.fixtureFile('/deploy/hello.js'),
    'goodbye.js': global.fixtureFile('/deploy/goodbye.js'),
    'basic_manifest.json': global.fixtureFile('/deploy/basic_manifest.json'),
    'basic_manifest_res.json': global.fixtureFile('/deploy/basic_manifest_res.json')
  }
  global.fakeFileSystem.addJson(json)
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
    expect(typeof utils.parsePathPattern).toEqual('function')

    expect(typeof utils.createKeyValueObjectFromArray).toEqual('function')
    expect(typeof utils.createKeyValueArrayFromObject).toEqual('function')
    expect(typeof utils.parsePackageName).toEqual('function')
    expect(typeof utils.createComponentsfromSequence).toEqual('function')
    expect(typeof utils.processInputs).toEqual('function')

    expect(typeof utils.createKeyValueInput).toEqual('function')
    expect(typeof utils.setManifestPath).toEqual('function')
    expect(typeof utils.returnUnion).toEqual('function')
    expect(typeof utils.returnDeploymentTriggerInputs).toEqual('function')
    expect(typeof utils.setDeploymentPath).toEqual('function')
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
    expect(typeof utils.findProjectHashonServer).toEqual('function')
    expect(typeof utils.getProjectHash).toEqual('function')
    expect(typeof utils.addManagedProjectAnnotations).toEqual('function')
    expect(typeof utils.printLogs).toEqual('function')
    expect(typeof utils.fileExtensionForKind).toEqual('function')
    expect(typeof utils.kindForFileExtension).toEqual('function')
  })
})

describe('createKeyValueArrayFromObject', () => {
  test('array of key:value (string) pairs', () => {
    const res = utils.createKeyValueArrayFromObject({ key1: 'val2' })
    expect(res).toMatchObject([{ key: 'key1', value: 'val2' }])
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

describe('createComponentsfromSequence', () => {
  test('sequence components', () => {
    const res = utils.createComponentsfromSequence(['a', 'p/b', '/ns/p/c', '/ns2/p/d', '/ns3/e'])
    expect(res).toMatchObject({
      kind: 'sequence',
      components: ['/_/a', '/_/p/b', '/ns/p/c', '/ns2/p/d', '/ns3/e']
    })
  })
})

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
  test('input = { I : { value: am } }, params = { I : { value: nitpicking } }', () => {
    // note: is this relevant?
    const res = utils.processInputs({ I: { value: 'am' } }, { I: { value: 'nitpicking' } })
    expect(res).toEqual({ I: { value: 'nitpicking' } })
  })
  test('input = { a : string, one : number, an: integer }, params = { }', () => {
    const res = utils.processInputs({ a: 'string', one: 'number', an: 'integer' }, { })
    expect(res).toEqual({ a: '', one: 0, an: 0 })
  })
  // eslint-disable-next-line no-template-curly-in-string
  test('input = { an: $undefEnvVar, a: $definedEnvVar, another: $definedEnvVar, the: ${definedEnvVar}, one: ${ definedEnvVar  } }, params = { a: 123 }', () => {
    process.env.definedEnvVar = 'giraffe'
    // eslint-disable-next-line no-template-curly-in-string
    const res = utils.processInputs({ an: '$undefEnvVar', a: '$definedEnvVar', another: '$definedEnvVar', the: '${definedEnvVar}', one: '${ definedEnvVar  }' }, { a: 123 })
    expect(res).toEqual({ a: 123, another: 'giraffe', an: '', the: 'giraffe', one: 'giraffe' })
    delete process.env.definedEnvVar
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

describe('setDeploymentPath', () => {
  let spy
  beforeEach(() => {
    spy = jest.spyOn(fs, 'existsSync')
  })

  afterEach(() => {
    spy.mockRestore()
  })
  test('no file exists', () => {
    const res = utils.setDeploymentPath()
    expect(res).toEqual(undefined)
  })

  test('./deployment.yaml exists', () => {
    spy.mockImplementation(f => f === './deployment.yaml')
    const res = utils.setDeploymentPath()
    expect(res).toEqual('deployment.yaml')
  })

  test('./deployment.yml exists', () => {
    spy.mockImplementation(f => f === './deployment.yml')
    const res = utils.setDeploymentPath()
    expect(res).toEqual('deployment.yml')
  })

  test('./deployment.yaml and ./deployment.yml exists', () => {
    spy.mockImplementation(f => f === './deployment.yaml' || f === './deployment.yml')
    const res = utils.setDeploymentPath()
    expect(res).toEqual('deployment.yaml')
  })
})

describe('setManifestPath', () => {
  let spy
  beforeEach(() => {
    spy = jest.spyOn(fs, 'existsSync')
  })

  afterEach(() => {
    spy.mockRestore()
  })

  test('no file exists', () => {
    expect(() => utils.setManifestPath()).toThrow('Manifest file not found')
  })

  test('./manifest.yaml exists', () => {
    spy.mockImplementation(f => f === './manifest.yaml')
    const res = utils.setManifestPath()
    expect(res).toEqual('manifest.yaml')
  })

  test('./manifest.yml exists', () => {
    spy.mockImplementation(f => f === './manifest.yml')
    const res = utils.setManifestPath()
    expect(res).toEqual('manifest.yml')
  })

  test('./manifest.yaml and ./manifest.yml exists', () => {
    spy.mockImplementation(f => f === './manifest.yaml' || f === './manifest.yml')
    const res = utils.setManifestPath()
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
    expect(res).toEqual({ 'web-export': false, 'raw-http': false })
  })
  test('action = { web: false, annotations: { raw-http: true } }', () => {
    const res = utils.returnAnnotations({ web: false, annotations: { 'raw-http': true } })
    expect(res).toEqual({ 'web-export': false, 'raw-http': false })
  })
  test('action = { web: false, annotations: { require-whisk-auth: true } }', () => {
    const res = utils.returnAnnotations({ web: false, annotations: { 'require-whisk-auth': true } })
    expect(res).toEqual({ 'web-export': false, 'raw-http': false })
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
describe('createSequenceObject', () => { /* TODO */ })

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
    global.fakeFileSystem.addJson({ 'manifest.yml': 'some yaml here' })
    expect(() => utils.setPaths())
      .toThrowError('Manifest file not found')
  })
})

describe('createActionObject', () => { /* TODO */ })

describe('deployPackage', () => {
  test('basic manifest', async () => {
    const imsOrgId = 'MyIMSOrgId'
    const mockLogger = jest.fn()
    const cmdPkg = ow.mockResolved(owPackage, '')
    const cmdAction = ow.mockResolved(owAction, '')
    const cmdAPI = ow.mockResolved(owAPI, '')
    const cmdTrigger = ow.mockResolved(owTriggers, '')
    const cmdRule = ow.mockResolved(owRules, '')
    ow.mockResolvedProperty('actions.client.options', { apiKey: 'my-key', namespace: 'my-namespace' })

    const rp = require('cross-fetch')
    rp.mockImplementation(() => ({
      ok: true,
      json: jest.fn()
    }))

    await utils.deployPackage(JSON.parse(fs.readFileSync('/basic_manifest_res.json')), ow, mockLogger, imsOrgId)
    expect(cmdPkg).toHaveBeenCalledWith(expect.objectContaining({ name: 'hello' }))
    expect(cmdPkg).toHaveBeenCalledWith(expect.objectContaining({ name: 'mypackage', package: { binding: { name: 'oauth', namespace: 'adobeio' } } }))
    expect(cmdAction).toHaveBeenCalled()
    expect(cmdAPI).toHaveBeenCalled()
    expect(cmdTrigger).toHaveBeenCalled()
    expect(cmdRule).toHaveBeenCalled()

    // this assertion is specific to the tmp implementation of the require-adobe-annotation
    const mockFetch = require('cross-fetch')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://adobeio.adobeioruntime.net/api/v1/web/state/put',
      {
        body: '{"namespace":"my-namespace","key":"__aio","value":{"project":{"org":{"ims_org_id":"MyIMSOrgId"}}},"ttl":-1}',
        headers: { Authorization: 'Basic bXkta2V5', 'Content-Type': 'application/json' },
        method: 'post'
      })
  })

  test('basic manifest (fetch error)', async () => {
    // this test is specific to the tmp implementation of the require-adobe-annotation
    const imsOrgId = 'MyIMSOrgId'
    const mockLogger = jest.fn()
    ow.mockResolvedProperty('actions.client.options', { apiKey: 'my-key', namespace: 'my-namespace' })

    const rp = require('cross-fetch')
    const res = {
      ok: false,
      status: 403,
      json: jest.fn()
    }
    rp.mockImplementation(() => res)

    await expect(utils.deployPackage(JSON.parse(fs.readFileSync('/basic_manifest_res.json')), ow, mockLogger, imsOrgId))
      .rejects.toThrowError(`failed setting ims_org_id=${imsOrgId} into state lib, received status=${res.status}, please make sure your runtime credentials are correct`)
  })

  test('basic manifest (no IMS Org Id)', async () => {
    // this test is specific to the tmp implementation of the require-adobe-annotation
    const mockLogger = jest.fn()

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
  test('basic manifest', async () => {
    const entities = utils.processPackage(JSON.parse(fs.readFileSync('/basic_manifest.json')), {}, {}, {})
    expect(entities).toMatchObject(JSON.parse(fs.readFileSync('/basic_manifest_res.json')))
  })
  // the adobe auth annotation is a temporarily implemented on the client side
  // simply remove this test when the feature will be moved server side, to I/O Runtime
  test('manifest with adobe auth annotation', () => {
    const HEADLESS_VALIDATOR = '/adobeio/shared-validators-v1/headless'
    const spy = jest.spyOn(fs, 'readFileSync')
    const fakeCode = 'fake action code'
    spy.mockImplementation(() => fakeCode)
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

    // does not rewrite if apihost is not 'https://adobeioruntime.net'
    let res = utils.processPackage(basicPackage, {}, {}, {}, false, {})
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/theaction', annotations: { 'web-export': true }, action: fakeCode }
      ],
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
      actions: [
        { name: 'pkg1/theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode }
      ],
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

    // 1 action using the annotation + rewrite deployment package
    const deploymentPackages = { pkg1: { actions: { theaction: { inputs: { a: 1 } } } } }
    res = utils.processPackage(basicPackage, deploymentPackages, {}, {}, false, { apihost: 'https://adobeioruntime.net' })
    expect(res).toEqual({
      actions: [
        { name: 'pkg1/__secured_theaction', annotations: { 'web-export': false, 'raw-http': false }, action: fakeCode, params: { a: 1 } },
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
    ow.mockResolved('packages.list', [resultObject]) // for findProjectHashonServer
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
  test('array of key:value (object) pairs', () => {
    const res = utils.createKeyValueArrayFromFlag(['name1', '["val0","val1"]', 'name2', 'val2'])
    expect(typeof res[0].value).toEqual('object')
    expect(res).toMatchObject([{ key: 'name1', value: ['val0', 'val1'] }, { key: 'name2', value: 'val2' }])
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
    expect(result).toBe('24bfd6809c3d11723ec10681c09a15e886f2b55f')
  })
})

describe('findProjectHashonServer', () => {
  test('default projectHash (not found anywhere in packages, actions, triggers, rules)', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    // const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', '')
    const actList = ow.mockResolved('actions.list', '')
    const trgList = ow.mockResolved('triggers.list', '')
    const rlzList = ow.mockResolved('rules.list', '')
    const result = await utils.findProjectHashonServer(ow, testProjectName)
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
    const result = await utils.findProjectHashonServer(ow, testProjectName)
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
    const result = await utils.findProjectHashonServer(ow, testProjectName)
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
    const result = await utils.findProjectHashonServer(ow, testProjectName)
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
    const result = await utils.findProjectHashonServer(ow, testProjectName)
    expect(pkgList).toHaveBeenCalled()
    expect(actList).toHaveBeenCalled()
    expect(trgList).toHaveBeenCalled()
    expect(rlzList).toHaveBeenCalled()
    expect(result).toBe('projectHash')
  })
})

describe('fileExtensionForKind', () => {
  test('map action kind to file extension', () => {
    expect(utils.fileExtensionForKind('ballerina:abc')).toEqual('.bal')
    expect(utils.fileExtensionForKind('dotnet:abc')).toEqual('.cs')
    expect(utils.fileExtensionForKind('go:abc')).toEqual('.go')
    expect(utils.fileExtensionForKind('java:abc')).toEqual('.java')
    expect(utils.fileExtensionForKind('nodejs:abc')).toEqual('.js')
    expect(utils.fileExtensionForKind('php:abc')).toEqual('.php')
    expect(utils.fileExtensionForKind('python:abc')).toEqual('.py')
    expect(utils.fileExtensionForKind('ruby:abc')).toEqual('.rb')
    expect(utils.fileExtensionForKind('rust:abc')).toEqual('.rs')
    expect(utils.fileExtensionForKind('swift:abc')).toEqual('.swift')

    // all kinds are colon separated but test defensively anyway
    expect(utils.fileExtensionForKind('swift')).toEqual('.swift')

    // unknown kinds return ''
    expect(utils.fileExtensionForKind('???:???')).toEqual('')
    expect(utils.fileExtensionForKind('???')).toEqual('')
    expect(utils.fileExtensionForKind('')).toEqual('')
    expect(utils.fileExtensionForKind(undefined)).toEqual('')
  })
})

describe('kindForFileExtension', () => {
  test('map action kind to file extension', () => {
    expect(utils.kindForFileExtension('f.bal')).toEqual('ballerina:default')
    expect(utils.kindForFileExtension('f.cs')).toEqual('dotnet:default')
    expect(utils.kindForFileExtension('f.go')).toEqual('go:default')
    expect(utils.kindForFileExtension('f.java')).toEqual('java:default')
    expect(utils.kindForFileExtension('f.js')).toEqual('nodejs:default')
    expect(utils.kindForFileExtension('f.php')).toEqual('php:default')
    expect(utils.kindForFileExtension('f.py')).toEqual('python:default')
    expect(utils.kindForFileExtension('f.rb')).toEqual('ruby:default')
    expect(utils.kindForFileExtension('f.rs')).toEqual('rust:default')
    expect(utils.kindForFileExtension('f.swift')).toEqual('swift:default')

    expect(utils.kindForFileExtension(undefined)).toEqual(undefined)
    expect(utils.kindForFileExtension('')).toEqual(undefined)
    expect(utils.kindForFileExtension('.')).toEqual(undefined)
    expect(utils.kindForFileExtension('.js')).toEqual(undefined)
    expect(utils.kindForFileExtension('???')).toEqual(undefined)
  })
})
