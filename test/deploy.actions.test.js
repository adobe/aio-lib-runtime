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

const path = require('path')
const deployActions = require('../src/deploy-actions')
const runtimeLibUtils = require('../src/utils')
// jest.mock('@adobe/aio-lib-runtime')
runtimeLibUtils.processPackage = jest.fn()
runtimeLibUtils.syncProject = jest.fn()

jest.mock('../src/RuntimeAPI')
const ioruntime = require('../src/RuntimeAPI')
ioruntime.mockImplementation(() => {
  return {
    init: () => {
      return { fake: 'ow' }
    }
  }
})
const deepCopy = require('lodash.clonedeep')

afterEach(() => global.fakeFileSystem.reset())

beforeEach(() => {
  // mockAIOConfig.get.mockReset()
  runtimeLibUtils.processPackage.mockReset()
  runtimeLibUtils.syncProject.mockReset()
})

const expectedDistManifest = {
  packages: {
    'sample-app-1.0.0': {
      license: 'Apache-2.0',
      version: '1.0.0',
      actions: {
        action: {
          function: path.normalize('dist/actions/action.zip'),
          runtime: 'nodejs:12',
          web: 'yes'
        },
        'action-zip': {
          function: path.normalize('dist/actions/action-zip.zip'),
          runtime: 'nodejs:12',
          web: 'yes'
        }
      },
      sequences: {
        'action-sequence': {
          actions: 'action, action-zip',
          web: 'yes'
        }
      },
      triggers: {
        trigger1: null
      },
      rules: {
        rule1: {
          trigger: 'trigger1',
          action: 'action',
          rule: true
        }
      },
      apis: {
        api1: {
          base: {
            path: {
              action: {
                method: 'get'
              }
            }
          }
        }
      },
      dependencies: {
        dependency1: {
          location: 'fake.com/package'
        }
      }
    }
  }
}

const expectedOWOptions = { api_key: 'fake:auth', apihost: 'https://adobeioruntime.net', apiversion: 'v1', namespace: 'fake_ns' }

const mockEntities = { fake: true }
//   pkgAndDeps: [{ name: 'sample-app-1.0.0' }, { name: 'dep' }],
//   actions: [{ name: 'sample-app-1.0.0/action' }],
//   triggers: [{ name: 'trigger' }],
//   apis: [{ name: 'api' }],
//   rules: [{ name: 'rule' }]
// }

test('deploy full manifest', async () => {
  addSampleAppFiles()
  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))

  const buildDir = global.sampleAppConfig.actions.dist
  // fake a previous build
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)

  await deployActions(global.sampleAppConfig)

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedDistManifest.packages, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('sample-app-1.0.0', path.resolve('/manifest.yml'), expectedDistManifest, mockEntities, { fake: 'ow' }, expect.anything(), undefined, true)
})

test('deploy full manifest with package name specified', async () => {
  addNamedPackageFiles()
  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))

  const expectedNamedPackage = {
    'bobby-mcgee': expectedDistManifest.packages['sample-app-1.0.0']
  }

  const buildDir = global.namedPackageConfig.actions.dist
  // fake a previous build
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)

  await deployActions(global.namedPackageConfig)

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedNamedPackage, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('bobby-mcgee', path.resolve('/manifest.yml'), { packages: expectedNamedPackage }, mockEntities, { fake: 'ow' }, expect.anything(), undefined, true)
})

test('use deployConfig.filterEntities to deploy only one action', async () => {
  addSampleAppFiles()
  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))

  const buildDir = global.sampleAppConfig.actions.dist
  // fake a previous build
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)

  await deployActions(global.sampleAppConfig, {
    filterEntities: {
      actions: ['action']
    }
  })

  const expectedDistPackagesFiltered = {
    'sample-app-1.0.0': {
      license: 'Apache-2.0',
      version: '1.0.0',
      actions: {
        action: {
          function: path.normalize('dist/actions/action.zip'),
          runtime: 'nodejs:12',
          web: 'yes'
        }
      }
    }
  }

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedDistPackagesFiltered, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('sample-app-1.0.0', path.resolve('/manifest.yml'), expectedDistManifest, mockEntities, { fake: 'ow' }, expect.anything(), undefined, false)
})

test('use deployConfig.filterEntities to deploy only one trigger and one action', async () => {
  addSampleAppFiles()
  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))

  const buildDir = global.sampleAppConfig.actions.dist
  // fake a previous build
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)

  await deployActions(global.sampleAppConfig, {
    filterEntities: {
      actions: ['action'],
      triggers: ['trigger1']
    }
  })

  const expectedDistPackagesFiltered = {
    'sample-app-1.0.0': {
      license: 'Apache-2.0',
      version: '1.0.0',
      actions: {
        action: {
          function: path.normalize('dist/actions/action.zip'),
          runtime: 'nodejs:12',
          web: 'yes'
        }
      },
      triggers: {
        trigger1: null
      }
    }
  }

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedDistPackagesFiltered, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('sample-app-1.0.0', path.resolve('/manifest.yml'), expectedDistManifest, mockEntities, { fake: 'ow' }, expect.anything(), undefined, false)
})

test('use deployConfig.filterEntities to deploy only one trigger and one action and one rule', async () => {
  addSampleAppFiles()
  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))
  const buildDir = global.sampleAppConfig.actions.dist
  // fake a previous build
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)

  await deployActions(global.sampleAppConfig, {
    filterEntities: {
      actions: ['action'],
      triggers: ['trigger1'],
      rules: ['rule1']
    }
  })

  const expectedDistPackagesFiltered = {
    'sample-app-1.0.0': {
      license: 'Apache-2.0',
      version: '1.0.0',
      actions: {
        action: {
          function: path.normalize('dist/actions/action.zip'),
          runtime: 'nodejs:12',
          web: 'yes'
        }
      },
      triggers: {
        trigger1: null
      },
      rules: {
        rule1: {
          trigger: 'trigger1',
          action: 'action',
          rule: true
        }
      }
    }
  }

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedDistPackagesFiltered, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('sample-app-1.0.0', path.resolve('/manifest.yml'), expectedDistManifest, mockEntities, { fake: 'ow' }, expect.anything(), undefined, false)
})

test('use deployConfig.filterEntities to deploy only one action and one api', async () => {
  addSampleAppFiles()
  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))
  const buildDir = global.sampleAppConfig.actions.dist
  // fake a previous build
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)

  await deployActions(global.sampleAppConfig, {
    filterEntities: {
      actions: ['action'],
      apis: ['api1']
    }
  })

  const expectedDistPackagesFiltered = {
    'sample-app-1.0.0': {
      license: 'Apache-2.0',
      version: '1.0.0',
      actions: {
        action: {
          function: path.normalize('dist/actions/action.zip'),
          runtime: 'nodejs:12',
          web: 'yes'
        }
      },
      apis: {
        api1: {
          base: {
            path: {
              action: {
                method: 'get'
              }
            }
          }
        }
      }
    }
  }

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedDistPackagesFiltered, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('sample-app-1.0.0', path.resolve('/manifest.yml'), expectedDistManifest, mockEntities, { fake: 'ow' }, expect.anything(), undefined, false)
})

test('use deployConfig.filterEntities to deploy only two actions and one sequence', async () => {
  addSampleAppFiles()
  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))

  const buildDir = global.sampleAppConfig.actions.dist
  // fake a previous build
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)

  await deployActions(global.sampleAppConfig, {
    filterEntities: {
      actions: ['action', 'action-zip'],
      sequences: ['action-sequence']
    }
  })

  const expectedDistPackagesFiltered = {
    'sample-app-1.0.0': {
      license: 'Apache-2.0',
      version: '1.0.0',
      actions: {
        action: {
          function: path.normalize('dist/actions/action.zip'),
          runtime: 'nodejs:12',
          web: 'yes'
        },
        'action-zip': {
          function: path.normalize('dist/actions/action-zip.zip'),
          runtime: 'nodejs:12',
          web: 'yes'
        }
      },
      sequences: {
        'action-sequence': {
          actions: 'action, action-zip',
          web: 'yes'
        }
      }
    }
  }

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedDistPackagesFiltered, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('sample-app-1.0.0', path.resolve('/manifest.yml'), expectedDistManifest, mockEntities, { fake: 'ow' }, expect.anything(), undefined, false)
})

test('use deployConfig.filterEntities to deploy only one pkg dependency', async () => {
  addSampleAppFiles()
  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))

  const buildDir = global.sampleAppConfig.actions.dist
  // fake a previous build
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)

  await deployActions(global.sampleAppConfig, {
    filterEntities: {
      dependencies: ['dependency1']
    }
  })

  const expectedDistPackagesFiltered = {
    'sample-app-1.0.0': {
      license: 'Apache-2.0',
      version: '1.0.0',
      dependencies: {
        dependency1: {
          location: 'fake.com/package'
        }
      }
    }
  }

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedDistPackagesFiltered, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('sample-app-1.0.0', path.resolve('/manifest.yml'), expectedDistManifest, mockEntities, { fake: 'ow' }, expect.anything(), undefined, false)
})

test('use deployConfig.filterEntities on non existing pkgEntity should work', async () => {
  addSampleAppReducedFiles()

  runtimeLibUtils.processPackage.mockReturnValue(deepCopy(mockEntities))
  const buildDir = global.sampleAppReducedConfig.actions.dist
  // fake a previous build
  addFakeFiles(buildDir)

  await deployActions(global.sampleAppReducedConfig, {
    filterEntities: {
      triggers: ['trigger1'],
      sequences: ['notexisting']
    }
  })

  const expectedDistReducedManifest = {
    packages: {
      'sample-app-reduced-1.0.0': {
        license: 'Apache-2.0',
        version: '1.0.0',
        actions: {
          action: {
            function: path.normalize('dist/actions/action.zip'),
            runtime: 'nodejs:12',
            web: 'yes'
          }
        },
        triggers: {
          trigger1: null
        }
      }
    }
  }
  const expectedDistPackagesFiltered = {
    'sample-app-reduced-1.0.0': {
      license: 'Apache-2.0',
      version: '1.0.0',
      triggers: {
        trigger1: null
      }
    }
  }

  expect(runtimeLibUtils.processPackage).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.processPackage).toHaveBeenCalledWith(expectedDistPackagesFiltered, {}, {}, {}, false, expectedOWOptions)

  expect(runtimeLibUtils.syncProject).toHaveBeenCalledTimes(1)
  expect(runtimeLibUtils.syncProject).toHaveBeenCalledWith('sample-app-reduced-1.0.0', path.resolve('/manifest.yml'), expectedDistReducedManifest, mockEntities, { fake: 'ow' }, expect.anything(), undefined, false)
})

test('Deploy actions should fail if there are no build files and no filters', async () => {
  addSampleAppFiles()
  await expect(deployActions(global.sampleAppConfig))
    .rejects.toThrow('missing files in dist')
})

test('Deploy actions should fail if there are no build files and action filter', async () => {
  addSampleAppFiles()
  await expect(deployActions(global.sampleAppConfig, { filterEntities: { actions: ['action', 'action-zip'] } }))
    .rejects.toThrow('missing files in dist')
})

test('Deploy actions should pass if there are no build files and filter does not include actions', async () => {
  addSampleAppFiles()
  runtimeLibUtils.processPackage.mockReturnValue({})
  await expect(deployActions(global.sampleAppConfig, { filterEntities: { triggers: ['trigger1'] } })).resolves.toEqual({})
})

test('if actions are deployed and part of the manifest it should return their url', async () => {
  addSampleAppReducedFiles()

  // mock deployed entities
  runtimeLibUtils.processPackage.mockReturnValue({
    actions: [
      { name: 'pkg/action' }, // must be referenced in fixture manifest file
      { name: 'pkg/actionNotInManifest' }
    ]
  })

  const buildDir = global.sampleAppReducedConfig.actions.dist
  // fake a previous build
  addFakeFiles(buildDir)

  const returnedEntities = await deployActions(global.sampleAppReducedConfig)

  expect(returnedEntities).toEqual({
    actions: [
      {
        name: 'pkg/action',
        // no UI in sample-app reduced so url is pointing to adobeioruntime instead of cdn
        url: 'https://fake_ns.adobeioruntime.net/api/v1/web/sample-app-reduced-1.0.0/action'
      },
      { name: 'pkg/actionNotInManifest' }
    ]
  })
})

test('if actions are deployed with custom package and part of the manifest it should return their url', async () => {
  addNamedPackageFiles()

  // mock deployed entities
  runtimeLibUtils.processPackage.mockReturnValue({
    actions: [
      { name: 'pkg/action' }, // must be referenced in fixture manifest file
      { name: 'pkg/actionNotInManifest' }
    ]
  })

  const buildDir = global.namedPackageConfig.actions.dist
  // fake a previous build
  addFakeFiles(buildDir)

  const returnedEntities = await deployActions(global.namedPackageConfig)

  expect(returnedEntities).toEqual({
    actions: [
      {
        name: 'pkg/action',
        url: 'https://fake_ns.adobeio-static.net/api/v1/web/bobby-mcgee/action'
      },
      { name: 'pkg/actionNotInManifest' }
    ]
  })
})

test('if actions are deployed with the headless validator and there is a UI it should rewrite the sequence with the app-registry validator', async () => {
  addSampleAppFiles()

  // mock deployed entities
  runtimeLibUtils.processPackage.mockReturnValue({
    actions: [
      { name: 'pkg/sequence', exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/not-headless', 'pkg/action'] } },
      { name: 'pkg/sequenceToReplace', exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/headless', 'pkg/action'] } }
    ]
  })

  const buildDir = global.sampleAppConfig.actions.dist
  // fake a previous build
  addFakeFiles(buildDir)

  const returnedEntities = await deployActions(global.sampleAppConfig)

  expect(returnedEntities).toEqual({
    actions: [
      {
        name: 'pkg/sequence',
        exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/not-headless', 'pkg/action'] }
        // no url cause not referenced in manifest
      },
      {
        name: 'pkg/sequenceToReplace',
        exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/app-registry', 'pkg/action'] }
      }
    ]
  })
})

test('if actions are deployed with the headless validator and there is no UI it should NOT rewrite the sequence with the app-registry validator', async () => {
  addSampleAppReducedFiles()

  // mock deployed entities
  runtimeLibUtils.processPackage.mockReturnValue({
    actions: [
      { name: 'pkg/sequence', exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/not-headless', 'pkg/action'] } },
      { name: 'pkg/sequenceToReplace', exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/headless', 'pkg/action'] } }
    ]
  })

  const buildDir = global.sampleAppReducedConfig.actions.dist
  // fake a previous build
  addFakeFiles(buildDir)

  const returnedEntities = await deployActions(global.sampleAppReducedConfig)

  expect(returnedEntities).toEqual({
    actions: [
      {
        name: 'pkg/sequence',
        exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/not-headless', 'pkg/action'] }
        // no url cause not referenced in manifest
      },
      {
        name: 'pkg/sequenceToReplace',
        exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/headless', 'pkg/action'] }
      }
    ]
  })
})

test('if actions are deployed with the headless validator and custom package and there is a UI it should rewrite the sequence with the app-registry validator', async () => {
  addNamedPackageFiles()

  // mock deployed entities
  runtimeLibUtils.processPackage.mockReturnValue({
    actions: [
      { name: 'pkg/sequence', exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/not-headless', 'pkg/action'] } },
      { name: 'pkg/sequenceToReplace', exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/headless', 'pkg/action'] } }
    ]
  })

  const buildDir = global.namedPackageConfig.actions.dist
  // fake a previous build
  addFakeFiles(buildDir)

  const returnedEntities = await deployActions(global.namedPackageConfig)

  expect(returnedEntities).toEqual({
    actions: [
      {
        name: 'pkg/sequence',
        exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/not-headless', 'pkg/action'] }
        // no url cause not referenced in manifest
      },
      {
        name: 'pkg/sequenceToReplace',
        exec: { kind: 'sequence', components: ['/adobeio/shared-validators-v1/app-registry', 'pkg/action'] }
      }
    ]
  })
})

test('No backend is present', async () => {
  addSampleAppFiles()
  // vol.unlinkSync('./manifest.yml')
  global.sampleAppConfig.app.hasBackend = false

  await expect(deployActions(global.sampleAppConfig)).rejects.toThrow('cannot deploy actions, app has no backend')
})

/**
 *
 */
function addSampleAppFiles () {
  global.fakeFileSystem.addJson({
    'actions/action-zip/index.js': global.fixtureFile('/sample-app/actions/action-zip/index.js'),
    'actions/action-zip/package.json': global.fixtureFile('/sample-app/actions/action-zip/package.json'),
    'actions/action.js': global.fixtureFile('/sample-app/actions/action.js'),
    'web-src/index.html': global.fixtureFile('/sample-app/web-src/index.html'),
    'manifest.yml': global.fixtureFile('/sample-app/manifest.yml'),
    'package.json': global.fixtureFile('/sample-app/package.json')
  })
}

/**
 *
 */
function addNamedPackageFiles () {
  global.fakeFileSystem.addJson({
    'actions/action-zip/index.js': global.fixtureFile('/named-package/actions/action-zip/index.js'),
    'actions/action-zip/package.json': global.fixtureFile('/named-package/actions/action-zip/package.json'),
    'actions/action.js': global.fixtureFile('/named-package/actions/action.js'),
    'web-src/index.html': global.fixtureFile('/named-package/web-src/index.html'),
    'manifest.yml': global.fixtureFile('/named-package/manifest.yml'),
    'package.json': global.fixtureFile('/named-package/package.json')
  })
}

/**
 *
 */
function addSampleAppReducedFiles () {
  global.fakeFileSystem.addJson({
    'actions/action.js': global.fixtureFile('/sample-app-reduced/actions/action.js'),
    'manifest.yml': global.fixtureFile('/sample-app-reduced/manifest.yml'),
    'package.json': global.fixtureFile('/sample-app-reduced/package.json')
  })
}

/**
 * @param buildDir
 */
function addFakeFiles (buildDir) {
  const fakeFiles = {}
  fakeFiles[path.join(buildDir, 'action.js')] = 'fakecontent'
  fakeFiles[path.join(buildDir, 'action-zip.zip')] = 'fake-content'
  global.fakeFileSystem.addJson(fakeFiles)
}
