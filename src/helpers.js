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

/**
 * @description returns key value pairs in an object from the key value array supplied. Used to create parameters object
 * @returns {object} An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 * @param {Array} inputsArray Array in the form of [{'key':'key1', 'value': 'value1'}]
 */
function createKeyValueObjectFromArray (inputsArray = []) {
  const tempObj = {}
  inputsArray.forEach((input) => {
    if (input.key && input.value) {
      try {
        // assume it is JSON, there is only 1 way to find out
        tempObj[input.key] = JSON.parse(input.value)
      } catch (ex) {
        // hmm ... not json, treat as string
        tempObj[input.key] = input.value
      }
    } else {
      throw (new Error('Please provide correct input array with key and value params in each array item'))
    }
  })
  return tempObj
}

module.exports = {
  createKeyValueObjectFromArray
}
