/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const TheHelper = require('../src/helpers.js')

describe('createKeyValueObjectFromArray', () => {
  test('fail when array item does not have key or value', () => {
    const func = () => TheHelper.createKeyValueObjectFromArray([{}])
    expect(func).toThrow(new Error('Please provide correct input array with key and value params in each array item'))
  })
  test('array of key:value (string) pairs', () => {
    const res = TheHelper.createKeyValueObjectFromArray([{ key: 'key1', value: 'val2' }])
    expect(res).toMatchObject({ key1: 'val2' })
  })
})
