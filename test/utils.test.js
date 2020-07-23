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
const os = require('os')

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
    'basic_manifest_res.json': global.fixtureFile('/deploy/basic_manifest_res.json'),
    'basic_manifest_res_namesonly.json': global.fixtureFile('/deploy/basic_manifest_res_namesonly.json')
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
    expect(typeof utils.findProjectHashonServer).toEqual('function')
    expect(typeof utils.getProjectHash).toEqual('function')
    expect(typeof utils.addManagedProjectAnnotations).toEqual('function')
    expect(typeof utils.printLogs).toEqual('function')
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
  const HEADLESS_VALIDATOR = '/adobeio/shared-validators-v1/headless'
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

  test('basic manifest with namesOnly flag', async () => {
    const entities = utils.processPackage(JSON.parse(fs.readFileSync('/basic_manifest.json')), {}, {}, {}, true, {})
    expect(entities).toMatchObject(JSON.parse(fs.readFileSync('/basic_manifest_res_namesonly.json')))
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
  test('default projectHash (no packages, actions, triggers, rules found)', async () => {
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

  test('default projectHash (empty annotations in existing packages, actions, triggers, rules)', async () => {
    const testProjectName = 'ThisIsTheNameOfTheProject'
    // const resultObject = [{ annotations: [{ key: 'whisk-managed', value: { projectName: testProjectName, projectHash: 'projectHash' } }] }]
    const pkgList = ow.mockResolved('packages.list', [{ annotations: [] }])
    const actList = ow.mockResolved('actions.list', [{ annotations: [] }])
    const trgList = ow.mockResolved('triggers.list', [{ annotations: [] }])
    const rlzList = ow.mockResolved('rules.list', [{ annotations: [] }])
    const result = await utils.findProjectHashonServer(ow, testProjectName)
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
