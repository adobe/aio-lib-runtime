const LogForwarding = require('../src/LogForwarding')
const LogForwardingLocalDestinationsProvider = require('../src/LogForwardingLocalDestinationsProvider')
const { createFetch } = require('@adobe/aio-lib-core-networking')
const mockFetch = jest.fn()

jest.mock('@adobe/aio-lib-core-networking')

const apiUrl = 'https://host/runtime/namespaces/some_namespace/logForwarding'

const dataFixtures = [
  ['adobe_io_runtime', 'setAdobeIoRuntime', {}],
  ['azure_log_analytics', 'setAzureLogAnalytics', {
    customer_id: 'customer1',
    shared_key: 'key1',
    log_type: 'mylog'
  }],
  ['splunk_hec', 'setSplunkHec', {
    host: 'host1',
    port: 'port1',
    index: 'index1',
    hec_token: 'token1'
  }]
]

let logForwarding

beforeEach(async () => {
  logForwarding = new LogForwarding(
    'some_namespace',
    'https://host',
    'key',
    new LogForwardingLocalDestinationsProvider()
  )
  createFetch.mockReturnValue(mockFetch)
  mockFetch.mockReset()
})

test('ensure apihost protocol is not duplicated', async () => {
  expect(logForwarding.apiHost).toEqual('https://host')
})

test('ensure apihost has protocol', async () => {
  logForwarding = new LogForwarding(
    'some_namespace',
    'host',
    'key',
    new LogForwardingLocalDestinationsProvider()
  )
  expect(logForwarding.apiHost).toEqual('https://host')
})

test('get', async () => {
  return new Promise(resolve => {
    mockFetch.mockReturnValue(new Promise(resolve => {
      resolve({
        ok: true,
        json: jest.fn().mockResolvedValue('result')
      })
    }))
    return logForwarding.get()
      .then((res) => {
        expect(mockFetch).toBeCalledTimes(1)
        expect(res).toBe('result')
        assertRequest('get')
        resolve()
      })
  })
})

test('get request failed', async () => {
  mockFetch.mockRejectedValue(new Error('mocked error'))
  await expect(logForwarding.get()).rejects.toThrow("Could not get log forwarding settings for namespace 'some_namespace': mocked error")
})

test('get failed on server', async () => {
  const res = {
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    text: jest.fn().mockResolvedValue('Error')
  }
  mockFetch.mockImplementation(() => res)
  await expect(logForwarding.get()).rejects.toThrow("Could not get log forwarding settings for namespace 'some_namespace': 400 (Bad Request). Error: Error")
})

test.each(dataFixtures)('set %s (deprecated)', async (destination, fnName, input) => {
  return new Promise(resolve => {
    const result = { [destination]: { field: 'data' } }
    mockFetch.mockReturnValue(new Promise(resolve => {
      resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(result)
      })
    }))
    return logForwarding[fnName](...Object.values(input))
      .then((res) => {
        expect(mockFetch).toBeCalledTimes(1)
        expect(res).toBe(result)
        assertRequest('put', { [destination]: input })
        resolve()
      })
  })
})

test.each(dataFixtures)('set %s failed (deprecated)', async (destination, fnName, input) => {
  const res = {
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    text: jest.fn().mockResolvedValue(`Error for ${destination}`)
  }
  mockFetch.mockImplementation(() => res)

  await expect(logForwarding[fnName]())
    .rejects
    .toThrow(`Could not update log forwarding settings for namespace 'some_namespace': 400 (Bad Request). Error: Error for ${destination}`)
})

test('get supported destinations', async () => {
  return new Promise(resolve => {
    const res = logForwarding.getSupportedDestinations()
    expect(res).toEqual(
      [
        { value: 'adobe_io_runtime', name: 'Adobe I/O Runtime' },
        { value: 'azure_log_analytics', name: 'Azure Log Analytics' },
        { value: 'splunk_hec', name: 'Splunk HEC' }
      ]
    )
    resolve()
  })
})

test('get destination settings', async () => {
  return new Promise(resolve => {
    const actual = logForwarding.getDestinationSettings('splunk_hec')
    expect(actual).toEqual([
      {
        message: 'host',
        name: 'host'
      },
      {
        message: 'port',
        name: 'port'
      },
      {
        message: 'index',
        name: 'index'
      },
      {
        message: 'hec_token',
        name: 'hec_token',
        type: 'password'
      }
    ])
    resolve()
  })
})

test('get settings for unsupported destination', async () => {
  return new Promise(resolve => {
    expect(() => {
      logForwarding.getDestinationSettings('unsupported')
    }).toThrow("Destination 'unsupported' is not supported")
    resolve()
  })
})

test('set destination', async () => {
  return new Promise(resolve => {
    const result = { destination: { field: 'data' } }
    mockFetch.mockReturnValue(new Promise(resolve => {
      resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(result)
      })
    }))
    return logForwarding.setDestination('destination', { k: 'v' })
      .then((res) => {
        expect(mockFetch).toBeCalledTimes(1)
        expect(res).toBe(result)
        assertRequest('put', { destination: { k: 'v' } })
        resolve()
      })
  })
})

test('set destination failed', async () => {
  mockFetch.mockRejectedValue(new Error('mocked error'))
  await expect(logForwarding.setDestination('destination', {}))
    .rejects.toThrow("Could not update log forwarding settings for namespace 'some_namespace': mocked error")
})

test.each([
  [
    'errors exist',
    {
      destination: 'destination',
      errors: [
        'error1',
        'error2'
      ]
    },
    {
      destination: 'destination',
      errors: [
        'error1',
        'error2'
      ]
    }
  ],
  [
    'no errors',
    {
      destination: 'destination',
      errors: []
    },
    {
      destination: 'destination',
      errors: []
    }
  ],
  [
    'empty remote response',
    {},
    {
      destination: undefined,
      errors: []
    }
  ]
])('get errors (%s)', async (test, remoteResponse, expected) => {
  mockFetch.mockReturnValue(new Promise(resolve => {
    resolve({
      ok: true,
      json: jest.fn().mockResolvedValue(remoteResponse)
    })
  }))
  expect(await logForwarding.getErrors()).toEqual(expected)
  expect(mockFetch).toBeCalledTimes(1)
  assertRequest('get', undefined, '/errors')
})

test('could not get errors', async () => {
  mockFetch.mockRejectedValue(new Error('mocked error'))
  await expect(logForwarding.getErrors())
    .rejects.toThrow("Could not get log forwarding errors for namespace 'some_namespace': mocked error")
})

const assertRequest = (expectedMethod, expectedData, expectedSubPath = '') => {
  expect(mockFetch).toBeCalledWith(apiUrl + expectedSubPath, {
    method: expectedMethod,
    body: JSON.stringify(expectedData),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from('key').toString('base64')
    }
  })
}
