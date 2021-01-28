
const runtimeLibUtils = require('../src/utils')
const printFilteredActionLogsOriginal = runtimeLibUtils.printFilteredActionLogs
runtimeLibUtils.checkOpenWhiskCredentials = jest.fn()
const mockPrintFilteredActionLogs = jest.fn(async (runtime, logger, limit, filterActions, strip, startTime) => {
  // console.log('in mocked filterprint')
  return printFilteredActionLogsOriginal(runtime, logger, limit, filterActions, strip, startTime)
})
runtimeLibUtils.printFilteredActionLogs = mockPrintFilteredActionLogs
const printActionLogs = require('../src/print-action-logs')

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
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 1, skip: 0 })
    expect(owLogsActivationMock).not.toHaveBeenCalled()
    expect(logger).not.toHaveBeenCalled()
  })

  test('(config, limit=3, logger) and 3 activations and no logs', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one' },
      { activationId: 456, start: 555666, name: 'two' },
      { activationId: 100, start: 666666, name: 'three' }
    ])
    owLogsActivationMock.mockResolvedValue({ logs: [] })
    await printActionLogs(fakeConfig, logger, 3)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 3, skip: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(3)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 100 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(2, { activationId: 456 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(3, { activationId: 123 })
    expect(logger).not.toHaveBeenCalled()
  })

  test('(config, limit=3, logger) and sequence and no logs', async () => {
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
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 3, skip: 0 })
    expect(owGetActivationMock).toHaveBeenCalledTimes(2)
    expect(owLogsActivationMock).toHaveBeenCalledTimes(1)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 321 })
    expect(logger).not.toHaveBeenCalled()
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
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0 })
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
    // expect(logger).toHaveBeenNthCalledWith(5) // new line
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
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0 })
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
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0 })
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
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0 })
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
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0 })
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
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, name: 'pkg2/two', skip: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(1)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 456 })
    expect(logger).toHaveBeenCalledTimes(2)
    expect(logger).toHaveBeenNthCalledWith(1, 'ns/pkg2/two:456')
    expect(logger).toHaveBeenNthCalledWith(2, 'two A ')
    // expect(logger).toHaveBeenNthCalledWith(4) // new line
  })

  test('error from activation logs call', async () => {
    owListActivationMock.mockResolvedValue([
      { activationId: 123, start: 555555, name: 'one', annotations: [{ key: 'path', value: 'ns/pkg1/one' }] },
      { activationId: 456, start: 555666, name: 'two', annotations: [{ key: 'path', value: 'ns/pkg2/two' }] },
      { activationId: 100, start: 666666, name: 'three', annotations: [{ key: 'path', value: 'ns/pkg1/three' }] }
    ])
    owLogsActivationMock.mockRejectedValue(new Error('fake'))

    await printActionLogs(fakeConfig, logger, 45, ['pkg1/'], true)
    expect(owListActivationMock).toHaveBeenCalledWith({ limit: 45, skip: 0 })
    expect(owLogsActivationMock).toHaveBeenCalledTimes(2)
    // reverse order
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(1, { activationId: 100 })
    expect(owLogsActivationMock).toHaveBeenNthCalledWith(2, { activationId: 123 })
    expect(logger).toHaveBeenCalledTimes(0)
  })

  test('with filterActions (single action) and tail', async () => {
    runtimeLibUtils.printFilteredActionLogs.mockClear()
    // This will be called exactly 2 times because we are making it fail the second time
    const mockPrintFilteredActionLogs = runtimeLibUtils.printFilteredActionLogs.mockImplementation(async (runtime, logger, limit, filterActions = [], strip = false, startTime = 0) => {
      if (startTime !== 0) {
        // console.log('in custom mock')
        return
      }
      return { lastActivationTime: 1 }
    })
    const promiseCall = printActionLogs(fakeConfig, logger, 2, ['pkg2/two'], false, true, 1)
    await expect(promiseCall).rejects.toThrowError('Cannot read property \'lastActivationTime\' of undefined')

    expect(mockPrintFilteredActionLogs).toHaveBeenCalledTimes(2)
    expect(mockPrintFilteredActionLogs.mock.calls[1][5]).toBe(1)
    // expect(logger).toHaveBeenNthCalledWith(4) // new line
  })
})
