const runtimeLibUtils = require('../src/utils')
const printFilteredActionLogsOriginal = runtimeLibUtils.printFilteredActionLogs
runtimeLibUtils.checkOpenWhiskCredentials = jest.fn()
const mockPrintFilteredActionLogs = jest.fn(async (runtime, logger, limit, filterActions, strip, startTime) => {
  return printFilteredActionLogsOriginal(runtime, logger, limit, filterActions, strip, startTime)
})
runtimeLibUtils.printFilteredActionLogs = mockPrintFilteredActionLogs
const printActionLogs = require('../src/print-action-logs')
const util = require('util')

jest.mock('util')
util.promisify = jest.fn()
util.inherits = jest.fn()

jest.mock('../src/RuntimeAPI')
const ioruntime = require('../src/RuntimeAPI')
const owListActivationMock = jest.fn()
const owLogsActivationMock = jest.fn()
const owGetActivationMock = jest.fn()
const owMock = {
  activations: {
    list: owListActivationMock,
    logs: owLogsActivationMock,
    get: owGetActivationMock
  }
}
ioruntime.mockImplementation(() => {
  return {
    init: () => {
      return owMock
    }
  }
})

describe('printActionLogs', () => {
  const fakeConfig = {
    ow: {
      apihost: 'https://fake.com',
      apiversion: 'v0',
      auth: 'abcde',
      namespace: 'dude'
    }
  }
  const logger = jest.fn()
  beforeEach(async () => {
    // rtLib = await RuntimeLib.init({ fake: 'credentials' })
    logger.mockReset()
    ioruntime.mockClear()
    owListActivationMock.mockReset()
    owLogsActivationMock.mockReset()
    owGetActivationMock.mockReset()
    // runtimeLibUtils.printFilteredActionLogs.mockReset()
  })

  test('inits the runtime lib instance', async () => {
    owListActivationMock.mockResolvedValue([])
    owLogsActivationMock.mockResolvedValue({ logs: [] })
    await printActionLogs(fakeConfig, logger, 1)
    expect(ioruntime).toHaveBeenCalled()
    expect(owListActivationMock).toHaveBeenCalled()
  })

  test('(config, limit=1, logger) and no activations', async () => {
    owListActivationMock.mockResolvedValue([])
    owLogsActivationMock.mockResolvedValue({ logs: [] })
    await printActionLogs(fakeConfig, logger, 1)
    expect(ioruntime).toHaveBeenCalled()
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 1, skip: 0, since: 0 })
    expect(owLogsActivationMock).not.toHaveBeenCalled()
    expect(logger).not.toHaveBeenCalled()
  })

  test('(config, limit=3, custom banner) and 3 activations and no logs', async () => {
    const activations = [
      { activationId: 123, start: 555555, name: 'one' },
      { activationId: 456, start: 555666, name: 'two' },
      { activationId: 100, start: 666666, name: 'three' }
    ]
    owListActivationMock.mockResolvedValue(activations)
    owLogsActivationMock.mockResolvedValue({ logs: [] })

    const mockBannerLogger = jest.fn()
    await printActionLogs(fakeConfig, { bannerFunc: mockBannerLogger }, 3)

    expect(mockBannerLogger).toHaveBeenCalledTimes(3)
    expect(mockBannerLogger).toHaveBeenNthCalledWith(1, activations[2], [])
    expect(mockBannerLogger).toHaveBeenNthCalledWith(2, activations[1], [])
    expect(mockBannerLogger).toHaveBeenNthCalledWith(3, activations[0], [])
  })

  test('(config, limit=3, custom logger) and 3 activations with logs', async () => {
    const activations = [
      { activationId: 123, start: 555555, name: 'one', annotations: [] },
      { activationId: 456, start: 555666, name: 'two', annotations: [] },
      { activationId: 100, start: 666666, name: 'three', annotations: [{ key: 'path', value: 'three' }] }
    ]
    owListActivationMock.mockResolvedValue(activations)
    owLogsActivationMock.mockResolvedValue({ logs: ['ABC'] })

    const mockCustomLogger = jest.fn()
    await printActionLogs(fakeConfig, { logFunc: mockCustomLogger }, 3)
    expect(mockCustomLogger).toHaveBeenCalledTimes(3 + 1) // only one activation has annotations for a banner
  })

  test('(config, limit=3, logger) and 3 activations and no logs', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one' },
      { activationId: 456, start: 555666, name: 'two' },
      { activationId: 100, start: 666666, name: 'three' }
    ])
    owLogsActivationMock.mockResolvedValue({ logs: [] })
    await printActionLogs(fakeConfig, logger, 3)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 3, skip: 0, since: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(3)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 100 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(2, { activationId: 456 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(3, { activationId: 123 })
    expect(logger).not.toHaveBeenCalled()
  })

  test('with sequence action', async () => {
    owListActivationMock.mockResolvedValue([
      {
        activationId: 123,
        start: 555555,
        name: 'one',
        annotations: [{ key: 'kind', value: 'sequence' }],
        logs: [
          321
        ]
      }
    ])
    owGetActivationMock.mockImplementation(activationId => {
      if (activationId === 123) {
        // Sub sequence activation
        return {
          activationId: 123,
          start: 555555,
          name: 'one',
          annotations: [{ key: 'kind', value: 'sequence' }],
          logs: [
            321
          ]
        }
      } else {
        // Stub action activation
        return {
          activationId: 321,
          start: 555555,
          name: 'one',
          logs: []
        }
      }
    })

    owLogsActivationMock.mockResolvedValue({ logs: [] })
    await printActionLogs(fakeConfig, logger, 3)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 3, skip: 0, since: 0 })
    expect(owGetActivationMock).toHaveBeenCalledTimes(2)
    expect(owLogsActivationMock).toHaveBeenCalledTimes(1)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 321 })
    expect(logger).not.toHaveBeenCalled()
  })

  test('with sequence action - error', async () => {
    owListActivationMock.mockResolvedValue([
      {
        activationId: 123,
        start: 555555,
        name: 'one',
        annotations: [{ key: 'kind', value: 'sequence' }],
        logs: [
          321
        ]
      }
    ])
    owGetActivationMock.mockImplementation(activationId => {
      throw new Error()
    })

    await printActionLogs(fakeConfig, logger, 3)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 3, skip: 0, since: 0 })
    expect(owGetActivationMock).toHaveBeenCalledTimes(1)
  })

  test('with an action and a sequence that uses the same action - should not log twice', async () => {
    owListActivationMock.mockResolvedValue([
      {
        activationId: 123,
        start: 555555,
        name: 'oneseq',
        annotations: [{ key: 'kind', value: 'sequence' }],
        logs: [
          '124'
        ]
      },
      {
        activationId: 124,
        start: 555555,
        name: 'oneaction',
        annotations: [{ key: 'path', value: 'action1' }],
        logs: [
          'dummy'
        ]
      }
    ])
    owGetActivationMock.mockImplementation(activationId => {
      if (activationId === 123) {
        // Sub sequence activation
        return {
          activationId: 123,
          start: 555555,
          name: 'oneseq',
          annotations: [{ key: 'kind', value: 'sequence' }],
          logs: [
            124
          ]
        }
      } else {
        // Stub action activation
        return {
          activationId: 124,
          start: 555555,
          name: 'oneaction',
          logs: []
        }
      }
    })

    owLogsActivationMock.mockResolvedValue({ logs: [] })
    await printActionLogs(fakeConfig, logger, 3)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 3, skip: 0, since: 0 })
    expect(owGetActivationMock).toHaveBeenCalledTimes(2)
    expect(owLogsActivationMock).toHaveBeenCalledTimes(1) // Only once
  })

  test('(config, limit=45, logger) and 3 activations and logs for 2 of them', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [] },
      { activationId: 456, start: 555666, name: 'two', annotations: [] },
      { activationId: 100, start: 666666, name: 'three', annotations: [{ key: 'path', value: 'three' }] }
    ])
    owLogsActivationMock.mockImplementation(a => {
      if (a.activationId === 100) {
        return { logs: ['three A', 'three B', 'three C'] }
      } else if (a.activationId === 456) {
        return { logs: ['two A \n two B'] }
      }
      return { logs: [] }
    })

    await printActionLogs(fakeConfig, logger, 45)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0, since: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(3)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 100 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(2, { activationId: 456 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(3, { activationId: 123 })
    expect(logger).toHaveBeenCalledTimes(5)
    expect(logger).toHaveBeenNthCalledWith(1, 'three:100')
    expect(logger).toHaveBeenNthCalledWith(2, 'three A')
    expect(logger).toHaveBeenNthCalledWith(3, 'three B')
    expect(logger).toHaveBeenNthCalledWith(4, 'three C')
    expect(logger).toHaveBeenNthCalledWith(5, expect.stringContaining('two A \n two B'))
  })

  test('(config, limit=45, logger, startTime=bigger than first 2) and 3 activations and logs for 2 of them', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [] },
      { activationId: 456, start: 555666, name: 'two', annotations: [] },
      { activationId: 100, start: 666666, name: 'three', annotations: [] }
    ])
    owLogsActivationMock.mockImplementation(a => {
      if (a.activationId === 100) {
        return { logs: ['three A', 'three B', 'three C'] }
      } else if (a.activationId === 456) {
        return { logs: ['two A \n two B'] }
      }
      return { logs: [] }
    })

    await printActionLogs(fakeConfig, logger, 45, [], false, false, undefined, 666665)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0, since: 666665 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(1)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 100 })
    expect(logger).toHaveBeenCalledTimes(3)
    expect(logger).toHaveBeenNthCalledWith(1, 'three A')
    expect(logger).toHaveBeenNthCalledWith(2, 'three B')
    expect(logger).toHaveBeenNthCalledWith(3, 'three C')
    // expect(logger).toHaveBeenNthCalledWith(4) // new line
  })

  test('(config, limit=45, no logger) and 1 activation and 1 log', async () => {
    const spy = jest.spyOn(console, 'log')
    spy.mockImplementation(() => { })

    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [] }
    ])
    owLogsActivationMock.mockImplementation(a => {
      if (a.activationId === 123) {
        return { logs: ['one A'] }
      }
      return { logs: [] }
    })

    await printActionLogs(fakeConfig, undefined, 45)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0, since: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(1)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 123 })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenNthCalledWith(1, 'one A')
    // expect(spy).toHaveBeenNthCalledWith(3) // new line

    spy.mockRestore()
  })

  test('with filterActions (specific actions)', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [{ key: 'path', value: 'ns/pkg1/one' }] },
      { activationId: 456, start: 555666, name: 'two', annotations: [{ key: 'path', value: 'ns/pkg2/two' }] },
      { activationId: 100, start: 666666, name: 'three', annotations: [{ key: 'path', value: 'ns/pkg1/three' }] }
    ])
    owLogsActivationMock.mockImplementation(a => {
      if (a.activationId === 100) {
        return { logs: ['three A', 'three B', 'three C'] }
      } else if (a.activationId === 456) {
        return { logs: ['two A \n two B'] }
      } else if (a.activationId === 123) {
        return { logs: ['one A', 'one B'] }
      }
      return { logs: [] }
    })

    await printActionLogs(fakeConfig, logger, 45, ['pkg1/one', 'pkg2/two'])
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0, since: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(2)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 456 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(2, { activationId: 123 })
    expect(logger).toHaveBeenCalledTimes(5)
    expect(logger).toHaveBeenNthCalledWith(1, 'ns/pkg2/two:456')
    expect(logger).toHaveBeenNthCalledWith(2, 'two A \n two B')
    expect(logger).toHaveBeenNthCalledWith(3, 'ns/pkg1/one:123')
    expect(logger).toHaveBeenNthCalledWith(4, 'one A')
    expect(logger).toHaveBeenNthCalledWith(5, 'one B')
    // expect(logger).toHaveBeenNthCalledWith(4) // new line
  })

  test('with filterActions (deployed package)', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [{ key: 'path', value: 'ns/pkg1/one' }] },
      { activationId: 456, start: 555666, name: 'two', annotations: [{ key: 'path', value: 'ns/pkg2/two' }] },
      { activationId: 100, start: 666666, name: 'three', annotations: [{ key: 'path', value: 'ns/pkg1/three' }] }
    ])
    owLogsActivationMock.mockImplementation(a => {
      if (a.activationId === 100) {
        return { logs: ['three A', 'three B', 'three C'] }
      } else if (a.activationId === 456) {
        return { logs: ['two A \n two B'] }
      } else if (a.activationId === 123) {
        return { logs: ['one A', 'one B'] }
      }
      return { logs: [] }
    })

    await printActionLogs(fakeConfig, logger, 45, ['pkg1/', '/pkg/'])
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0, since: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(2)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 100 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(2, { activationId: 123 })
    expect(logger).toHaveBeenCalledTimes(7)
    expect(logger).toHaveBeenNthCalledWith(1, 'ns/pkg1/three:100')
    expect(logger).toHaveBeenNthCalledWith(2, 'three A')
    expect(logger).toHaveBeenNthCalledWith(3, 'three B')
    expect(logger).toHaveBeenNthCalledWith(4, 'three C')
    expect(logger).toHaveBeenNthCalledWith(5, 'ns/pkg1/one:123')
    expect(logger).toHaveBeenNthCalledWith(6, 'one A')
    expect(logger).toHaveBeenNthCalledWith(7, 'one B')
    // expect(logger).toHaveBeenNthCalledWith(4) // new line
  })

  test('with filterActions (single action) and strip', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [{ key: 'path', value: 'ns/pkg1/one' }] },
      { activationId: 456, start: 555666, name: 'two', annotations: [{ key: 'path', value: 'ns/pkg2/two' }, {}] },
      { activationId: 100, start: 666666, name: 'three', annotations: [{ key: 'path', value: 'ns/pkg1/three' }] }
    ])
    owLogsActivationMock.mockImplementation(a => {
      if (a.activationId === 100) {
        return { logs: ['three A', 'three B', 'three C'] }
      } else if (a.activationId === 456) {
        return { logs: ['2019-10-11T19:08:57.298Z       stdout: two A \n two B'] }
      } else if (a.activationId === 123) {
        return { logs: ['one A', 'one B'] }
      }
      return { logs: [] }
    })

    await printActionLogs(fakeConfig, logger, 45, ['pkg2/two'], true)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, name: 'pkg2/two', skip: 0, since: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(1)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 456 })
    expect(logger).toHaveBeenCalledTimes(2)
    expect(logger).toHaveBeenNthCalledWith(1, 'ns/pkg2/two:456')
    expect(logger).toHaveBeenNthCalledWith(2, 'two A ')
  })

  test('strip should not alter order', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [{ key: 'path', value: 'ns/pkg1/one' }] }
    ])
    owLogsActivationMock.mockImplementation(a => {
      return { logs: ['2019-10-11T19:08:57.298Z       stdout: B', '2019-10-11T19:08:57.299Z       stdout: A'] }
    })

    await printActionLogs(fakeConfig, logger, 45, [], true)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0, since: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(1)
    expect(logger).toHaveBeenCalledTimes(3)
    expect(logger).toHaveBeenNthCalledWith(2, 'B')
    expect(logger).toHaveBeenNthCalledWith(3, 'A')
  })

  test('error from activation logs call', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [{ key: 'path', value: 'ns/pkg1/one' }] },
      { activationId: 456, start: 555666, name: 'two', annotations: [{ key: 'path', value: 'ns/pkg2/two' }] },
      { activationId: 100, start: 666666, name: 'three', annotations: [{ key: 'path', value: 'ns/pkg1/three' }] }
    ])
    owLogsActivationMock.mockRejectedValue(new Error('fake'))

    await printActionLogs(fakeConfig, logger, 45, ['pkg1/'], true)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0, since: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(2)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 100 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(2, { activationId: 123 })
    expect(logger).toHaveBeenCalledTimes(0)
  })

  test('with filterActions (single action) and tail', async () => {
    runtimeLibUtils.printFilteredActionLogs.mockClear()
    const mockPrintFilteredActionLogs = runtimeLibUtils.printFilteredActionLogs.mockImplementation(async (runtime, logger, limit, filterActions = [], strip = false, startTime = 0) => {
      return { lastActivationTime: 1 }
    })
    const promiseCall = printActionLogs(fakeConfig, logger, 2, ['pkg2/two'], false, true, 1)
    await expect(promiseCall).rejects.toThrow('sleep is not a function')
    expect(mockPrintFilteredActionLogs).toHaveBeenCalledTimes(1)
  })
})
