/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const undeployActions = require('../src/undeploy-actions')
const runtimeLibUtils = require('../src/utils')
runtimeLibUtils.getProjectEntities = jest.fn()
runtimeLibUtils.processPackage = jest.fn()
runtimeLibUtils.undeployPackage = jest.fn()

jest.mock('../src/RuntimeAPI')
const ioruntime = require('../src/RuntimeAPI')
const owGetPackageMock = jest.fn()
const owListActionsMock = jest.fn()
const owMock = {
  packages: {
    get: owGetPackageMock
  },
  actions: {
    list: owListActionsMock
  }
}
ioruntime.mockImplementation(() => {
  return {
    init: () => {
      return owMock
    }
  }
})

beforeEach(async () => {
  // create test app
  global.addSampleAppFiles()
  ioruntime.mockClear()
  owGetPackageMock.mockReset()
  owListActionsMock.mockReset()
  runtimeLibUtils.getProjectEntities.mockReset()
  runtimeLibUtils.processPackage.mockReset()
  runtimeLibUtils.undeployPackage.mockReset()
})

const setOwGetPackageMockResponse = (packageName, actions) => {
  owGetPackageMock.mockResolvedValue({
    actions: actions.map(actionName => ({
      name: actionName
    })),
    annotations: [],
    binding: {},
    feeds: [],
    name: packageName,
    namespace: global.fakeConfig.tvm.runtime.namespace,
    parameters: [],
    publish: false,
    version: '0.0.17'
  })
}

const setOwListActionsMockResponse = (actions) => {
  owListActionsMock.mockResolvedValue(actions.map(action => ({
    name: action.name,
    namespace: action.namespace
  })))
}

const setRuntimeGetProjectEntitiesMock = (packageName, actions) => {
  runtimeLibUtils.getProjectEntities.mockResolvedValue({
    actions: actions.map(actionName => ({
      name: (packageName === runtimeLibUtils.DEFAULT_PACKAGE_RESERVED_NAME) ? actionName : (packageName + '/' + actionName)
    })),
    triggers: [],
    rules: [],
    pkgAndDeps: [], // does not include the name of current package (only dependencies)
    apis: [] // always empty as apis have not the whisk-managed annotation
  })
}

afterEach(() => global.fakeFileSystem.reset())

test('should fail if the app package is not deployed', async () => {
  owGetPackageMock.mockRejectedValue({ statusCode: 404 })
  await expect(undeployActions(global.sampleAppConfig)).rejects.toEqual(expect.objectContaining({
    message: expect.stringContaining('cannot undeploy actions for package sample-app-1.0.0, as it was not deployed')
  }))
})

test('should fail if openwhisk.package.get fails', async () => {
  owGetPackageMock.mockRejectedValue(new Error('fake'))
  await expect(undeployActions(global.sampleAppConfig)).rejects.toEqual(expect.objectContaining({
    message: expect.stringContaining('fake')
  }))
})

test('should undeploy two already deployed actions', async () => {
  setOwGetPackageMockResponse('sample-app-1.0.0', ['action', 'action-zip'])
  setRuntimeGetProjectEntitiesMock('sample-app-1.0.0', ['action', 'action-zip'])
  runtimeLibUtils.processPackage.mockReturnValue({ apis: [], rules: [] })

  const expectedEntities = {
    actions: [{ name: 'sample-app-1.0.0/action' }, { name: 'sample-app-1.0.0/action-zip' }],
    pkgAndDeps: [],
    triggers: [],
    rules: [],
    apis: []
  }

  await undeployActions(global.sampleAppConfig)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledWith(expectedEntities, owMock, expect.anything())
})

test('should undeploy already deployed actions (default package)', async () => {
  setOwListActionsMockResponse([
    { name: 'action', namespace: 'foxy-bear-123' },
    { name: 'someaction', namespace: 'foxy-bear-123/somepackage' }
  ])
  setRuntimeGetProjectEntitiesMock('default', ['action'])
  runtimeLibUtils.processPackage.mockReturnValue({ apis: [], rules: [] })

  const expectedEntities = {
    actions: [{ name: 'action' }],
    pkgAndDeps: [],
    triggers: [],
    rules: [],
    apis: []
  }

  await undeployActions(global.sampleAppDefaultPackageConfig)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledWith(expectedEntities, owMock, expect.anything())
})

test('should undeploy actions that are not managed but part of a deployed app package (e.g. junk wskdebug action)', async () => {
  setOwGetPackageMockResponse('sample-app-1.0.0', ['action', 'action-zip', 'fake-wskdebug-action'])
  setRuntimeGetProjectEntitiesMock('sample-app-1.0.0', ['action', 'action-zip'])
  runtimeLibUtils.processPackage.mockReturnValue({ apis: [], rules: [] })

  const expectedEntities = {
    actions: [{ name: 'sample-app-1.0.0/action' }, { name: 'sample-app-1.0.0/action-zip' }, { name: 'sample-app-1.0.0/fake-wskdebug-action' }],
    pkgAndDeps: [],
    triggers: [],
    rules: [],
    apis: []
  }

  await undeployActions(global.sampleAppConfig)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledWith(expectedEntities, owMock, expect.anything())
})

test('should undeploy apis defined in the manifest', async () => {
  setOwGetPackageMockResponse('sample-app-1.0.0', [])
  setRuntimeGetProjectEntitiesMock('sample-app-1.0.0', [])
  runtimeLibUtils.processPackage.mockReturnValue({ apis: [{ name: 'fake', basepath: '/fake', relpath: '/path/to/endpoint' }], rules: [] })

  const expectedEntities = {
    actions: [],
    pkgAndDeps: [],
    triggers: [],
    rules: [],
    apis: [{ name: 'fake', basepath: '/fake', relpath: '/path/to/endpoint' }]
  }

  await undeployActions(global.sampleAppConfig)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledWith(expectedEntities, owMock, expect.anything())
})

test('should undeploy apis defined in the manifest with named package', async () => {
  global.addNamedPackageFiles()

  setOwGetPackageMockResponse('bobby-mcgeee', [])
  setRuntimeGetProjectEntitiesMock('bobby-mcgeee', [])
  runtimeLibUtils.processPackage.mockReturnValue({ apis: [{ name: 'fake', basepath: '/fake', relpath: '/path/to/endpoint' }], rules: [] })

  const expectedEntities = {
    actions: [],
    pkgAndDeps: [],
    triggers: [],
    rules: [],
    apis: [{ name: 'fake', basepath: '/fake', relpath: '/path/to/endpoint' }]
  }

  await undeployActions(global.namedPackageConfig)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledWith(expectedEntities, owMock, expect.anything())
})

test('should undeploy rules defined in the manifest', async () => {
  setOwGetPackageMockResponse('sample-app-1.0.0', [])
  setRuntimeGetProjectEntitiesMock('sample-app-1.0.0', [])
  runtimeLibUtils.processPackage.mockReturnValue({ apis: [], rules: [{ name: 'fakeRule' }] })

  const expectedEntities = {
    actions: [],
    pkgAndDeps: [],
    triggers: [],
    rules: [{ name: 'fakeRule' }],
    apis: []
  }

  await undeployActions(global.sampleAppConfig)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledWith(expectedEntities, owMock, expect.anything())
})

test('should undeploy rules defined in the manifest with named package', async () => {
  global.addNamedPackageFiles()

  setOwGetPackageMockResponse('bobby-mcgeee', [])
  setRuntimeGetProjectEntitiesMock('bobby-mcgeee', [])
  runtimeLibUtils.processPackage.mockReturnValue({ apis: [], rules: [{ name: 'fakeRule' }] })

  const expectedEntities = {
    actions: [],
    pkgAndDeps: [],
    triggers: [],
    rules: [{ name: 'fakeRule' }],
    apis: []
  }

  await undeployActions(global.namedPackageConfig)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledWith(expectedEntities, owMock, expect.anything())
})

test('should not attempt to undeploy actions that are defined in manifest but not deployed', async () => {
  setOwGetPackageMockResponse('sample-app-1.0.0', [])
  setRuntimeGetProjectEntitiesMock('sample-app-1.0.0', [])
  runtimeLibUtils.processPackage.mockReturnValue({ apis: [], actions: [{ name: 'fake-action' }], rules: [] })

  const expectedEntities = {
    actions: [],
    pkgAndDeps: [],
    triggers: [],
    rules: [],
    apis: []
  }

  await undeployActions(global.sampleAppConfig)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.undeployPackage).toHaveBeenCalledWith(expectedEntities, owMock, expect.anything())
})

test('No backend is present', async () => {
  global.sampleAppConfig.app.hasBackend = false
  await expect(undeployActions(global.sampleAppConfig)).rejects.toThrow('cannot undeploy actions, app has no backend')
})
