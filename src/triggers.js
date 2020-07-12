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
const FEED_ANNOTATION_KEY = 'feed'

class Triggers {
  constructor (client) {
    this.owclient = client
  }

  async create (options) {
    if (options && options.trigger && options.trigger.feed) {
      options.trigger.annotations = options.trigger.annotations || []
      options.trigger.annotations.push({ key: FEED_ANNOTATION_KEY, value: options.trigger.feed })
    }
    const ret = await this.owclient.triggers.create(options)
    if (options && options.trigger && options.trigger.feed) {
      try {
        // Feed update does not work if the feed is not already present and create fails if it's already there.
        // So we are deleting it and ignoring the error if any.
        try {
          await this.owclient.feeds.delete({ name: options.trigger.feed, trigger: options.name })
        } catch (err) {
          // Ignore
        }
        await this.owclient.feeds.create({ name: options.trigger.feed, trigger: options.name, params: createKeyValueObjectFromArray(options.trigger.parameters) })
      } catch (err) {
        await this.owclient.triggers.delete(options)
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
