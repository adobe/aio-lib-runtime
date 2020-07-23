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
const cloneDeep = require('lodash.clonedeep')

/**
 * A class to manage triggers
 *
 * @class Triggers
 */
class Triggers {
  constructor (client) {
    this.owclient = client
  }

  /**
   * Creates a trigger and associated feeds
   *
   * @param {object} options input options to create the trigger from manifest
   * @returns {Promise<object>} the result of the create operation
   * @memberof Triggers
   */
  async create (options) {
    // avoid side effects
    const copyOptions = cloneDeep(options)
    if (copyOptions && copyOptions.trigger && copyOptions.trigger.feed) {
      copyOptions.trigger.annotations = copyOptions.trigger.annotations || []
      copyOptions.trigger.annotations.push({ key: FEED_ANNOTATION_KEY, value: copyOptions.trigger.feed })
    }
    const ret = await this.owclient.triggers.create(copyOptions)
    if (copyOptions && copyOptions.trigger && copyOptions.trigger.feed) {
      try {
        // Feed update does not work if the feed is not already present and create fails if it's already there.
        // So we are deleting it and ignoring the error if any.
        try {
          await this.owclient.feeds.delete({ name: copyOptions.trigger.feed, trigger: copyOptions.name })
        } catch (err) {
          // Ignore
        }
        await this.owclient.feeds.create({ name: copyOptions.trigger.feed, trigger: copyOptions.name, params: createKeyValueObjectFromArray(copyOptions.trigger.parameters) })
      } catch (err) {
        await this.owclient.triggers.delete(copyOptions)
        throw err
      }
    }
    return ret
  }

  /**
   * Deletes a trigger and associated feeds
   *
   * @param {object} options options with the `name` of the trigger
   * @returns {Promise<object>} the result of the delete operation
   * @memberof Triggers
   */
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
