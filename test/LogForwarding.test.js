const fetch = require('cross-fetch')
const LogForwarding = require('../src/LogForwarding')

jest.mock('cross-fetch')

const apiUrl = 'host/runtime/namespaces/some_namespace/logForwarding'

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
  logForwarding = new LogForwarding('some_namespace', 'host', 'key')
  fetch.mockReset()
})

test('get', async () => {
  return new Promise(resolve => {
    fetch.mockReturnValue(new Promise(resolve => {
      resolve({
        json: jest.fn().mockResolvedValue('result')
      })
    }))
    return logForwarding.get()
      .then((res) => {
        expect(fetch).toBeCalledTimes(1)
        expect(res).toBe('result')
        assertRequest('get')
        resolve()
      })
  })
})

test('get failed', async () => {
  fetch.mockRejectedValue(new Error('mocked error'))
  await expect(logForwarding.get()).rejects.toThrow("Could not get log forwarding settings for namespace 'some_namespace': mocked error")
})

test.each(dataFixtures)('set %s', async (destination, fnName, input) => {
  return new Promise(resolve => {
    fetch.mockReturnValue(new Promise(resolve => {
      resolve({
        text: jest.fn().mockResolvedValue(`result for ${destination}`)
      })
    }))
    return logForwarding[fnName](...Object.values(input))
      .then((res) => {
        expect(fetch).toBeCalledTimes(1)
        expect(res).toBe(`result for ${destination}`)
        assertRequest('put', { [destination]: input })
        resolve()
      })
  })
})

test.each(dataFixtures)('set %s failed', async (destination, fnName, input) => {
  fetch.mockRejectedValue(new Error(`mocked error for ${destination}`))
  await expect(logForwarding[fnName]())
    .rejects
    .toThrow(`Could not update log forwarding settings for namespace 'some_namespace': mocked error for ${destination}`)
})

function assertRequest (expectedMethod, expectedData) {
  expect(fetch).toBeCalledWith(apiUrl, {
    method: expectedMethod,
    body: JSON.stringify(expectedData),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from('key').toString('base64')
    }
  })
}
