/*
Copyright 2023 Adobe. All rights reserved.
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
const fs = require('fs-extra')
const execa = require('execa')
const deepClone = require('lodash.clonedeep')
const globby = require('globby')
const webpack = require('webpack')
const mockLogger = require('@adobe/aio-lib-core-logging')

jest.mock('dependency-tree')
jest.mock('execa')
jest.mock('globby')
// todo move webpack mock to __mocks__
jest.mock('webpack')

// zip implementation is complex to test => tested in utils.test.js
utils.zip = jest.fn()

const webpackMock = {
  run: jest.fn()
}
webpack.DefinePlugin = jest.fn().mockImplementation(() => ({
}))
webpack.mockReturnValue(webpackMock)
const webpackStatsMock = {
  toJson: jest.fn(),
  hasErrors: jest.fn(),
  hasWarnings: jest.fn(),
  hash: '1234567890' // mock hash
}

beforeEach(() => {
  webpack.mockClear()
  webpackMock.run.mockReset()
  webpackStatsMock.toJson.mockReset()
  webpackStatsMock.hasErrors.mockReset()
  webpackStatsMock.hasWarnings.mockReset()

  webpackMock.run.mockImplementation(cb => cb(null, webpackStatsMock))

  execa.mockReset()
  utils.zip.mockReset()
  fs.emptyDirSync = jest.fn()
  fs.copySync = jest.fn()
})

describe('build by zipping js action folder', () => {
  let config

  /** @private */
  function setupFs ({ addActionFile = false }) {
    const json = {
      'actions/action-zip/index.js': global.fixtureFile('/sample-app/actions/action-zip/index.js'),
      'actions/action-zip/package.json': global.fixtureFile('/sample-app/actions/action-zip/package.json'),
      'web-src/index.html': global.fixtureFile('/sample-app/web-src/index.html'),
      'manifest.yml': global.fixtureFile('/sample-app/manifest.yml'),
      'package.json': global.fixtureFile('/sample-app/package.json')
    }
    if (addActionFile) {
      json['actions/action.js'] = global.fixtureFile('/sample-app/actions/action.js')
    }
    global.fakeFileSystem.addJson(json)

    config = deepClone(global.sampleAppConfig)
    if (!addActionFile) {
      delete config.manifest.full.packages.__APP_PACKAGE__.actions.action
    }
  }

  beforeEach(async () => {
    setupFs({ addActionFile: false })
  })

  afterEach(() => {
    // reset back to normal
    global.fakeFileSystem.reset()
  })

  test('should fail if zip action folder does not exists', async () => {
    global.fakeFileSystem.removeKeys(['/actions/action-zip/index.js', '/actions/action-zip/package.json', '/actions/action-zip'])
    await expect(buildActions(config)).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining('ENOENT') }))
  })

  test('should build a zip action folder with a package.json and action named index.js', async () => {
    await buildActions(config)
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp'),
      path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
  })

  test('should still build a zip action if there is no ui', async () => {
    global.fakeFileSystem.removeKeys(['/web-src/index.html'])
    await buildActions(config)
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp'),
      path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
  })

  test('should fail if no package.json and no index.js', async () => {
    // delete package.json
    global.fakeFileSystem.removeKeys(['/actions/action-zip/package.json'])
    global.fakeFileSystem.removeKeys(['/actions/action-zip/index.js'])
    global.fakeFileSystem.addJson({
      'actions/action-zip/sample.js': global.fixtureFile('/sample-app/actions/action-zip/index.js')
    })
    await expect(buildActions(config)).rejects.toThrow('missing required package.json or index.js for folder actions')
  })

  test('should pass if no package.json but index.js', async () => {
    // delete package.json
    global.fakeFileSystem.removeKeys(['/actions/action-zip/package.json'])
    global.fakeFileSystem.addJson({
      'actions/action-zip/sample.js': global.fixtureFile('/sample-app/actions/action-zip/index.js')
    })
    const res = await buildActions(config)
    expect(res).toEqual(expect.arrayContaining([path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip')]))
  })

  test('should fail if package.json main field is not defined and there is no index.js file', async () => {
    // rename index.js
    global.fakeFileSystem.addJson({
      'actions/action-zip/action.js': global.fakeFileSystem.files()['/actions/action-zip/index.js']
    })
    global.fakeFileSystem.removeKeys(['/actions/action-zip/index.js'])
    // rewrite package.json
    const packagejson = JSON.parse(global.fakeFileSystem.files()['/actions/action-zip/package.json'])
    delete packagejson.main
    global.fakeFileSystem.addJson({
      'actions/action-zip/package.json': JSON.stringify(packagejson)
    })
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
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp'),
      path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
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
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp'),
      path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
  })

  test('full config', async () => {
    setupFs({ addActionFile: true })

    const lastBuiltActionsFile = path.join(config.root, 'dist', 'last-built-actions.json')
    webpackMock.run.mockImplementation(cb => {
      global.fakeFileSystem.addJson({
        [lastBuiltActionsFile]: '{}'
      })
      cb(null, webpackStatsMock)
    })

    utils.zip.mockImplementation((_, outPath) => {
      global.fakeFileSystem.addJson({ [outPath]: 'fake-zip-data' })
    })

    const res = await buildActions(config)
    expect(res).toEqual(expect.arrayContaining([
      expect.stringContaining('action.zip'),
      expect.stringContaining('action-zip.zip')
    ]))

    expect(fs.readdirSync(path.resolve(config.actions.dist, 'sample-app-1.0.0'))).toEqual(expect.arrayContaining([
      'action-temp',
      'action-zip-temp',
      'action-zip.zip',
      'action.zip'
    ]))
  })
})

describe('build by bundling js action file with webpack', () => {
  let config
  beforeEach(async () => {
    // mock webpack
    webpackMock.run.mockImplementation(cb => {
      // fake the build files
      global.fakeFileSystem.addJson({
        '/dist/actions/action.tmp.js': 'fake',
        'dist/actions/last-built-actions.json': 'fake'
      })
      cb(null, webpackStatsMock)
    })
    // mock env, load files, load scripts
    global.fakeFileSystem.addJson({
      'actions/action.js': global.fixtureFile('/sample-app/actions/action.js'),
      'web-src/index.html': global.fixtureFile('/sample-app/web-src/index.html'),
      'manifest.yml': global.fixtureFile('/sample-app/manifest.yml'),
      'package.json': global.fixtureFile('/sample-app/package.json')
    })
    config = deepClone(global.sampleAppConfig)
    // delete config.manifest.package.actions['action-zip']
    delete config.manifest.full.packages.__APP_PACKAGE__.actions['action-zip']
  })

  afterEach(() => {
    // reset back to normal
    global.fakeFileSystem.reset()
  })

  test('should fail if action js file does not exists', async () => {
    global.fakeFileSystem.removeKeys(['/actions/action.js'])
    await expect(buildActions(config)).rejects.toEqual(expect.objectContaining({ message: expect.stringContaining('ENOENT') }))
  })

  test('should fail for invalid file or directory', async () => {
    await buildActions(config)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        entry: [path.resolve('/actions/action.js')],
        output: expect.objectContaining({
          path: path.normalize('/dist/actions/sample-app-1.0.0/action-temp'),
          filename: 'index.js'
        })
      })]))
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it', async () => {
    await buildActions(config)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        entry: [path.resolve('/actions/action.js')],
        output: expect.objectContaining({
          path: path.normalize('/dist/actions/sample-app-1.0.0/action-temp'),
          filename: 'index.js'
        })
      })]))
    expect(utils.zip).toHaveBeenNthCalledWith(1, path.normalize('/dist/actions/sample-app-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/action.js': global.fixtureFile('/sample-app-includes/actions/action.js'),
      'includeme.txt': global.fixtureFile('/sample-app-includes/includeme.txt'),
      'manifest.yml': global.fixtureFile('/sample-app-includes/manifest.yml'),
      'package.json': global.fixtureFile('/sample-app-includes/package.json')
    })
    globby.mockReturnValueOnce(['/includeme.txt'])

    await buildActions(global.sampleAppIncludesConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        entry: [path.resolve('/actions/action.js')],
        output: expect.objectContaining({
          path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
          filename: 'index.js'
        })
      })]))
    expect(utils.zip).toHaveBeenCalledTimes(1)
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
    expect(Object.keys(global.fakeFileSystem.files())).toEqual(expect.arrayContaining(['/includeme.txt']))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js in actions root', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/action.js': global.fixtureFile('/sample-app-includes/actions/action.js'),
      'includeme.txt': global.fixtureFile('/sample-app-includes/includeme.txt'),
      'manifest.yml': global.fixtureFile('/sample-app-includes/manifest.yml'),
      'package.json': global.fixtureFile('/sample-app-includes/package.json')
    })
    globby.mockReturnValueOnce(['/includeme.txt'])
    globby.mockReturnValueOnce(['actions/mock.webpack-config.js'])

    jest.mock('actions/mock.webpack-config.js', () => {
      return [{
        mode: 'none',
        optimization: { somefakefield: true },
        output: { fake: false },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }]
    }, { virtual: true })

    await buildActions(global.sampleAppIncludesConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/file.js'), path.resolve('/actions/action.js')],
      mode: 'none',
      optimization: { minimize: false, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'commonjs2', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(globby).toHaveBeenCalledWith(expect.arrayContaining([path.posix.resolve('/actions/*webpack-config.{js,cjs}')]))
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
    expect(Object.keys(global.fakeFileSystem.files())).toEqual(expect.arrayContaining(['/includeme.txt']))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.cjs in actions root', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/action.js': global.fixtureFile('/sample-app-includes/actions/action.js'),
      'includeme.txt': global.fixtureFile('/sample-app-includes/includeme.txt'),
      'manifest.yml': global.fixtureFile('/sample-app-includes/manifest.yml'),
      'package.json': global.fixtureFile('/sample-app-includes/package.json')
    })
    globby.mockReturnValueOnce(['/includeme.txt'])
    globby.mockReturnValueOnce(['actions/mock.webpack-config.cjs'])

    jest.mock('actions/mock.webpack-config.cjs', () => {
      return [{
        mode: 'none',
        optimization: { somefakefield: true },
        output: { fake: false },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }]
    }, { virtual: true })

    await buildActions(global.sampleAppIncludesConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/file.js'), path.resolve('/actions/action.js')],
      mode: 'none',
      optimization: { minimize: false, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'commonjs2', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(globby).toHaveBeenCalledWith(expect.arrayContaining([path.posix.resolve('/actions/*webpack-config.{js,cjs}')]))
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
    expect(Object.keys(global.fakeFileSystem.files())).toEqual(expect.arrayContaining(['/includeme.txt']))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock2.webpack-config.js'])

    jest.mock('actions/actionname/mock2.webpack-config.js', () => {
      return [{
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }]
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js as a function that returns an object in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock.function.object.webpack-config.js'])
    jest.mock('actions/actionname/mock.function.object.webpack-config.js', () => {
      return () => ({
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      })
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js as a function that returns an array of objects in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock.function.array.objects.webpack-config.js'])

    jest.mock('actions/actionname/mock.function.array.objects.webpack-config.js', () => {
      return async () => ([{
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      },
      {
        mode: 'development',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }
      ])
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    },
    {
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'development',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js as an async function that returns an object in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock.async.function.object.webpack-config.js'])

    jest.mock('actions/actionname/mock.async.function.object.webpack-config.js', () => {
      return async () => ({
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      })
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js as an async function that returns an array of objects in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock.async.function.array.objects.webpack-config.js'])

    jest.mock('actions/actionname/mock.async.function.array.objects.webpack-config.js', () => {
      return async () => ([{
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      },
      {
        mode: 'development',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }])
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    },
    {
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'development',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js as a promise that returns an array of objects in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock.promise.array.objects.webpack-config.js'])

    jest.mock('actions/actionname/mock.promise.array.objects.webpack-config.js', () => {
      return new Promise((resolve, reject) => resolve([{
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      },
      {
        mode: 'development',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }]))
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    },
    {
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'development',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js as an array of objects in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock.array.objects.webpack-config.js'])

    jest.mock('actions/actionname/mock.array.objects.webpack-config.js', () => {
      return [{
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      },
      {
        mode: 'development',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }]
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    },
    {
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'development',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js as an array of functions that return objects in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock.array.functions.objects.webpack-config.js'])

    jest.mock('actions/actionname/mock.array.functions.objects.webpack-config.js', () => {
      return [() => ({
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }),
      () => ({
        mode: 'development',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      })]
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    },
    {
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'development',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with includes using webpack-config.js as an array of async functions that return objects in actions folder', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/actionname/action.js': global.fixtureFile('/custom-webpack/actions/actionname/action.js'),
      'manifest.yml': global.fixtureFile('/custom-webpack/manifest.yml')
    })
    // first call to globby is for processing includes, second call is to get/find webpack config
    globby.mockReturnValueOnce([])
    globby.mockReturnValueOnce([]) // call is to actions/actionname/*.config.js
    globby.mockReturnValueOnce(['actions/actionname/mock.array.async.functions.objects.webpack-config.js'])

    jest.mock('actions/actionname/mock.array.async.functions.objects.webpack-config.js', () => {
      return [async () => ({
        mode: 'none',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      }),
      async () => ({
        mode: 'development',
        optimization: { somefakefield: true, minimize: true },
        output: { fake: false, libraryTarget: 'fake' },
        entry: ['file.js'],
        resolve: {
          extensions: ['html', 'json', 'css'],
          mainFields: ['another'],
          anotherFake: ['yo']
        },
        plugins: ['hello'],
        target: 'cannotovewrite'
      })]
    }, { virtual: true })

    const clonedConfig = deepClone(global.sampleAppIncludesConfig)
    clonedConfig.manifest.full.packages.__APP_PACKAGE__.actions.action.function = 'actions/actionname/action.js'
    await buildActions(clonedConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith([{
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'none',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    },
    {
      entry: [path.resolve('actions/actionname/file.js'), path.resolve('/actions/actionname/action.js')],
      mode: 'development',
      optimization: { minimize: true, somefakefield: true },
      output: { fake: false, filename: 'index.js', libraryTarget: 'fake', path: path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp') },
      plugins: ['hello', {}],
      resolve: {
        anotherFake: ['yo'],
        extensions: ['html', 'json', 'css', '.js', '.json'],
        mainFields: ['another', 'main']
      },
      target: 'node'
    }])
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-include-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-include-1.0.0/action.zip'))
  })

  test('should bundle a single action file using webpack and zip it with manifest named package', async () => {
    global.fakeFileSystem.reset()
    global.fakeFileSystem.addJson({
      'actions/action-zip/index.js': global.fixtureFile('/named-package/actions/action-zip/index.js'),
      'actions/action-zip/package.json': global.fixtureFile('/named-package/actions/action-zip/package.json'),
      'actions/action.js': global.fixtureFile('/named-package/actions/action.js'),
      'web-src/index.html': global.fixtureFile('/named-package/web-src/index.html'),
      'manifest.yml': global.fixtureFile('/named-package/manifest.yml'),
      'package.json': global.fixtureFile('/named-package/package.json')
    })

    await buildActions(global.namedPackageConfig)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        entry: [path.resolve('/actions/action.js')],
        output: expect.objectContaining({
          path: path.normalize('/dist/actions/bobby-mcgee/action-temp'),
          filename: 'index.js'
        })
      })]))
    expect(utils.zip).toHaveBeenCalledTimes(2)
  })

  test('should still bundle a single action file when there is no ui', async () => {
    global.fakeFileSystem.removeKeys(['/web-src/index.html'])
    await buildActions(config)
    expect(webpackMock.run).toHaveBeenCalledTimes(1)
    expect(webpack).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        entry: [path.resolve('/actions/action.js')],
        output: expect.objectContaining({
          path: path.normalize('/dist/actions/sample-app-1.0.0/action-temp'),
          filename: 'index.js'
        })
      })]))
    expect(utils.zip).toHaveBeenCalledTimes(1)
    expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-1.0.0/action-temp'),
      path.normalize('/dist/actions/sample-app-1.0.0/action.zip'))
  })

  test('should fail if webpack throws an error', async () => {
    webpackMock.run.mockImplementation(cb => cb(new Error('fake webpack error')))
    await expect(buildActions(config)).rejects.toThrow('fake webpack error')
  })

  test('should write a debug message if webpack returns a warning', async () => {
    webpackStatsMock.hasWarnings.mockReturnValue(true)
    webpackStatsMock.toJson.mockReturnValue({
      warnings: 'fake warnings'
    })
    await buildActions(config)
    expect(mockLogger.warn).toHaveBeenCalledWith('webpack compilation warnings:\nfake warnings')
  })

  test('should throw if webpack returns an error', async () => {
    webpackStatsMock.hasErrors.mockReturnValue(true)
    webpackStatsMock.toJson.mockReturnValue({
      errors: 'fake errors'
    })
    // eslint-disable-next-line no-useless-escape
    await expect(buildActions(config)).rejects.toThrow('action build failed, webpack compilation errors:\n\"fake errors\"')
  })

  test('should both write a debug message and fail if webpack returns a warning and an error', async () => {
    webpackStatsMock.hasErrors.mockReturnValue(true)
    webpackStatsMock.hasWarnings.mockReturnValue(true)
    webpackStatsMock.toJson.mockReturnValue({
      errors: 'fake errors',
      warnings: 'fake warnings'
    })
    // eslint-disable-next-line no-useless-escape
    await expect(buildActions(config)).rejects.toThrow('action build failed, webpack compilation errors:\n\"fake errors\"')
    expect(mockLogger.warn).toHaveBeenCalledWith('webpack compilation warnings:\nfake warnings')
  })

  test('should print error objects when webpack fails', async () => {
    webpackStatsMock.hasErrors.mockReturnValue(true)
    webpackStatsMock.hasWarnings.mockReturnValue(true)
    webpackStatsMock.toJson.mockReturnValue({
      errors: { code: 42, message: 'it happens' },
      warnings: 'fake warnings'
    })
    // eslint-disable-next-line no-useless-escape
    await expect(buildActions(config)).rejects.toThrow('action build failed, webpack compilation errors:')
    expect(mockLogger.warn).toHaveBeenCalledWith('webpack compilation warnings:\nfake warnings')
  })
})

test('should build 1 zip action and 1 bundled action in one go', async () => {
  addSampleAppFiles()
  webpackMock.run.mockImplementation(cb => {
    global.fakeFileSystem.addJson({
      'dist/actions/action.tmp.js': 'fake'
    })
    cb(null, webpackStatsMock)
  })

  await buildActions(global.sampleAppConfig)
  expect(webpackMock.run).toHaveBeenCalledTimes(1)
  expect(webpack).toHaveBeenCalledWith(expect.arrayContaining([
    expect.objectContaining({
      entry: [path.resolve('/actions/action.js')],
      output: expect.objectContaining({
        path: expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-temp')),
        filename: 'index.js'
      })
    })]))
  expect(utils.zip).toHaveBeenCalledTimes(2)
  expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-1.0.0/action-temp'),
    path.normalize('/dist/actions/sample-app-1.0.0/action.zip'))
  expect(utils.zip).toHaveBeenCalledWith(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp'),
    path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
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

  await buildActions(global.sampleAppConfig, ['action'], true)

  expect(webpackMock.run).toHaveBeenCalledTimes(1)
  expect(webpack).toHaveBeenCalledWith(expect.arrayContaining([
    expect.objectContaining({
      entry: [path.resolve('/actions/action.js')],
      output: expect.objectContaining({
        path: path.normalize('/dist/actions/sample-app-1.0.0/action-temp'),
        filename: 'index.js'
      })
    })]))
  expect(utils.zip).toHaveBeenCalledTimes(1)
  expect(utils.zip).toHaveBeenCalledWith(expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action.zip'))
})

test('use buildConfig.filterActions to build only action called `action-zip`', async () => {
  addSampleAppFiles()
  await buildActions(global.sampleAppConfig, ['action-zip'], true)
  expect(utils.zip).toHaveBeenCalledTimes(1)
  expect(utils.zip).toHaveBeenCalledWith(expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
})

test('second build should require re-zip', async () => {
  addSampleAppFiles()
  await buildActions(global.sampleAppConfig, ['action-zip'], true)
  await buildActions(global.sampleAppConfig, ['action-zip'], false)
  expect(utils.zip).toHaveBeenCalledTimes(1)
  expect(utils.zip).toHaveBeenCalledWith(expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
})

test('use buildConfig.filterActions to build only action called `sample-app-1.0.0/action-zip`', async () => {
  addSampleAppFiles()
  await buildActions(global.sampleAppConfig, ['sample-app-1.0.0/action-zip'], true)
  expect(utils.zip).toHaveBeenCalledTimes(1)
  expect(utils.zip).toHaveBeenCalledWith(expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
})

test('non default package present in manifest', async () => {
  addSampleAppFiles()
  const config = deepClone(global.sampleAppConfig)
  config.manifest.full.packages.extrapkg = deepClone(config.manifest.full.packages.__APP_PACKAGE__)
  await buildActions(config, null, true)

  // extrapkg
  expect(utils.zip).toHaveBeenNthCalledWith(1, expect.stringContaining(path.normalize('/dist/actions/extrapkg/action-temp')),
    path.normalize('/dist/actions/extrapkg/action.zip'))
  expect(utils.zip).toHaveBeenNthCalledWith(2, expect.stringContaining(path.normalize('/dist/actions/extrapkg/action-zip-temp')),
    path.normalize('/dist/actions/extrapkg/action-zip.zip'))
  // default pkg
  expect(utils.zip).toHaveBeenNthCalledWith(3, expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action.zip'))
  expect(utils.zip).toHaveBeenNthCalledWith(4, expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
})

test('should not fail if default package does not have actions', async () => {
  addSampleAppFiles()
  const config = deepClone(global.sampleAppConfig)
  delete config.manifest.full.packages.__APP_PACKAGE__.actions
  await buildActions(config)
  expect(utils.zip).toHaveBeenCalledTimes(0)
})

test('should not fail if extra package does not have actions', async () => {
  addSampleAppFiles()
  const config = deepClone(global.sampleAppConfig)
  config.manifest.full.packages.extrapkg = deepClone(config.manifest.full.packages.__APP_PACKAGE__)
  delete config.manifest.full.packages.extrapkg.actions
  await buildActions(config, null, true)
  expect(utils.zip).toHaveBeenCalledTimes(2)
  // 2 calls for pkg action path.
  expect(utils.zip).toHaveBeenNthCalledWith(1, expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action.zip'))
  expect(utils.zip).toHaveBeenNthCalledWith(2, expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-zip-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action-zip.zip'))
})

test('should always zip action files when skipCheck=true', async () => {
  addSampleAppFiles()
  const config = deepClone(global.sampleAppConfig)
  // todo: this test is not actually testing what it claims the skipCheck=true part
  // we need to fake a previous build to test that
  await buildActions(config, ['action'], true)
  expect(utils.zip).toHaveBeenCalledWith(expect.stringContaining(path.normalize('/dist/actions/sample-app-1.0.0/action-temp')),
    path.normalize('/dist/actions/sample-app-1.0.0/action.zip'))
})

test('should not zip files if the action was built before (skipCheck=false)', async () => {
  addSampleAppFiles()
  const config = deepClone(global.sampleAppConfig)
  await buildActions(config, ['action'], false)
  expect(utils.zip).not.toHaveBeenCalled()
})

test('should not build if required file is not changed', async () => {
  addSampleAppFiles()
  const config = deepClone(global.sampleAppConfig)
  await buildActions(config, ['action'], true)
  expect(mockLogger.debug).toHaveBeenCalledWith(
    expect.stringContaining('action has changed since last build, building ..'),
    expect.any(String)
  )
  mockLogger.debug.mockClear()
  await buildActions(config, ['action'], false)
  expect(mockLogger.debug).toHaveBeenCalledWith(
    expect.stringContaining('action has not changed')
  )
  expect(utils.zip).toHaveBeenCalledTimes(1)
})

test('should not delete dist folder when emptyDist=false', async () => {
  addSampleAppFiles()
  const config = deepClone(global.sampleAppConfig)
  await buildActions(config, ['action'], false /* skipCheck */, false /* emptyDist */)
  expect(fs.emptyDirSync).not.toHaveBeenCalled()
})

test('should delete dist folder when emptyDist=true', async () => {
  addSampleAppFiles()
  const config = deepClone(global.sampleAppConfig)
  await buildActions(config, ['action'], false /* skipCheck */, true /* emptyDist */)
  expect(fs.emptyDirSync).toHaveBeenCalled()
})

test('No backend is present', async () => {
  addSampleAppFiles()
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
