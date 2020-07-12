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

const { createKeyValueObjectFromArray } = require('./utils')
const cloneDeep = require('lodash.clonedeep')
const FEED_ANNOTATION_KEY = 'feed'

class Triggers {
  constructor (client) {
    this.owclient = client
  }

  async create (options) {
    const newOptions = cloneDeep(options)
    if (newOptions && newOptions.trigger && newOptions.trigger.feed) {
      newOptions.trigger.annotations = newOptions.trigger.annotations || []
      newOptions.trigger.annotations.push({ key: FEED_ANNOTATION_KEY, value: newOptions.trigger.feed })
    }
    const ret = await this.owclient.triggers.create(newOptions)
    if (newOptions && newOptions.trigger && newOptions.trigger.feed) {
      try {
        // Feed update does not work if the feed is not already present and create fails if it's already there.
        // So we are deleting it and ignoring the error if any.
        try {
          await this.owclient.feeds.delete({ name: newOptions.trigger.feed, trigger: newOptions.name })
        } catch (err) {
          // Ignore
        }
        await this.owclient.feeds.create({ name: newOptions.trigger.feed, trigger: newOptions.name, params: createKeyValueObjectFromArray(newOptions.trigger.parameters) })
      } catch (err) {
        await this.owclient.triggers.delete(newOptions)
        throw err
      }
    }
    return ret
  }

  async delete (options) {
    const retTrigger = await this.owclient.triggers.get(options)
    if (retTrigger.annotations) {
      for (const annotation of retTrigger.annotations) {
        if (annotation.key === FEED_ANNOTATION_KEY) {
          await this.owclient.feeds.delete({ name: annotation.value, trigger: options.name })
        }
      }
    }
    return this.owclient.triggers.delete(options)
  }
}

module.exports = Triggers
