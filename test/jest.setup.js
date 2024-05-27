/*
Copyright 2020 Adobe Inc. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { stdout, stderr } = require('stdout-stderr')
const fs = jest.requireActual('fs')
const eol = require('eol')
const { vol } = require('memfs')

const fetch = require('jest-fetch-mock')

jest.mock('fs')
jest.mock('fs/promises')

process.env.CI = true

jest.setTimeout(30000)

jest.setMock('node-fetch', fetch)

// trap console log
beforeEach(() => {
  stdout.start()
  stderr.start()
  // change this if you need to see logs from stdout
  stdout.print = false
})
afterEach(() => { stdout.stop(); stderr.stop() })

// helper for fixtures
global.fixtureFile = (output) => {
  return fs.readFileSync(`./test/__fixtures__/${output}`).toString()
}

// helper for fixtures
global.fixtureJson = (output) => {
  return JSON.parse(fs.readFileSync(`./test/__fixtures__/${output}`).toString())
}

// helper for zip fixtures
global.fixtureZip = (output) => {
  return fs.readFileSync(`./test/__fixtures__/${output}`)
}

// set the fake filesystem
global.fakeFileSystem = {
  addJson: (json) => {
    // add to existing
    vol.fromJSON(json, '/')
  },
  addJsonFolder: (folderPath) => {
    vol.fromJSON(getFilesRecursively(folderPath), '/')
  },
  removeKeys: (arr) => {
    // remove from existing
    const files = vol.toJSON()
    for (const prop in files) {
      if (arr.includes(prop)) {
        delete files[prop]
      }
    }
    vol.reset()
    vol.fromJSON(files)
  },
  clear: () => {
    // reset to empty
    vol.reset()
  },
  reset: () => {
    // reset file system
    vol.reset()
  },
  files: () => {
    return vol.toJSON()
  }
}
// seed the fake filesystem
vol.reset()

// fixture matcher
expect.extend({
  toMatchFixture (received, argument) {
    const val = fixtureFile(argument)
    // eslint-disable-next-line jest/no-standalone-expect
    expect(eol.auto(received)).toEqual(eol.auto(val))
    return { pass: true }
  }
})

expect.extend({
  toMatchFixtureJson (received, argument) {
    const val = fixtureJson(argument)
    // eslint-disable-next-line jest/no-standalone-expect
    expect(received).toEqual(val)
    return { pass: true }
  }
})

global.fakeS3Bucket = 'fake-bucket'
global.fakeConfig = {
  tvm: {
    runtime: {
      defaultApihost: 'https://adobeioruntime.net',
      apihost: 'https://adobeioruntime.net',
      namespace: 'fake_ns',
      auth: 'fake:auth'
    }
  },
  local: {
    runtime: {
      defaultApihost: 'https://adobeioruntime.net',
      // those must match the once set by dev cmd
      apihost: 'http://localhost:3233',
      namespace: 'guest',
      auth: '23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP'
    }
  },
  creds: {
    runtime: {
      defaultApihost: 'https://adobeioruntime.net',
      apihost: 'https://adobeioruntime.net',
      namespace: 'fake_ns',
      auth: 'fake:auth'
    },
    cna: {
      s3bucket: 'customBucket',
      awsaccesskeyid: 'fakeAwsKeyId',
      awssecretaccesskey: 'fakeAwsSecretKey',
      defaultHostname: 'https://adobeio-static.net',
      hostname: 'https://adobeio-static.net'
    }
  },
  cna: {
    htmlCacheDuration: 60,
    jsCacheDuration: 604800,
    cssCacheDuration: 604800,
    imageCacheDuration: 604800
  }
}

global.fakeTVMResponse = {
  sessionToken: 'fake',
  expiration: '1970-01-01T00:00:00.000Z',
  accessKeyId: 'fake',
  secretAccessKey: 'fake',
  params: { Bucket: global.fakeS3Bucket }
}

global.sampleAppConfig = {
  app: {
    hasFrontend: true,
    hasBackend: true,
    version: '1.0.0',
    name: 'sample-app',
    hostnameIsCustom: false,
    defaultHostname: 'https://adobeio-static.net',
    hostname: 'https://adobeio-static.net',
    htmlCacheDuration: '60',
    jsCacheDuration: '604800',
    cssCacheDuration: '604800',
    imageCacheDuration: '604800'
  },
  ow: {
    namespace: 'fake_ns',
    auth: 'fake:auth',
    defaultApihost: 'https://adobeioruntime.net',
    apihost: 'https://adobeioruntime.net',
    apiversion: 'v1',
    package: 'sample-app-1.0.0'
  },
  s3: {
    credsCacheFile: '/.aws.tmp.creds.json',
    creds: undefined,
    folder: 'fake_ns',
    tvmUrl: 'https://adobeio.adobeioruntime.net/apis/tvm/'
  },
  web: {
    src: '/web-src',
    distDev: '/dist/web-src-dev',
    distProd: '/dist/web-src-prod',
    injectedConfig: '/web-src/src/config.json'
  },
  manifest: {
    src: '/manifest.yml',
    packagePlaceholder: '__APP_PACKAGE__',
    full: {
      packages: {
        __APP_PACKAGE__: {
          license: 'Apache-2.0',
          actions: {
            action: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:18'
            },
            'action-zip': {
              function: 'actions/action-zip',
              web: 'yes',
              runtime: 'nodejs:18'
            }
          },
          sequences: {
            'action-sequence': { actions: 'action, action-zip', web: 'yes' }
          },
          triggers: { trigger1: null },
          rules: {
            rule1: { trigger: 'trigger1', action: 'action', rule: true }
          },
          apis: {
            api1: {
              base: { path: { action: { method: 'get' } } }
            }
          },
          dependencies: { dependency1: { location: 'fake.com/package' } }
        }
      }
    },
    package: {
      license: 'Apache-2.0',
      actions: {
        action: {
          function: 'actions/action.js',
          web: 'yes',
          runtime: 'nodejs:18'
        },
        'action-zip': {
          function: 'actions/action-zip',
          web: 'yes',
          runtime: 'nodejs:18'
        }
      },
      sequences: {
        'action-sequence': { actions: 'action, action-zip', web: 'yes' }
      },
      triggers: { trigger1: null },
      rules: { rule1: { trigger: 'trigger1', action: 'action', rule: true } },
      apis: {
        api1: {
          base: { path: { action: { method: 'get' } } }
        }
      },
      dependencies: { dependency1: { location: 'fake.com/package' } }
    }
  },
  actions: { src: '/actions', dist: '/dist/actions', devRemote: false },
  root: '/'
}

global.sampleAppIncludesConfig = {
  app: {
    hasFrontend: true,
    hasBackend: true,
    version: '1.0.0',
    name: 'sample-app-include',
    hostname: 'https://adobeio-static.net',
    defaultHostname: 'https://adobeio-static.net',
    htmlCacheDuration: '60',
    jsCacheDuration: '604800',
    cssCacheDuration: '604800',
    imageCacheDuration: '604800'
  },
  ow: {
    namespace: 'fake_ns',
    auth: 'fake:auth',
    apihost: 'https://adobeioruntime.net',
    defaultApihost: 'https://adobeioruntime.net',
    apiversion: 'v1',
    package: 'sample-app-include-1.0.0'
  },
  s3: {
    credsCacheFile: '/.aws.tmp.creds.json',
    creds: undefined,
    folder: 'fake_ns',
    tvmUrl: 'https://adobeio.adobeioruntime.net/apis/tvm/'
  },
  web: {
    src: '/web-src',
    distDev: '/dist/web-src-dev',
    distProd: '/dist/web-src-prod',
    injectedConfig: '/web-src/src/config.json'
  },
  manifest: {
    src: '/manifest.yml',
    packagePlaceholder: '__APP_PACKAGE__',
    full: {
      packages: {
        __APP_PACKAGE__: {
          actions: {
            action: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:18',
              include: [['*.txt', 'text/']]
            }
          }
        }
      }
    },
    package: {
      actions: {
        action: {
          function: 'actions/action.js',
          web: 'yes',
          runtime: 'nodejs:18',
          include: [['*.txt', 'app/']]
        }
      }
    }
  },
  actions: { src: '/actions', dist: '/dist/actions', devRemote: false },
  root: '/'
}

global.namedPackageConfig = {
  app: {
    hasFrontend: true,
    hasBackend: true,
    version: '1.0.0',
    name: 'sample-app',
    hostname: 'https://adobeio-static.net',
    defaultHostname: 'https://adobeio-static.net',
    htmlCacheDuration: '60',
    jsCacheDuration: '604800',
    cssCacheDuration: '604800',
    imageCacheDuration: '604800'
  },
  ow: {
    namespace: 'fake_ns',
    auth: 'fake:auth',
    apihost: 'https://adobeioruntime.net',
    defaultApihost: 'https://adobeioruntime.net',
    apiversion: 'v1',
    package: 'sample-app-1.0.0'
  },
  s3: {
    credsCacheFile: '/.aws.tmp.creds.json',
    creds: undefined,
    folder: 'fake_ns',
    tvmUrl: 'https://adobeio.adobeioruntime.net/apis/tvm/'
  },
  web: {
    src: '/web-src',
    distDev: '/dist/web-src-dev',
    distProd: '/dist/web-src-prod',
    injectedConfig: '/web-src/src/config.json'
  },
  manifest: {
    src: '/manifest.yml',
    packagePlaceholder: '__APP_PACKAGE__',
    full: {
      packages: {
        'bobby-mcgee': {
          license: 'Apache-2.0',
          actions: {
            action: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:18'
            },
            'action-zip': {
              function: 'actions/action-zip',
              web: 'yes',
              runtime: 'nodejs:18'
            }
          },
          sequences: {
            'action-sequence': { actions: 'action, action-zip', web: 'yes' }
          },
          triggers: { trigger1: null },
          rules: {
            rule1: { trigger: 'trigger1', action: 'action', rule: true }
          },
          apis: {
            api1: {
              base: { path: { action: { method: 'get' } } }
            }
          },
          dependencies: { dependency1: { location: 'fake.com/package' } }
        }
      }
    },
    package: undefined
  },
  actions: { src: '/actions', dist: '/dist/actions', devRemote: false },
  root: '/'
}

global.sampleAppReducedConfig = {
  app: {
    hasFrontend: false,
    hasBackend: true,
    version: '1.0.0',
    name: 'sample-app-reduced',
    defaultHostname: 'https://adobeio-static.net',
    hostname: 'https://adobeio-static.net',
    htmlCacheDuration: '60',
    jsCacheDuration: '604800',
    cssCacheDuration: '604800',
    imageCacheDuration: '604800'
  },
  ow: {
    namespace: 'fake_ns',
    auth: 'fake:auth',
    apihost: 'https://adobeioruntime.net',
    defaultApihost: 'https://adobeioruntime.net',
    apiversion: 'v1',
    package: 'sample-app-reduced-1.0.0'
  },
  s3: {
    credsCacheFile: '/.aws.tmp.creds.json',
    creds: undefined,
    folder: 'fake_ns',
    tvmUrl: 'https://adobeio.adobeioruntime.net/apis/tvm/'
  },
  web: {
    src: '/web-src',
    distDev: '/dist/web-src-dev',
    distProd: '/dist/web-src-prod',
    injectedConfig: '/web-src/src/config.json'
  },
  manifest: {
    src: '/manifest.yml',
    packagePlaceholder: '__APP_PACKAGE__',
    full: {
      packages: {
        __APP_PACKAGE__: {
          license: 'Apache-2.0',
          actions: {
            action: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:18'
            }
          },
          triggers: { trigger1: null }
        }
      }
    },
    package: {
      license: 'Apache-2.0',
      actions: {
        action: {
          function: 'actions/action.js',
          web: 'yes',
          runtime: 'nodejs:18'
        }
      },
      triggers: { trigger1: null }
    }
  },
  actions: { src: '/actions', dist: '/dist/actions', devRemote: false },
  root: '/'
}

global.sampleAppDuplicateConfig = {
  app: {
    hasFrontend: false,
    hasBackend: true,
    version: '1.0.0',
    name: 'sample-app-reduced',
    defaultHostname: 'https://adobeio-static.net',
    hostname: 'https://adobeio-static.net',
    htmlCacheDuration: '60',
    jsCacheDuration: '604800',
    cssCacheDuration: '604800',
    imageCacheDuration: '604800'
  },
  ow: {
    namespace: 'fake_ns',
    auth: 'fake:auth',
    apihost: 'https://adobeioruntime.net',
    defaultApihost: 'https://adobeioruntime.net',
    apiversion: 'v1',
    package: 'sample-app-duplicate-1.0.0'
  },
  s3: {
    credsCacheFile: '/.aws.tmp.creds.json',
    creds: undefined,
    folder: 'fake_ns',
    tvmUrl: 'https://adobeio.adobeioruntime.net/apis/tvm/'
  },
  web: {
    src: '/web-src',
    distDev: '/dist/web-src-dev',
    distProd: '/dist/web-src-prod',
    injectedConfig: '/web-src/src/config.json'
  },
  manifest: {
    src: '/manifest.yml',
    packagePlaceholder: '__APP_PACKAGE__',
    full: {
      packages: {
        __APP_PACKAGE__: {
          license: 'Apache-2.0',
          sequences: {
            someAction: {
              actions: 'anotherAction',
              web: 'yes'
            }
          },
          actions: {
            someAction: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:18'
            },
            anotherAction: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:18'
            }
          }
        }
      }
    },
    package: {
      license: 'Apache-2.0',
      sequences: {
        someAction: {
          actions: 'anotherAction',
          web: 'yes'
        }
      },
      actions: {
        someAction: {
          function: 'actions/action.js',
          web: 'yes',
          runtime: 'nodejs:18'
        },
        anotherAction: {
          function: 'actions/action.js',
          web: 'yes',
          runtime: 'nodejs:18'
        }
      }
    }
  },
  actions: { src: '/actions', dist: '/dist/actions', devRemote: false },
  root: '/'
}

global.sampleAppDefaultPackageConfig = {
  app: {
    hasFrontend: false,
    hasBackend: true,
    version: '1.0.0',
    name: 'sample-app-default-package',
    defaultHostname: 'https://adobeio-static.net',
    hostname: 'https://adobeio-static.net',
    htmlCacheDuration: '60',
    jsCacheDuration: '604800',
    cssCacheDuration: '604800',
    imageCacheDuration: '604800'
  },
  ow: {
    namespace: 'fake_ns',
    auth: 'fake:auth',
    apihost: 'https://adobeioruntime.net',
    defaultApihost: 'https://adobeioruntime.net',
    apiversion: 'v1',
    package: 'default'
  },
  s3: {
    credsCacheFile: '/.aws.tmp.creds.json',
    creds: undefined,
    folder: 'fake_ns',
    tvmUrl: 'https://adobeio.adobeioruntime.net/apis/tvm/'
  },
  web: {
  },
  manifest: {
    src: '/manifest.yml',
    packagePlaceholder: '__APP_PACKAGE__',
    full: {
      packages: {
        default: {
          license: 'Apache-2.0',
          actions: {
            action: {
              function: 'actions/action.js',
              web: 'yes',
              runtime: 'nodejs:16'
            }
          }
        }
      }
    },
    package: {
      license: 'Apache-2.0',
      actions: {
        action: {
          function: 'actions/action.js',
          web: 'yes',
          runtime: 'nodejs:16'
        }
      }
    }
  },
  actions: { src: '/actions', dist: '/dist/actions', devRemote: false },
  root: '/'
}

/**
 * @param {string} folderPath folderPath
 * @param {string} relativePath relativePath
 * @returns {object} json files
 */
function getFilesRecursively (folderPath, relativePath = '') {
  const files = []
  const filesJson = {}
  fs.readdirSync(folderPath).forEach(file => {
    if (fs.lstatSync(folderPath + '/' + file).isFile()) {
      files.push(file)
      filesJson[relativePath + file] = fs.readFileSync(folderPath + '/' + file).toString()
    } else {
      Object.assign(filesJson, getFilesRecursively(folderPath + '/' + file, file + '/'))
    }
  })
  return filesJson
}

global.addSampleAppFiles = () => {
  global.fakeFileSystem.addJson({
    'actions/action-zip/index.js': global.fixtureFile('/sample-app/actions/action-zip/index.js'),
    'actions/action-zip/package.json': global.fixtureFile('/sample-app/actions/action-zip/package.json'),
    'actions/action.js': global.fixtureFile('/sample-app/actions/action.js'),
    'web-src/index.html': global.fixtureFile('/sample-app/web-src/index.html'),
    'manifest.yml': global.fixtureFile('/sample-app/manifest.yml'),
    'package.json': global.fixtureFile('/sample-app/package.json')
  })
}

global.addNamedPackageFiles = () => {
  global.fakeFileSystem.addJson({
    'actions/action-zip/index.js': global.fixtureFile('/named-package/actions/action-zip/index.js'),
    'actions/action-zip/package.json': global.fixtureFile('/named-package/actions/action-zip/package.json'),
    'actions/action.js': global.fixtureFile('/named-package/actions/action.js'),
    'web-src/index.html': global.fixtureFile('/named-package/web-src/index.html'),
    'manifest.yml': global.fixtureFile('/named-package/manifest.yml'),
    'package.json': global.fixtureFile('/named-package/package.json')
  })
}

global.addSampleAppReducedFiles = () => {
  global.fakeFileSystem.addJson({
    'actions/action.js': global.fixtureFile('/sample-app-reduced/actions/action.js'),
    'manifest.yml': global.fixtureFile('/sample-app-reduced/manifest.yml'),
    'package.json': global.fixtureFile('/sample-app-reduced/package.json')
  })
}

global.addSampleAppDuplicateFiles = () => {
  global.fakeFileSystem.addJson({
    'actions/action.js': global.fixtureFile('/sample-app-duplicate/actions/action.js'),
    'manifest.yml': global.fixtureFile('/sample-app-duplicate/manifest.yml'),
    'package.json': global.fixtureFile('/sample-app-duplicate/package.json')
  })
}
