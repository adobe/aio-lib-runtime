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
const Readable = require('stream').Readable

const mockConstructor = jest.fn()
const mockDirectory = jest.fn()
const mockFile = jest.fn()
let fakeError = false

const mockArchive = () => {
  // this hacky, make sure the fake read stream works as expected and that there are no corner cases
  const ret = new Readable({
    read: fakeError
      ? function () { ret.push(null); this.emit('error', fakeError); this.destroy() }
      : function () { this.push('a') }
  })
  ret.file = mockFile
  ret.directory = mockDirectory
  ret.finalize = () => { if (!fakeError) { ret.push(null) } }
  return ret
}

// archiver 8 exposes a class API (`new ZipArchive(options)`); mock it as a class whose
// constructor returns the fake archive stream, preserving the previous mock behavior.
class ZipArchive {
  constructor (...args) {
    mockConstructor(args)
    return mockArchive()
  }
}

module.exports = {
  ZipArchive,
  mockFile,
  mockDirectory,
  mockConstructor,
  setFakeError: function (e) { fakeError = e },
  mockReset: () => {
    mockConstructor.mockReset()
    mockDirectory.mockReset()
    mockFile.mockReset()
    fakeError = false
  }
}
