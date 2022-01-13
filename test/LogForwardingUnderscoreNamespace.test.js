const LogForwarding = require('../src/LogForwarding')
const LogForwardingLocalDestinationsProvider = require('../src/LogForwardingLocalDestinationsProvider')

const { createFetch } = require('@adobe/aio-lib-core-networking')
const mockFetch = jest.fn()

jest.mock('@adobe/aio-lib-core-networking')

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
    '_',
    'host',
    'key',
    new LogForwardingLocalDestinationsProvider()
  )
  createFetch.mockReturnValue(mockFetch)
  mockFetch.mockReset()
})

test('get for namespace "_" is not supported', async () => {
  await expect(logForwarding.get()).rejects.toThrow("Namespace '_' is not supported by log forwarding management API")
})

test.each(dataFixtures)('set (deprecated) %s for namespace "_" is not supported', async (destination, fnName, input) => {
  await expect(logForwarding[fnName](...Object.values(input))).rejects.toThrow("Namespace '_' is not supported by log forwarding management API")
})

test.each(dataFixtures)('set %s for namespace "_" is not supported', async (destination, fnName, input) => {
  await expect(logForwarding.setDestination(destination, input)).rejects.toThrow("Namespace '_' is not supported by log forwarding management API")
})
