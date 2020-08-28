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
const utils = require('../src/utils')
const buildActions = require('../src/build-actions')
const path = require('path')
const execa = require('execa')
jest.mock('execa')
const deepClone = require('lodash.clonedeep')

const fs = require('fs-extra')

const globby = require('globby')
jest.mock('globby')

const mockLogger = require('@adobe/aio-lib-core-logging')

// zip implementation is complex to test => tested in utils.test.js
utils.zip = jest.fn()

// todo move webpack mock to __mocks__
jest.mock('webpack')
const webpack = require('webpack')
const webpackMock = {
  run: jest.fn()
}
webpack.mockReturnValue(webpackMock)
const webpackStatsMock = {
  toJson: jest.fn(),
  hasErrors: jest.fn(),
  hasWarnings: jest.fn()
}

beforeEach(() => {
  // global.cleanFs(vol)

  webpack.mockClear()
  webpackMock.run.mockReset()
  webpackStatsMock.toJson.mockReset()
  webpackStatsMock.hasErrors.mockReset()
  webpackStatsMock.hasWarnings.mockReset()

  webpackMock.run.mockImplementation(cb => cb(null, webpackStatsMock))

  execa.mockReset()

  utils.zip.mockReset()
})

describe('build by zipping js action folder', () => {
  let config
  beforeEach(async () => {
    // mock config, prepare file, load app scripts
    // mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
    // global.loadFs(vol, 'sample-app')
    // global.fakeFileSystem.addJson({ 'manifest.yml': 'packages: testpackage' })
    // global.fakeFileSystem.addJsonFolder(path.resolve('./test/__fixtures__/sample-app'))
    global.fakeFileSystem.addJson({
      'actions/action-zip/index.js': global.fixtureFile('/sample-app/actions/action-zip/index.js'),
      'actions/action-zip/package.json': global.fixtureFile('/sample-app/actions/action-zip/package.json'),
      // 'actions/action.js': global.fixtureFile('/sample-app/actions/action.js'),
      'web-src/index.html': global.fixtureFile('/sample-app/web-src/index.html'),
      'manifest.yml': global.fixtureFile('/sample-app/manifest.yml'),
      'package.json': global.fixtureFile('/sample-app/package.json')
    })
    // remove js action , focus on zip use case
    // todo use fixtures instead
    // delete non zip action (focus only on zip case)
    // vol.unlinkSync('/actions/action.js')
    config = deepClone(global.sampleAppConfig)
    delete config.manifest.package.actions.action
  })

  afterEach(() => {
    // reset back to normal
    global.fakeFileSystem.reset()
  })
  /*
  test('should fail if zip action folder does not exists', async () => {
    global.fakeFileSystem.removeKeys(['/actions/action-zip/index.js','/actions/action-zip/package.json','/actions/action-zip'])
    await expect(buildActions(config)).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining('ENOENT') }))
  })
 */
  /* test('should fail if zip action folder is a symlink', async () => {
    vol.unlinkSync('/actions/action-zip/index.js')
    vol.unlinkSync('/actions/action-zip/package.json')
    vol.rmdirSync('/actions/action-zip')
    vol.symlinkSync('somefile', '/actions/action-zip')
    await expect(buildActions(config)).rejects.toThrow('actions/action-zip is not a valid file or directory')
  }) */

  test('should build a zip action folder with a package.json and action named index.js', async () => {
    // console.log(config)
    await buildActions(config)
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-zip-temp'), r('/dist/actions/action-zip.zip'))
  })

  test('should build a zip action folder with a package.json and action named index.js', async () => {
    // console.log(config)
    await buildActions(config)
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-zip-temp'), r('/dist/actions/action-zip.zip'))
  })
  /*
  test('should still build a zip action if there is no ui', async () => {
    global.fakeFileSystem.removeKeys(['/web-src/index.html'])
    // vol.unlinkSync('/web-src/index.html')
    await buildActions(config)
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-zip-temp'), r('/dist/actions/action-zip.zip'))
  })

  test('should not fail if no package.json if there is an index.js', async () => {
    // delete package.json
    global.fakeFileSystem.removeKeys(['/actions/action-zip/package.json'])
    // vol.unlinkSync('/actions/action-zip/package.json')
    await buildActions(config)
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-zip-temp'), r('/dist/actions/action-zip.zip'))
    // expect(execa).not.toHaveBeenCalled()
  })
 */
  test('should fail if no package.json and no index.js', async () => {
    // delete package.json
    global.fakeFileSystem.removeKeys(['/actions/action-zip/package.json'])
    global.fakeFileSystem.removeKeys(['/actions/action-zip/index.js'])
    global.fakeFileSystem.addJson({
      'actions/action-zip/sample.js': global.fixtureFile('/sample-app/actions/action-zip/index.js')
    })
    /* vol.unlinkSync('/actions/action-zip/package.json')
    vol.unlinkSync('/actions/action-zip/index.js') */
    await expect(buildActions(config)).rejects.toThrow(`missing required ${n('actions/action-zip/package.json')} or index.js for folder actions`)
  })

  test('should pass if no package.json but index.js', async () => {
    // delete package.json
    global.fakeFileSystem.removeKeys(['/actions/action-zip/package.json'])
    global.fakeFileSystem.addJson({
      'actions/action-zip/sample.js': global.fixtureFile('/sample-app/actions/action-zip/index.js')
    })
    await expect(buildActions(config))
    expect(mockLogger.debug).toHaveBeenCalledWith('action directory has an index.js, allowing zip')
  })

  test('should fail if package.json main field is not defined and there is no index.js file', async () => {
    // rename index.js
    global.fakeFileSystem.addJson({
      'actions/action-zip/action.js': global.fakeFileSystem.files()['/actions/action-zip/index.js']
    })
    global.fakeFileSystem.removeKeys(['/actions/action-zip/index.js'])
    // vol.renameSync('/actions/action-zip/index.js', '/actions/action-zip/action.js')
    // rewrite package.json
    const packagejson = JSON.parse(global.fakeFileSystem.files()['/actions/action-zip/package.json'])
    delete packagejson.main
    global.fakeFileSystem.addJson({
      'actions/action-zip/package.json': JSON.stringify(packagejson)
    })
    // vol.writeFileSync('/actions/action-zip/package.json', JSON.stringify(packagejson))
    await expect(buildActions(config)).rejects.toThrow('the directory actions/action-zip must contain either a package.json with a \'main\' flag or an index.js file at its root')
  })

  test('should fail if package.json main field does not point to an existing file although there is an index.js file', async () => {
    // rewrite package.json
    const packagejson = JSON.parse(global.fakeFileSystem.files()['/actions/action-zip/package.json'])
    packagejson.main = 'action.js'
    global.fakeFileSystem.addJson({
      'actions/action-zip/package.json': JSON.stringify(packagejson)
    })

    await expect(buildActions(config)).rejects.toThrow('the directory actions/action-zip must contain either a package.json with a \'main\' flag or an index.js file at its root')
  })

  test('should build if package.json main field is undefined and there is an index.js file', async () => {
    // rewrite package.json
    const packagejson = JSON.parse(global.fakeFileSystem.files()['/actions/action-zip/package.json'])
    delete packagejson.main
    global.fakeFileSystem.addJson({
      'actions/action-zip/package.json': JSON.stringify(packagejson)
    })
    await buildActions(config)
    expect(webpackMock.run).toHaveBeenCalledTimes(0) // no webpack bundling
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-zip-temp'), r('/dist/actions/action-zip.zip'))
  })

  test('should build a zip action package.json main field points to file not called index.js', async () => {
    // rename index.js
    global.fakeFileSystem.addJson({
      'actions/action-zip/action.js': global.fakeFileSystem.files()['/actions/action-zip/index.js']
    })
    global.fakeFileSystem.removeKeys(['/actions/action-zip/index.js'])
    // rewrite package.json
    const packagejson = JSON.parse(global.fakeFileSystem.files()['/actions/action-zip/package.json'])
    packagejson.main = 'action.js'
    global.fakeFileSystem.addJson({
      'actions/action-zip/package.json': JSON.stringify(packagejson)
    })

    await buildActions(config)
    expect(webpackMock.run).toHaveBeenCalledTimes(0) // no webpack bundling
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-zip-temp'), r('/dist/actions/action-zip.zip'))
  })
})

describe('build by bundling js action file with webpack', () => {
  let config
  beforeEach(async () => {
    // mock webpack
    webpackMock.run.mockImplementation(cb => {
      // fake the build files
      // vol.writeFileSync('/dist/actions/action.tmp.js', 'fake')
      global.fakeFileSystem.addJson({
        '/dist/actions/action.tmp.js': 'fake'
      })
      cb(null, webpackStatsMock)
    })
    // mock env, load files, load scripts
    global.fakeFileSystem.addJson({
      // 'actions/action-zip/index.js': global.fixtureFile('/sample-app/actions/action-zip/index.js'),
      // 'actions/action-zip/package.json': global.fixtureFile('/sample-app/actions/action-zip/package.json'),
      'actions/action.js': global.fixtureFile('/sample-app/actions/action.js'),
      'web-src/index.html': global.fixtureFile('/sample-app/web-src/index.html'),
      'manifest.yml': global.fixtureFile('/sample-app/manifest.yml'),
      'package.json': global.fixtureFile('/sample-app/package.json')
    })
    // mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
    // scripts = await AppScripts()
    // remove folder zip action , focus on bundled js use case
    // todo use fixtures instead
    /* vol.unlinkSync('/actions/action-zip/index.js')
    vol.unlinkSync('/actions/action-zip/package.json')
    vol.rmdirSync('/actions/action-zip') */
    config = deepClone(global.sampleAppConfig)
    delete config.manifest.package.actions['action-zip']
  })

  afterEach(() => {
    // reset back to normal
    global.fakeFileSystem.reset()
  })

  test('should fail if action js file does not exists', async () => {
    global.fakeFileSystem.removeKeys(['/actions/action.js'])
    await expect(buildActions(config)).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining('ENOENT') }))
  })

  /* test('should fail if action js file is a symlink', async () => {
    vol.unlinkSync('/actions/action.js')
    vol.symlinkSync('somefile', '/actions/action.js')
    await expect(buildActions(config)).rejects.toThrow('actions/action.js is not a valid file or directory')
  }) */

  test('should fail for invalid file or directory', async () => {
    await buildActions(config)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.objectContaining({
      entry: [r('/actions/action.js')],
      output: expect.objectContaining({
        path: r('/dist/actions/action-temp'),
        filename: 'index.js'
      })
    }))
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-temp'), r('/dist/actions/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it', async () => {
    await buildActions(config)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.objectContaining({
      entry: [r('/actions/action.js')],
      output: expect.objectContaining({
        path: r('/dist/actions/action-temp'),
        filename: 'index.js'
      })
    }))
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-temp'), r('/dist/actions/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes', async () => {
    // global.loadFs(vol, 'sample-app-includes')
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/action.js': global.fixtureFile('/sample-app-includes/actions/action.js'),
      'includeme.txt': global.fixtureFile('/sample-app-includes/includeme.txt'),
      'manifest.yml': global.fixtureFile('/sample-app-includes/manifest.yml'),
      'package.json': global.fixtureFile('/sample-app-includes/package.json')
    })
    globby.mockReturnValue(['/includeme.txt'])
    await buildActions(global.sampleAppIncludesConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.objectContaining({
      entry: [r('/actions/action.js')],
      output: expect.objectContaining({
        path: r('/dist/actions/action-temp'),
        filename: 'index.js'
      })
    }))
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-temp'), r('/dist/actions/action.zip'))
    expect(Object.keys(global.fakeFileSystem.files())).toEqual(expect.arrayContaining(['/includeme.txt']))
  })

  test('should bundle a single action file using webpack and zip it with manifest named package', async () => {
    // global.loadFs(vol, 'named-package')
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/action-zip/index.js': global.fixtureFile('/named-package/actions/action-zip/index.js'),
      'actions/action-zip/package.json': global.fixtureFile('/named-package/actions/action-zip/package.json'),
      'actions/action.js': global.fixtureFile('/named-package/actions/action.js'),
      'web-src/index.html': global.fixtureFile('/named-package/web-src/index.html'),
      'manifest.yml': global.fixtureFile('/named-package/manifest.yml'),
      'package.json': global.fixtureFile('/named-package/package.json')
    })

    // mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)

    await buildActions(global.namedPackageConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.objectContaining({
      entry: [r('/actions/action.js')],
      output: expect.objectContaining({
        path: r('/dist/actions/action-temp'),
        filename: 'index.js'
      })
    }))
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-temp'), r('/dist/actions/action.zip'))
  })

  test('should still bundle a single action file when there is no ui', async () => {
    global.fakeFileSystem.removeKeys(['/web-src/index.html'])
    await buildActions(config)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.objectContaining({
      entry: [r('/actions/action.js')],
      output: expect.objectContaining({
        path: r('/dist/actions/action-temp'),
        filename: 'index.js'
      })
    }))
    expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-temp'), r('/dist/actions/action.zip'))
  })

  test('should fail if webpack throws an error', async () => {
    // eslint-disable-next-line standard/no-callback-literal
    webpackMock.run.mockImplementation(cb => cb(new Error('fake webpack error')))
    await expect(buildActions(config)).rejects.toThrow('fake webpack error')
  })

  test('should write a debug message if webpack returns a warning', async () => {
    webpackStatsMock.hasWarnings.mockReturnValue(true)
    webpackStatsMock.toJson.mockReturnValue({
      warnings: 'fake warnings'
    })
    await buildActions(config)
    expect(mockLogger.debug).toHaveBeenCalledWith('webpack compilation warnings:\nfake warnings')
  })

  test('should throw if webpack returns an error ', async () => {
    webpackStatsMock.hasErrors.mockReturnValue(true)
    webpackStatsMock.toJson.mockReturnValue({
      errors: 'fake errors'
    })
    await expect(buildActions(config)).rejects.toThrow('action build failed, webpack compilation errors:\nfake errors')
  })

  test('should both write a debug message and fail if webpack returns a warning and an error', async () => {
    webpackStatsMock.hasErrors.mockReturnValue(true)
    webpackStatsMock.hasWarnings.mockReturnValue(true)
    webpackStatsMock.toJson.mockReturnValue({
      errors: 'fake errors',
      warnings: 'fake warnings'
    })
    await expect(buildActions(config)).rejects.toThrow('action build failed, webpack compilation errors:\nfake errors')
    expect(mockLogger.debug).toHaveBeenCalledWith('webpack compilation warnings:\nfake warnings')
  })
})

test('should build 1 zip action and 1 bundled action in one go', async () => {
  // global.loadFs(vol, 'sample-app')
  addSampleAppFiles()
  // mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)
  webpackMock.run.mockImplementation(cb => {
    // fake the build files
    // vol.writeFileSync('/dist/actions/action.tmp.js', 'fake')
    global.fakeFileSystem.addJson({
      'dist/actions/action.tmp.js': 'fake'
    })
    cb(null, webpackStatsMock)
  })

  await buildActions(global.sampleAppConfig)

  expect(webpackMock.run).toHaveBeenCalledTimes(1)
  expect(webpack).toHaveBeenCalledWith(expect.objectContaining({
    entry: [r('/actions/action.js')],
    output: expect.objectContaining({
      path: expect.stringContaining(r('/dist/actions/action-temp')),
      filename: 'index.js'
    })
  }))
  expect(utils.zip).toHaveBeenCalledTimes(2)
  expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-temp'),
    r('/dist/actions/action.zip'))
  expect(utils.zip).toHaveBeenCalledWith(r('/dist/actions/action-zip-temp'),
    r('/dist/actions/action-zip.zip'))
})

test('use buildConfig.filterActions to build only action called `action`', async () => {
  addSampleAppFiles()
  webpackMock.run.mockImplementation(cb => {
    // fake the build files
    global.fakeFileSystem.addJson({
      'dist/actions/action.tmp.js': 'fake'
    })
    cb(null, webpackStatsMock)
  })

  await buildActions(global.sampleAppConfig, ['action'])

  expect(webpackMock.run).toHaveBeenCalledTimes(1)
  expect(webpack).toHaveBeenCalledWith(expect.objectContaining({
    entry: [r('/actions/action.js')],
    output: expect.objectContaining({
      path: r('/dist/actions/action-temp'),
      filename: 'index.js'
    })
  }))
  expect(utils.zip).toHaveBeenCalledTimes(1)
  expect(utils.zip).toHaveBeenCalledWith(expect.stringContaining(r('/dist/actions/action-temp')),
    r('/dist/actions/action.zip'))
})

test('use buildConfig.filterActions to build only action called `action-zip`', async () => {
  addSampleAppFiles()
  await buildActions(global.sampleAppConfig, ['action-zip'])
  expect(utils.zip).toHaveBeenCalledTimes(1)
  expect(utils.zip).toHaveBeenCalledWith(expect.stringContaining(r('/dist/actions/action-zip-temp')),
    r('/dist/actions/action-zip.zip'))
})

test('No backend is present', async () => {
  addSampleAppFiles()
  // global.fakeFileSystem.removeKeys(['./manifest.yml'])
  const config = deepClone(global.sampleAppConfig)
  config.app.hasBackend = false

  await expect(buildActions(config)).rejects.toThrow('cannot build actions, app has no backend')
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
