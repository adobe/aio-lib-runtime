<!--
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
-->

[![Version](https://img.shields.io/npm/v/@adobe/aio-lib-runtime.svg)](https://npmjs.org/package/@adobe/aio-lib-runtime)
[![Downloads/week](https://img.shields.io/npm/dw/@adobe/aio-lib-runtime.svg)](https://npmjs.org/package/@adobe/aio-lib-runtime)
![Node.js CI](https://github.com/adobe/aio-lib-runtime/workflows/Node.js%20CI/badge.svg)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/adobe/aio-lib-runtime/master.svg?style=flat-square)](https://codecov.io/gh/adobe/aio-lib-runtime/)

# Adobe I/O Runtime Lib

### Installing

```bash
$ npm install @adobe/aio-lib-runtime
```

### Usage
1) Initialize the SDK

```javascript
const sdk = require('@adobe/aio-lib-runtime')

async function sdkTest() {
  //initialize sdk
  const client = await sdk.init('<tenant>', 'x-api-key', '<valid auth token>')
}
```

2) Call methods using the initialized SDK

```javascript
const sdk = require('@adobe/aio-lib-runtime')

async function sdkTest() {
  // initialize sdk
  const client = await sdk.init('<tenant>', 'x-api-key', '<valid auth token>')

  // call methods
  try {
    // get... something
    const result = await client.getSomething({})
    console.log(result)

  } catch (e) {
    console.error(e)
  }
}
```

## Classes

<dl>
<dt><a href="#RuntimeAPI">RuntimeAPI</a></dt>
<dd><p>This class provides methods to call your RuntimeAPI APIs.
Before calling any method initialize the instance by calling the <code>init</code> method on it
with valid options argument</p>
</dd>
<dt><a href="#Triggers">Triggers</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#deployActions">deployActions([config], [deployConfig], eventEmitter, logFunc)</a> ⇒ <code>Promise.&lt;object&gt;</code></dt>
<dd><p>runs the command</p>
</dd>
<dt><a href="#deployWsk">deployWsk(scriptConfig, manifestContent, logFunc, filterEntities)</a></dt>
<dd></dd>
<dt><a href="#init">init(options)</a> ⇒ <code><a href="#OpenwhiskClient">Promise.&lt;OpenwhiskClient&gt;</a></code></dt>
<dd><p>Returns a Promise that resolves with a new RuntimeAPI object.</p>
</dd>
<dt><a href="#printActionLogs">printActionLogs(config, logger, limit, filterActions, strip, tail, fetchLogsInterval, startTime)</a></dt>
<dd><p>Prints action logs.</p>
</dd>
<dt><a href="#undeployActions">undeployActions(config, logFunc)</a></dt>
<dd></dd>
<dt><a href="#undeployWsk">undeployWsk(packageName, manifestContent, owOptions, logger)</a></dt>
<dd></dd>
<dt><a href="#getIncludesForAction">getIncludesForAction(action)</a> ⇒ <code>Array(IncludeEntry)</code></dt>
<dd><p>Gets the list of files matching the patterns defined by action.include</p>
</dd>
<dt><a href="#printLogs">printLogs(activation, strip, logger)</a></dt>
<dd><p>Prints activation logs messages.</p>
</dd>
<dt><a href="#printFilteredActionLogs">printFilteredActionLogs(runtime, logger, limit, filterActions, strip, startTime)</a></dt>
<dd><p>Filters and prints action logs.</p>
</dd>
<dt><a href="#getActionEntryFile">getActionEntryFile(pkgJson)</a> ⇒ <code>string</code></dt>
<dd><p>returns path to main function as defined in package.json OR default of index.js
note: file MUST exist, caller&#39;s responsibility, this method will throw if it does not exist</p>
</dd>
<dt><a href="#zip">zip(filePath, out, pathInZip)</a> ⇒ <code>Promise</code></dt>
<dd><p>Zip a file/folder using archiver</p>
</dd>
<dt><a href="#createKeyValueObjectFromArray">createKeyValueObjectFromArray(inputsArray)</a> ⇒ <code>object</code></dt>
<dd><p>returns key value pairs in an object from the key value array supplied. Used to create parameters object.</p>
</dd>
<dt><a href="#createKeyValueArrayFromObject">createKeyValueArrayFromObject(object)</a> ⇒ <code>Array</code></dt>
<dd><p>returns key value array from the object supplied.</p>
</dd>
<dt><a href="#createKeyValueArrayFromFlag">createKeyValueArrayFromFlag(flag)</a> ⇒ <code>Array</code></dt>
<dd><p>returns key value array from the parameters supplied. Used to create --param and --annotation key value pairs</p>
</dd>
<dt><a href="#createKeyValueArrayFromFile">createKeyValueArrayFromFile(file)</a> ⇒ <code>Array</code></dt>
<dd><p>returns key value array from the json file supplied. Used to create --param-file and annotation-file key value pairs</p>
</dd>
<dt><a href="#createKeyValueObjectFromFlag">createKeyValueObjectFromFlag(flag)</a> ⇒ <code>object</code></dt>
<dd><p>returns key value pairs in an object from the parameters supplied. Used to create --param and --annotation key value pairs</p>
</dd>
<dt><a href="#parsePackageName">parsePackageName(name)</a> ⇒ <code>object</code></dt>
<dd><p>parses a package name string and returns the namespace and entity name for a package</p>
</dd>
<dt><a href="#getKeyValueArrayFromMergedParameters">getKeyValueArrayFromMergedParameters(params, paramFilePath)</a> ⇒ <code>Array</code></dt>
<dd><p>returns key value array from the params and/or param-file supplied with more precendence to params.</p>
</dd>
<dt><a href="#getKeyValueObjectFromMergedParameters">getKeyValueObjectFromMergedParameters(params, paramFilePath)</a> ⇒ <code>object</code></dt>
<dd><p>returns key value object from the params and/or param-file supplied with more precendence to params.</p>
</dd>
<dt><a href="#createKeyValueObjectFromFile">createKeyValueObjectFromFile(file)</a> ⇒ <code>object</code></dt>
<dd><p>returns key value pairs from the parameters supplied. Used to create --param-file and --annotation-file key value pairs</p>
</dd>
<dt><a href="#createComponentsFromSequence">createComponentsFromSequence(sequenceAction)</a> ⇒ <code>object</code></dt>
<dd><p>Creates an object representation of a sequence.</p>
</dd>
<dt><del><a href="#createComponentsFromSequence">createComponentsFromSequence(sequenceAction)</a> ⇒ <code>object</code></del></dt>
<dd></dd>
<dt><a href="#returnUnion">returnUnion(firstObject, secondObject)</a> ⇒ <code>object</code></dt>
<dd><p>Creates a union of two objects</p>
</dd>
<dt><a href="#parsePathPattern">parsePathPattern(path)</a> ⇒ <code>Array</code></dt>
<dd><p>Parse a path pattern</p>
</dd>
<dt><a href="#processInputs">processInputs(input, params)</a> ⇒ <code>object</code></dt>
<dd><p>Process inputs</p>
</dd>
<dt><a href="#createKeyValueInput">createKeyValueInput(input)</a> ⇒ <code>object</code></dt>
<dd><p>Create a key-value object from the input</p>
</dd>
<dt><a href="#getDeploymentPath">getDeploymentPath()</a> ⇒ <code>string</code></dt>
<dd><p>Get the deployment yaml file path</p>
</dd>
<dt><a href="#getManifestPath">getManifestPath()</a> ⇒ <code>string</code></dt>
<dd><p>Get the manifest yaml file path</p>
</dd>
<dt><a href="#returnDeploymentTriggerInputs">returnDeploymentTriggerInputs(deploymentPackages)</a> ⇒ <code>object</code></dt>
<dd><p>Get the deployment trigger inputs.</p>
</dd>
<dt><a href="#returnAnnotations">returnAnnotations(action)</a> ⇒ <code>object</code></dt>
<dd><p>Get the annotations for an action</p>
</dd>
<dt><a href="#createApiRoutes">createApiRoutes(pkg, pkgName, apiName, allowedActions, allowedSequences, pathOnly)</a> ⇒ <code><a href="#OpenWhiskEntitiesRoute">Array.&lt;OpenWhiskEntitiesRoute&gt;</a></code></dt>
<dd><p>Creates an array of route definitions from the given manifest-based package.
See <a href="https://github.com/apache/openwhisk-wskdeploy/blob/master/parsers/manifest_parser.go#L1187">https://github.com/apache/openwhisk-wskdeploy/blob/master/parsers/manifest_parser.go#L1187</a></p>
</dd>
<dt><a href="#createSequenceObject">createSequenceObject(fullName, manifestSequence, packageName)</a> ⇒ <code><a href="#OpenWhiskEntitiesAction">OpenWhiskEntitiesAction</a></code></dt>
<dd><p>Create a sequence object that is compatible with the OpenWhisk API from a parsed manifest object</p>
</dd>
<dt><a href="#checkWebFlags">checkWebFlags(flag)</a> ⇒ <code>object</code></dt>
<dd><p>Check the web flags</p>
</dd>
<dt><a href="#createActionObject">createActionObject(fullName, manifestAction)</a> ⇒ <code><a href="#OpenWhiskEntitiesAction">OpenWhiskEntitiesAction</a></code></dt>
<dd><p>Create an action object compatible with the OpenWhisk API from an action object parsed from the manifest.</p>
</dd>
<dt><a href="#processPackage">processPackage(packages, deploymentPackages, deploymentTriggers, params, [namesOnly], [owOptions])</a> ⇒ <code><a href="#OpenWhiskEntities">OpenWhiskEntities</a></code></dt>
<dd><p>Process the manifest and deployment content and returns deployment entities.</p>
</dd>
<dt><a href="#setPaths">setPaths(flags)</a> ⇒ <code><a href="#DeploymentFileComponents">DeploymentFileComponents</a></code></dt>
<dd><p>Get the deployment file components.</p>
</dd>
<dt><a href="#setupAdobeAuth">setupAdobeAuth(actions, owOptions, imsOrgId)</a></dt>
<dd><p>Handle Adobe auth action dependency</p>
<p>This is a temporary solution and needs to be removed when headless apps will be able to
validate against app-registry</p>
<p>This function stores the IMS organization id in the Adobe I/O cloud state library which
is required by the headless validator.</p>
<p>The IMS org id must be stored beforehand in <code>@adobe/aio-lib-core-config</code> under the
<code>&#39;project.org.ims_org_id&#39;</code> key. TODO: pass in imsOrgId</p>
</dd>
<dt><a href="#deployPackage">deployPackage(entities, ow, logger, imsOrgId)</a></dt>
<dd><p>Deploy all processed entities: can deploy packages, actions, triggers, rules and apis.</p>
</dd>
<dt><a href="#undeployPackage">undeployPackage(entities, ow, logger)</a></dt>
<dd><p>Undeploy all processed entities: can undeploy packages, actions, triggers, rules and apis.
Entity definitions do not need to be complete, only the names are needed for un-deployment.</p>
</dd>
<dt><a href="#syncProject">syncProject(projectName, manifestPath, manifestContent, entities, ow, logger, imsOrgId, deleteEntities)</a></dt>
<dd><p>Sync a project. This is a higher level function that can be used to sync a local
manifest with deployed entities.</p>
<p><code>syncProject</code> doesn&#39;t only deploy entities it might also undeploy entities that are not
defined in the manifest. This behavior can be disabled via the <code>deleteEntities</code> boolean
parameter.</p>
</dd>
<dt><a href="#getProjectEntities">getProjectEntities(project, isProjectHash, ow)</a> ⇒ <code><a href="#OpenWhiskEntities">Promise.&lt;OpenWhiskEntities&gt;</a></code></dt>
<dd><p>Get deployed entities for a managed project. This methods retrieves all the deployed
entities for a given project name or project hash. This only works if the project was
deployed using the <code>whisk-managed</code> annotation. This annotation can be set
pre-deployement using <code>[addManagedProjectAnnotations](#addmanagedprojectannotations)</code>.</p>
<p>Note that returned apis will always be empty as they don&#39;t support annotations and
hence are not managed as part of a project.</p>
</dd>
<dt><a href="#addManagedProjectAnnotations">addManagedProjectAnnotations(entities, manifestPath, projectName, projectHash)</a></dt>
<dd><p>Add the <code>whisk-managed</code> annotation to processed entities. This is needed for syncing
managed projects.</p>
</dd>
<dt><a href="#getProjectHash">getProjectHash(manifestContent, manifestPath)</a> ⇒ <code>string</code></dt>
<dd><p>Compute the project hash based on the manifest content and manifest path. This is used
for syncing managed projects.</p>
</dd>
<dt><a href="#findProjectHashOnServer">findProjectHashOnServer(ow, projectName)</a> ⇒ <code>Promise.&lt;string&gt;</code></dt>
<dd><p>Retrieve the project hash from a deployed managed project.</p>
</dd>
<dt><del><a href="#findProjectHashOnServer">findProjectHashOnServer(ow, projectName)</a> ⇒ <code>Promise.&lt;string&gt;</code></del></dt>
<dd><p>Retrieve the project hash from a deployed managed project.</p>
</dd>
<dt><a href="#_relApp">_relApp(root, p)</a></dt>
<dd></dd>
<dt><a href="#_absApp">_absApp(root, p)</a></dt>
<dd></dd>
<dt><a href="#checkOpenWhiskCredentials">checkOpenWhiskCredentials(config)</a></dt>
<dd></dd>
<dt><a href="#getActionUrls">getActionUrls(appConfig, isRemoteDev, isLocalDev)</a></dt>
<dd></dd>
<dt><a href="#urlJoin">urlJoin(...args)</a> ⇒ <code>string</code></dt>
<dd><p>Joins url path parts</p>
</dd>
<dt><a href="#removeProtocolFromURL">removeProtocolFromURL(url)</a></dt>
<dd></dd>
<dt><a href="#validateActionRuntime">validateActionRuntime(action)</a></dt>
<dd><p>Checks the validity of nodejs version in action definition and throws an error if invalid.</p>
</dd>
<dt><a href="#getActionZipFileName">getActionZipFileName(pkgName, actionName, defaultPkg)</a></dt>
<dd><p>Returns the action&#39;s build file name without the .zip extension</p>
</dd>
<dt><a href="#activationLogBanner">activationLogBanner(a, activation, activationLogs)</a></dt>
<dd><p>Creates an info banner for an activation.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#OpenwhiskOptions">OpenwhiskOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#OpenwhiskClient">OpenwhiskClient</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#ManifestPackages">ManifestPackages</a> : <code><a href="#ManifestPackage">Array.&lt;ManifestPackage&gt;</a></code></dt>
<dd><p>The entry point to the information read from the manifest, this can be extracted using
<a href="#setpaths">setPaths</a>.</p>
</dd>
<dt><a href="#ManifestPackage">ManifestPackage</a> : <code>object</code></dt>
<dd><p>The manifest package definition</p>
</dd>
<dt><a href="#ManifestAction">ManifestAction</a> : <code>object</code></dt>
<dd><p>The manifest action definition</p>
</dd>
<dt><a href="#ManifestAction">ManifestAction</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#IncludeEntry">IncludeEntry</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#ManifestSequence">ManifestSequence</a> : <code>object</code></dt>
<dd><p>The manifest sequence definition
TODO: see <a href="https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_sequences.md">https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_sequences.md</a></p>
</dd>
<dt><a href="#ManifestTrigger">ManifestTrigger</a> : <code>object</code></dt>
<dd><p>The manifest trigger definition
TODO: see <a href="https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_triggers.md">https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_triggers.md</a></p>
</dd>
<dt><a href="#ManifestRule">ManifestRule</a> : <code>object</code></dt>
<dd><p>The manifest rule definition
TODO: see <a href="https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_rules.md">https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_rules.md</a></p>
</dd>
<dt><a href="#ManifestApi">ManifestApi</a> : <code>object</code></dt>
<dd><p>The manifest api definition
TODO: see <a href="https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_apis.md">https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_apis.md</a></p>
</dd>
<dt><a href="#ManifestDependency">ManifestDependency</a> : <code>object</code></dt>
<dd><p>The manifest dependency definition
TODO</p>
</dd>
<dt><a href="#ManifestActionLimits">ManifestActionLimits</a> : <code>object</code></dt>
<dd><p>The manifest action limits definition
TODO: see <a href="https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#valid-limit-keys.md">https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#valid-limit-keys.md</a></p>
</dd>
<dt><a href="#ManifestActionAnnotations">ManifestActionAnnotations</a> : <code>object</code></dt>
<dd><p>The manifest action annotations definition
TODO: see <a href="https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#action-annotations">https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#action-annotations</a></p>
</dd>
<dt><a href="#OpenWhiskEntities">OpenWhiskEntities</a> : <code>object</code></dt>
<dd><p>The OpenWhisk entities definitions, which are compatible with the <code>openwhisk</code> node
client module. Can be obtained using (processpackage)[#processpackage] (with <code>onlyNames=true</code> for un-deployment)</p>
</dd>
<dt><a href="#OpenWhiskEntitiesRoute">OpenWhiskEntitiesRoute</a> : <code>object</code></dt>
<dd><p>The api entity definition</p>
</dd>
<dt><a href="#OpenWhiskEntitiesAction">OpenWhiskEntitiesAction</a> : <code>object</code></dt>
<dd><p>The action entity definition
TODO</p>
</dd>
<dt><a href="#OpenWhiskEntitiesRule">OpenWhiskEntitiesRule</a> : <code>object</code></dt>
<dd><p>The rule entity definition
TODO</p>
</dd>
<dt><a href="#OpenWhiskEntitiesTrigger">OpenWhiskEntitiesTrigger</a> : <code>object</code></dt>
<dd><p>The trigger entity definition
TODO</p>
</dd>
<dt><a href="#OpenWhiskEntitiesPackage">OpenWhiskEntitiesPackage</a> : <code>object</code></dt>
<dd><p>The package entity definition
TODO</p>
</dd>
<dt><a href="#DeploymentPackages">DeploymentPackages</a> : <code>Array.&lt;object&gt;</code></dt>
<dd><p>The entry point to the information read from the deployment file, this can be extracted using
<a href="#setpaths">setPaths</a>.
TODO</p>
</dd>
<dt><a href="#DeploymentTrigger">DeploymentTrigger</a> : <code>object</code></dt>
<dd><p>The deployment trigger definition
TODO</p>
</dd>
<dt><a href="#DeploymentFileComponents">DeploymentFileComponents</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="RuntimeAPI"></a>

## RuntimeAPI
This class provides methods to call your RuntimeAPI APIs.
Before calling any method initialize the instance by calling the `init` method on it
with valid options argument

**Kind**: global class  
<a name="RuntimeAPI+init"></a>

### runtimeAPI.init(options) ⇒ [<code>Promise.&lt;OpenwhiskClient&gt;</code>](#OpenwhiskClient)
Initializes a RuntimeAPI object and returns it.

**Kind**: instance method of [<code>RuntimeAPI</code>](#RuntimeAPI)  
**Returns**: [<code>Promise.&lt;OpenwhiskClient&gt;</code>](#OpenwhiskClient) - a RuntimeAPI object  

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>OpenwhiskOptions</code>](#OpenwhiskOptions) | options for initialization |

<a name="Triggers"></a>

## Triggers
**Kind**: global class  

* [Triggers](#Triggers)
    * [new Triggers()](#new_Triggers_new)
    * [.create(options)](#Triggers+create) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.delete(options)](#Triggers+delete) ⇒ <code>Promise.&lt;object&gt;</code>

<a name="new_Triggers_new"></a>

### new Triggers()
A class to manage triggers

<a name="Triggers+create"></a>

### triggers.create(options) ⇒ <code>Promise.&lt;object&gt;</code>
Creates a trigger and associated feeds

**Kind**: instance method of [<code>Triggers</code>](#Triggers)  
**Returns**: <code>Promise.&lt;object&gt;</code> - the result of the create operation  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | input options to create the trigger from manifest |

<a name="Triggers+delete"></a>

### triggers.delete(options) ⇒ <code>Promise.&lt;object&gt;</code>
Deletes a trigger and associated feeds

**Kind**: instance method of [<code>Triggers</code>](#Triggers)  
**Returns**: <code>Promise.&lt;object&gt;</code> - the result of the delete operation  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | options with the `name` of the trigger |

<a name="deployActions"></a>

## deployActions([config], [deployConfig], eventEmitter, logFunc) ⇒ <code>Promise.&lt;object&gt;</code>
runs the command

**Kind**: global function  
**Returns**: <code>Promise.&lt;object&gt;</code> - deployedEntities  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [config] | <code>object</code> | <code>{}</code> |  |
| [deployConfig] | <code>object</code> | <code>{}</code> |  |
| [deployConfig.filterEntities] | <code>object</code> |  | add filters to deploy only specified OpenWhisk entities |
| [deployConfig.filterEntities.actions] | <code>Array</code> |  | filter list of actions to deploy, e.g. ['name1', ..] |
| [deployConfig.filterEntities.sequences] | <code>Array</code> |  | filter list of sequences to deploy, e.g. ['name1', ..] |
| [deployConfig.filterEntities.triggers] | <code>Array</code> |  | filter list of triggers to deploy, e.g. ['name1', ..] |
| [deployConfig.filterEntities.rules] | <code>Array</code> |  | filter list of rules to deploy, e.g. ['name1', ..] |
| [deployConfig.filterEntities.apis] | <code>Array</code> |  | filter list of apis to deploy, e.g. ['name1', ..] |
| eventEmitter |  |  |  |
| logFunc |  |  |  |
| [deployConfig.filterEntities.dependencies] | <code>Array</code> |  | filter list of package dependencies to deploy, e.g. ['name1', ..] |

<a name="deployWsk"></a>

## deployWsk(scriptConfig, manifestContent, logFunc, filterEntities)
**Kind**: global function  

| Param |
| --- |
| scriptConfig | 
| manifestContent | 
| logFunc | 
| filterEntities | 

<a name="deployWsk.._filterOutPackageEntity"></a>

### deployWsk~\_filterOutPackageEntity(pkgEntity, filter)
**Kind**: inner method of [<code>deployWsk</code>](#deployWsk)  

| Param |
| --- |
| pkgEntity | 
| filter | 

<a name="init"></a>

## init(options) ⇒ [<code>Promise.&lt;OpenwhiskClient&gt;</code>](#OpenwhiskClient)
Returns a Promise that resolves with a new RuntimeAPI object.

**Kind**: global function  
**Returns**: [<code>Promise.&lt;OpenwhiskClient&gt;</code>](#OpenwhiskClient) - a Promise with a RuntimeAPI object  

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>OpenwhiskOptions</code>](#OpenwhiskOptions) | options for initialization |

<a name="printActionLogs"></a>

## printActionLogs(config, logger, limit, filterActions, strip, tail, fetchLogsInterval, startTime)
Prints action logs.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| config | <code>object</code> |  | openwhisk config |
| logger | <code>object</code> |  | an instance of a logger to emit messages to |
| limit | <code>number</code> |  | maximum number of activations to fetch logs from |
| filterActions | <code>Array</code> |  | array of actions to fetch logs from    examples:-    ['pkg1/'] = logs of all deployed actions under package pkg1    ['pkg1/action'] = logs of action 'action' under package 'pkg1'    [] = logs of all actions in the namespace |
| strip | <code>boolean</code> |  | if true, strips the timestamp which prefixes every log line |
| tail | <code>boolean</code> | <code>false</code> | if true, logs are fetched continuously |
| fetchLogsInterval | <code>number</code> | <code>10000</code> | number of seconds to wait before fetching logs again when tail is set to true |
| startTime | <code>number</code> |  | time in milliseconds. Only logs after this time will be fetched |

<a name="undeployActions"></a>

## undeployActions(config, logFunc)
**Kind**: global function  

| Param |
| --- |
| config | 
| logFunc | 

<a name="undeployWsk"></a>

## undeployWsk(packageName, manifestContent, owOptions, logger)
**Kind**: global function  

| Param |
| --- |
| packageName | 
| manifestContent | 
| owOptions | 
| logger | 

<a name="getIncludesForAction"></a>

## getIncludesForAction(action) ⇒ <code>Array(IncludeEntry)</code>
Gets the list of files matching the patterns defined by action.include

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| action | [<code>ManifestAction</code>](#ManifestAction) | action object from manifest which defines includes |

<a name="printLogs"></a>

## printLogs(activation, strip, logger)
Prints activation logs messages.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| activation | <code>object</code> | the activation |
| strip | <code>boolean</code> | if true, strips the timestamp which prefixes every log line |
| logger | <code>object</code> | an instance of a logger to emit messages to |

<a name="printFilteredActionLogs"></a>

## printFilteredActionLogs(runtime, logger, limit, filterActions, strip, startTime)
Filters and prints action logs.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| runtime | <code>object</code> |  | runtime (openwhisk) object |
| logger | <code>object</code> |  | an instance of a logger to emit messages to (may optionally provide logFunc and bannerFunc to customize logging) |
| limit | <code>number</code> |  | maximum number of activations to fetch logs from |
| filterActions | <code>Array</code> |  | array of actions to fetch logs from    ['pkg1/'] = logs of all deployed actions under package pkg1    ['pkg1/action'] = logs of action 'action' under package 'pkg1'    [] = logs of all actions in the namespace |
| strip | <code>boolean</code> | <code>false</code> | if true, strips the timestamp which prefixes every log line |
| startTime | <code>number</code> | <code>0</code> | time in milliseconds. Only logs after this time will be fetched |


* [printFilteredActionLogs(runtime, logger, limit, filterActions, strip, startTime)](#printFilteredActionLogs)
    * [~isSequenceActivation(activation)](#printFilteredActionLogs..isSequenceActivation) ⇒ <code>boolean</code>
    * [~printActivationLogs(activation, runtime)](#printFilteredActionLogs..printActivationLogs)
    * [~printSequenceLogs(activation, runtime)](#printFilteredActionLogs..printSequenceLogs)
    * [~printLogs(activation, runtime)](#printFilteredActionLogs..printLogs)

<a name="printFilteredActionLogs..isSequenceActivation"></a>

### printFilteredActionLogs~isSequenceActivation(activation) ⇒ <code>boolean</code>
Check if an activation entry is for a sequence.

**Kind**: inner method of [<code>printFilteredActionLogs</code>](#printFilteredActionLogs)  
**Returns**: <code>boolean</code> - isSequenceActivation  

| Param | Type | Description |
| --- | --- | --- |
| activation | <code>\*</code> | activation log entry |

<a name="printFilteredActionLogs..printActivationLogs"></a>

### printFilteredActionLogs~printActivationLogs(activation, runtime)
Print activation logs

**Kind**: inner method of [<code>printFilteredActionLogs</code>](#printFilteredActionLogs)  

| Param | Type |
| --- | --- |
| activation | <code>\*</code> | 
| runtime | <code>\*</code> | 

<a name="printFilteredActionLogs..printSequenceLogs"></a>

### printFilteredActionLogs~printSequenceLogs(activation, runtime)
Print sequence logs

**Kind**: inner method of [<code>printFilteredActionLogs</code>](#printFilteredActionLogs)  

| Param | Type |
| --- | --- |
| activation | <code>\*</code> | 
| runtime | <code>\*</code> | 

<a name="printFilteredActionLogs..printLogs"></a>

### printFilteredActionLogs~printLogs(activation, runtime)
Print logs

**Kind**: inner method of [<code>printFilteredActionLogs</code>](#printFilteredActionLogs)  

| Param | Type |
| --- | --- |
| activation | <code>\*</code> | 
| runtime | <code>\*</code> | 

<a name="getActionEntryFile"></a>

## getActionEntryFile(pkgJson) ⇒ <code>string</code>
returns path to main function as defined in package.json OR default of index.js
note: file MUST exist, caller's responsibility, this method will throw if it does not exist

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| pkgJson | <code>\*</code> | : path to a package.json file |

<a name="zip"></a>

## zip(filePath, out, pathInZip) ⇒ <code>Promise</code>
Zip a file/folder using archiver

**Kind**: global function  

| Param | Type | Default |
| --- | --- | --- |
| filePath | <code>string</code> |  | 
| out | <code>string</code> |  | 
| pathInZip | <code>boolean</code> | <code>false</code> | 

<a name="createKeyValueObjectFromArray"></a>

## createKeyValueObjectFromArray(inputsArray) ⇒ <code>object</code>
returns key value pairs in an object from the key value array supplied. Used to create parameters object.

**Kind**: global function  
**Returns**: <code>object</code> - An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}  

| Param | Type | Description |
| --- | --- | --- |
| inputsArray | <code>Array</code> | Array in the form of [{'key':'key1', 'value': 'value1'}] |

<a name="createKeyValueArrayFromObject"></a>

## createKeyValueArrayFromObject(object) ⇒ <code>Array</code>
returns key value array from the object supplied.

**Kind**: global function  
**Returns**: <code>Array</code> - An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | JSON object |

<a name="createKeyValueArrayFromFlag"></a>

## createKeyValueArrayFromFlag(flag) ⇒ <code>Array</code>
returns key value array from the parameters supplied. Used to create --param and --annotation key value pairs

**Kind**: global function  
**Returns**: <code>Array</code> - An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]  

| Param | Type | Description |
| --- | --- | --- |
| flag | <code>Array</code> | value from flags.param or flags.annotation |

<a name="createKeyValueArrayFromFile"></a>

## createKeyValueArrayFromFile(file) ⇒ <code>Array</code>
returns key value array from the json file supplied. Used to create --param-file and annotation-file key value pairs

**Kind**: global function  
**Returns**: <code>Array</code> - An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | from flags['param-file'] or flags['annotation-file] |

<a name="createKeyValueObjectFromFlag"></a>

## createKeyValueObjectFromFlag(flag) ⇒ <code>object</code>
returns key value pairs in an object from the parameters supplied. Used to create --param and --annotation key value pairs

**Kind**: global function  
**Returns**: <code>object</code> - An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}  

| Param | Type | Description |
| --- | --- | --- |
| flag | <code>Array</code> | from flags.param or flags.annotation |

<a name="parsePackageName"></a>

## parsePackageName(name) ⇒ <code>object</code>
parses a package name string and returns the namespace and entity name for a package

**Kind**: global function  
**Returns**: <code>object</code> - An object { namespace: string, name: string }  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | package name |

<a name="getKeyValueArrayFromMergedParameters"></a>

## getKeyValueArrayFromMergedParameters(params, paramFilePath) ⇒ <code>Array</code>
returns key value array from the params and/or param-file supplied with more precendence to params.

**Kind**: global function  
**Returns**: <code>Array</code> - An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Array</code> | from flags.param or flags.annotation |
| paramFilePath | <code>string</code> | from flags['param-file'] or flags['annotation-file'] |

<a name="getKeyValueObjectFromMergedParameters"></a>

## getKeyValueObjectFromMergedParameters(params, paramFilePath) ⇒ <code>object</code>
returns key value object from the params and/or param-file supplied with more precendence to params.

**Kind**: global function  
**Returns**: <code>object</code> - An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Array</code> | from flags.param or flags.annotation |
| paramFilePath | <code>string</code> | from flags['param-file'] or flags['annotation-file'] |

<a name="createKeyValueObjectFromFile"></a>

## createKeyValueObjectFromFile(file) ⇒ <code>object</code>
returns key value pairs from the parameters supplied. Used to create --param-file and --annotation-file key value pairs

**Kind**: global function  
**Returns**: <code>object</code> - An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | from flags['param-file'] or flags['annotation-file'] |

<a name="createComponentsFromSequence"></a>

## createComponentsFromSequence(sequenceAction) ⇒ <code>object</code>
Creates an object representation of a sequence.

**Kind**: global function  
**Returns**: <code>object</code> - the object representation of the sequence  

| Param | Type | Description |
| --- | --- | --- |
| sequenceAction | <code>Array</code> | the sequence action array |

<a name="createComponentsFromSequence"></a>

## ~~createComponentsFromSequence(sequenceAction) ⇒ <code>object</code>~~
***Deprecated***

**Kind**: global function  
**Returns**: <code>object</code> - the object representation of the sequence  

| Param | Type | Description |
| --- | --- | --- |
| sequenceAction | <code>Array</code> | the sequence action array |

<a name="returnUnion"></a>

## returnUnion(firstObject, secondObject) ⇒ <code>object</code>
Creates a union of two objects

**Kind**: global function  
**Returns**: <code>object</code> - the union of both objects  

| Param | Type | Description |
| --- | --- | --- |
| firstObject | <code>object</code> | the object to merge into |
| secondObject | <code>object</code> | the object to merge from |

<a name="parsePathPattern"></a>

## parsePathPattern(path) ⇒ <code>Array</code>
Parse a path pattern

**Kind**: global function  
**Returns**: <code>Array</code> - array of matches  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | the path to parse |

<a name="processInputs"></a>

## processInputs(input, params) ⇒ <code>object</code>
Process inputs

**Kind**: global function  
**Returns**: <code>object</code> - the processed inputs  

| Param | Type | Description |
| --- | --- | --- |
| input | <code>object</code> | the input object to process |
| params | <code>object</code> | the parameters for the input to process |

<a name="createKeyValueInput"></a>

## createKeyValueInput(input) ⇒ <code>object</code>
Create a key-value object from the input

**Kind**: global function  
**Returns**: <code>object</code> - the processed input as a key-value object  

| Param | Type | Description |
| --- | --- | --- |
| input | <code>object</code> | the input to process |

<a name="getDeploymentPath"></a>

## getDeploymentPath() ⇒ <code>string</code>
Get the deployment yaml file path

**Kind**: global function  
**Returns**: <code>string</code> - the deployment yaml path  
<a name="getManifestPath"></a>

## getManifestPath() ⇒ <code>string</code>
Get the manifest yaml file path

**Kind**: global function  
**Returns**: <code>string</code> - the manifest yaml path  
<a name="returnDeploymentTriggerInputs"></a>

## returnDeploymentTriggerInputs(deploymentPackages) ⇒ <code>object</code>
Get the deployment trigger inputs.

**Kind**: global function  
**Returns**: <code>object</code> - the deployment trigger inputs  

| Param | Type | Description |
| --- | --- | --- |
| deploymentPackages | [<code>DeploymentPackages</code>](#DeploymentPackages) | the deployment packages |

<a name="returnAnnotations"></a>

## returnAnnotations(action) ⇒ <code>object</code>
Get the annotations for an action

**Kind**: global function  
**Returns**: <code>object</code> - the action annotation entities  

| Param | Type | Description |
| --- | --- | --- |
| action | [<code>ManifestAction</code>](#ManifestAction) | the action manifest object |

<a name="createApiRoutes"></a>

## createApiRoutes(pkg, pkgName, apiName, allowedActions, allowedSequences, pathOnly) ⇒ [<code>Array.&lt;OpenWhiskEntitiesRoute&gt;</code>](#OpenWhiskEntitiesRoute)
Creates an array of route definitions from the given manifest-based package.
See https://github.com/apache/openwhisk-wskdeploy/blob/master/parsers/manifest_parser.go#L1187

**Kind**: global function  
**Returns**: [<code>Array.&lt;OpenWhiskEntitiesRoute&gt;</code>](#OpenWhiskEntitiesRoute) - the array of route entities  

| Param | Type | Description |
| --- | --- | --- |
| pkg | [<code>ManifestPackage</code>](#ManifestPackage) | The package definition from the manifest. |
| pkgName | <code>string</code> | The name of the package. |
| apiName | <code>string</code> | The name of the HTTP API definition from the manifest. |
| allowedActions | <code>Array</code> | List of action names allowed to be used in routes. |
| allowedSequences | <code>Array</code> | List of sequence names allowed to be used in routes. |
| pathOnly | <code>boolean</code> | Skip action, method and response type in route definitions. |

<a name="createSequenceObject"></a>

## createSequenceObject(fullName, manifestSequence, packageName) ⇒ [<code>OpenWhiskEntitiesAction</code>](#OpenWhiskEntitiesAction)
Create a sequence object that is compatible with the OpenWhisk API from a parsed manifest object

**Kind**: global function  
**Returns**: [<code>OpenWhiskEntitiesAction</code>](#OpenWhiskEntitiesAction) - a sequence object describing the action entity  

| Param | Type | Description |
| --- | --- | --- |
| fullName | <code>string</code> | the full sequence name prefixed with the package, e.g. `pkg/sequence` |
| manifestSequence | [<code>ManifestSequence</code>](#ManifestSequence) | a sequence object as defined in a valid manifest file |
| packageName | <code>string</code> | the package name of the sequence, which will be set to for actions in the sequence |

<a name="checkWebFlags"></a>

## checkWebFlags(flag) ⇒ <code>object</code>
Check the web flags

**Kind**: global function  
**Returns**: <code>object</code> - object with the appropriate web flags for an action  

| Param | Type | Description |
| --- | --- | --- |
| flag | <code>string</code> \| <code>boolean</code> | the flag to check |

<a name="createActionObject"></a>

## createActionObject(fullName, manifestAction) ⇒ [<code>OpenWhiskEntitiesAction</code>](#OpenWhiskEntitiesAction)
Create an action object compatible with the OpenWhisk API from an action object parsed from the manifest.

**Kind**: global function  
**Returns**: [<code>OpenWhiskEntitiesAction</code>](#OpenWhiskEntitiesAction) - the action entity object  

| Param | Type | Description |
| --- | --- | --- |
| fullName | <code>string</code> | the full action name prefixed with the package, e.g. `pkg/action` |
| manifestAction | [<code>ManifestAction</code>](#ManifestAction) | the action object as parsed from the manifest |

<a name="processPackage"></a>

## processPackage(packages, deploymentPackages, deploymentTriggers, params, [namesOnly], [owOptions]) ⇒ [<code>OpenWhiskEntities</code>](#OpenWhiskEntities)
Process the manifest and deployment content and returns deployment entities.

**Kind**: global function  
**Returns**: [<code>OpenWhiskEntities</code>](#OpenWhiskEntities) - deployment entities  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| packages | [<code>ManifestPackages</code>](#ManifestPackages) |  | the manifest packages |
| deploymentPackages | [<code>DeploymentPackages</code>](#DeploymentPackages) |  | the deployment packages |
| deploymentTriggers | [<code>DeploymentTrigger</code>](#DeploymentTrigger) |  | the deployment triggers |
| params | <code>object</code> |  | the package params |
| [namesOnly] | <code>boolean</code> | <code>false</code> | if false, set the namespaces as well |
| [owOptions] | <code>object</code> | <code>{}</code> | additional OpenWhisk options |

<a name="setPaths"></a>

## setPaths(flags) ⇒ [<code>DeploymentFileComponents</code>](#DeploymentFileComponents)
Get the deployment file components.

**Kind**: global function  
**Returns**: [<code>DeploymentFileComponents</code>](#DeploymentFileComponents) - fileComponents  

| Param | Type | Description |
| --- | --- | --- |
| flags | <code>object</code> | (manifest + deployment) |

<a name="setupAdobeAuth"></a>

## setupAdobeAuth(actions, owOptions, imsOrgId)
Handle Adobe auth action dependency

This is a temporary solution and needs to be removed when headless apps will be able to
validate against app-registry

This function stores the IMS organization id in the Adobe I/O cloud state library which
is required by the headless validator.

The IMS org id must be stored beforehand in `@adobe/aio-lib-core-config` under the
`'project.org.ims_org_id'` key. TODO: pass in imsOrgId

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| actions | [<code>Array.&lt;OpenWhiskEntitiesAction&gt;</code>](#OpenWhiskEntitiesAction) | the array of action deployment entities |
| owOptions | <code>object</code> | OpenWhisk options |
| imsOrgId | <code>string</code> | the IMS Org Id |

<a name="deployPackage"></a>

## deployPackage(entities, ow, logger, imsOrgId)
Deploy all processed entities: can deploy packages, actions, triggers, rules and apis.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| entities | [<code>OpenWhiskEntitiesAction</code>](#OpenWhiskEntitiesAction) | the processed entities |
| ow | <code>object</code> | the OpenWhisk client |
| logger | <code>object</code> | the logger |
| imsOrgId | <code>string</code> | the IMS Org ID |

<a name="undeployPackage"></a>

## undeployPackage(entities, ow, logger)
Undeploy all processed entities: can undeploy packages, actions, triggers, rules and apis.
Entity definitions do not need to be complete, only the names are needed for un-deployment.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| entities | <code>object</code> | the processed entities, only names are enough for undeploy |
| ow | <code>object</code> | the OpenWhisk object |
| logger | <code>object</code> | the logger |

<a name="syncProject"></a>

## syncProject(projectName, manifestPath, manifestContent, entities, ow, logger, imsOrgId, deleteEntities)
Sync a project. This is a higher level function that can be used to sync a local
manifest with deployed entities.

`syncProject` doesn't only deploy entities it might also undeploy entities that are not
defined in the manifest. This behavior can be disabled via the `deleteEntities` boolean
parameter.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| projectName | <code>string</code> |  | the project name |
| manifestPath | <code>string</code> |  | the manifest path |
| manifestContent | <code>string</code> |  | the manifest content, needed to compute hash |
| entities | [<code>OpenWhiskEntities</code>](#OpenWhiskEntities) |  | the entities, extracted via `processPackage` |
| ow | <code>object</code> |  | the OpenWhisk object |
| logger | <code>object</code> |  | the logger |
| imsOrgId | <code>string</code> |  | the IMS Org ID |
| deleteEntities | <code>boolean</code> | <code>true</code> | set to true to delete entities |

<a name="getProjectEntities"></a>

## getProjectEntities(project, isProjectHash, ow) ⇒ [<code>Promise.&lt;OpenWhiskEntities&gt;</code>](#OpenWhiskEntities)
Get deployed entities for a managed project. This methods retrieves all the deployed
entities for a given project name or project hash. This only works if the project was
deployed using the `whisk-managed` annotation. This annotation can be set
pre-deployement using `[addManagedProjectAnnotations](#addmanagedprojectannotations)`.

Note that returned apis will always be empty as they don't support annotations and
hence are not managed as part of a project.

**Kind**: global function  
**Returns**: [<code>Promise.&lt;OpenWhiskEntities&gt;</code>](#OpenWhiskEntities) - the deployed project entities  

| Param | Type | Description |
| --- | --- | --- |
| project | <code>string</code> | the project name or hash |
| isProjectHash | <code>boolean</code> | set to true if the project is a hash, and not the name |
| ow | <code>object</code> | the OpenWhisk client object |

<a name="addManagedProjectAnnotations"></a>

## addManagedProjectAnnotations(entities, manifestPath, projectName, projectHash)
Add the `whisk-managed` annotation to processed entities. This is needed for syncing
managed projects.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| entities | [<code>OpenWhiskEntities</code>](#OpenWhiskEntities) | the processed entities |
| manifestPath | <code>string</code> | the manifest path |
| projectName | <code>string</code> | the project name |
| projectHash | <code>string</code> | the project hash |

<a name="getProjectHash"></a>

## getProjectHash(manifestContent, manifestPath) ⇒ <code>string</code>
Compute the project hash based on the manifest content and manifest path. This is used
for syncing managed projects.

**Kind**: global function  
**Returns**: <code>string</code> - the project hash  

| Param | Type | Description |
| --- | --- | --- |
| manifestContent | <code>string</code> | the manifest content |
| manifestPath | <code>string</code> | the manifest path |

<a name="findProjectHashOnServer"></a>

## findProjectHashOnServer(ow, projectName) ⇒ <code>Promise.&lt;string&gt;</code>
Retrieve the project hash from a deployed managed project.

**Kind**: global function  
**Returns**: <code>Promise.&lt;string&gt;</code> - the project hash, or '' if not found  

| Param | Type | Description |
| --- | --- | --- |
| ow | <code>object</code> | the OpenWhisk client object |
| projectName | <code>string</code> | the project name |

<a name="findProjectHashOnServer"></a>

## ~~findProjectHashOnServer(ow, projectName) ⇒ <code>Promise.&lt;string&gt;</code>~~
***Deprecated***

Retrieve the project hash from a deployed managed project.

**Kind**: global function  
**Returns**: <code>Promise.&lt;string&gt;</code> - the project hash, or '' if not found  

| Param | Type | Description |
| --- | --- | --- |
| ow | <code>object</code> | the OpenWhisk client object |
| projectName | <code>string</code> | the project name |

<a name="_relApp"></a>

## \_relApp(root, p)
**Kind**: global function  

| Param |
| --- |
| root | 
| p | 

<a name="_absApp"></a>

## \_absApp(root, p)
**Kind**: global function  

| Param |
| --- |
| root | 
| p | 

<a name="checkOpenWhiskCredentials"></a>

## checkOpenWhiskCredentials(config)
**Kind**: global function  

| Param |
| --- |
| config | 

<a name="getActionUrls"></a>

## getActionUrls(appConfig, isRemoteDev, isLocalDev)
**Kind**: global function  

| Param | Default |
| --- | --- |
| appConfig |  | 
| isRemoteDev | <code>false</code> | 
| isLocalDev | <code>false</code> | 

<a name="urlJoin"></a>

## urlJoin(...args) ⇒ <code>string</code>
Joins url path parts

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>string</code> | url parts |

<a name="removeProtocolFromURL"></a>

## removeProtocolFromURL(url)
**Kind**: global function  

| Param |
| --- |
| url | 

<a name="validateActionRuntime"></a>

## validateActionRuntime(action)
Checks the validity of nodejs version in action definition and throws an error if invalid.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| action | <code>object</code> | action object |

<a name="getActionZipFileName"></a>

## getActionZipFileName(pkgName, actionName, defaultPkg)
Returns the action's build file name without the .zip extension

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| pkgName | <code>string</code> | name of the package |
| actionName | <code>string</code> | name of the action |
| defaultPkg | <code>boolean</code> | true if pkgName is the default/first package |

<a name="activationLogBanner"></a>

## activationLogBanner(a, activation, activationLogs)
Creates an info banner for an activation.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>Logger</code> | logger |
| activation | <code>Activation</code> | metadata |
| activationLogs | <code>Array.&lt;string&gt;</code> | the logs of the activation (may selectively suppress banner if there are no log lines) |

<a name="OpenwhiskOptions"></a>

## OpenwhiskOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| apihost | <code>string</code> | Hostname and optional port for openwhisk platform |
| api_key | <code>string</code> | Authorisation key |
| [api] | <code>string</code> | Full API URL |
| [apiversion] | <code>string</code> | Api version |
| [namespace] | <code>string</code> | Namespace for resource requests |
| [ignore_certs] | <code>boolean</code> | Turns off server SSL/TLS certificate verification |
| [key] | <code>string</code> | Client key to use when connecting to the apihost |

<a name="OpenwhiskClient"></a>

## OpenwhiskClient : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| actions | <code>ow.Actions</code> | actions |
| activations | <code>ow.Activations</code> | activations |
| namespaces | <code>ow.Namespaces</code> | namespaces |
| packages | <code>ow.Packages</code> | packages |
| rules | <code>ow.Rules</code> | rules |
| triggers | <code>ow.Triggers</code> | triggers |
| routes | <code>ow.Routes</code> | routes |

<a name="ManifestPackages"></a>

## ManifestPackages : [<code>Array.&lt;ManifestPackage&gt;</code>](#ManifestPackage)
The entry point to the information read from the manifest, this can be extracted using
[setPaths](#setpaths).

**Kind**: global typedef  
<a name="ManifestPackage"></a>

## ManifestPackage : <code>object</code>
The manifest package definition

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| version | <code>string</code> | the manifest package version |
| [license] | <code>string</code> | the manifest package license, e.g. Apache-2.0 |
| [actions] | [<code>Array.&lt;ManifestAction&gt;</code>](#ManifestAction) | Actions in the manifest package |
| [sequences] | [<code>Array.&lt;ManifestSequence&gt;</code>](#ManifestSequence) | Sequences in the manifest package |
| [triggers] | [<code>Array.&lt;ManifestTrigger&gt;</code>](#ManifestTrigger) | Triggers in the manifest package |
| [rules] | [<code>Array.&lt;ManifestRule&gt;</code>](#ManifestRule) | Rules in the manifest package |
| [dependencies] | [<code>Array.&lt;ManifestDependency&gt;</code>](#ManifestDependency) | Dependencies in the manifest package |
| [apis] | [<code>Array.&lt;ManifestApi&gt;</code>](#ManifestApi) | Apis in the manifest package |

<a name="ManifestAction"></a>

## ManifestAction : <code>object</code>
The manifest action definition

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [version] | <code>string</code> | the manifest action version |
| function | <code>string</code> | the path to the action code |
| runtime | <code>string</code> | the runtime environment or kind in which the action                    executes, e.g. 'nodejs:12' |
| [main] | <code>string</code> | the entry point to the function |
| [inputs] | <code>object</code> | the list of action default parameters |
| [limits] | [<code>ManifestActionLimits</code>](#ManifestActionLimits) | limits for the action |
| [web] | <code>string</code> | indicate if an action should be exported as web, can take the                    value of: true | false | yes | no | raw |
| [web-export] | <code>string</code> | same as web |
| [raw-http] | <code>boolean</code> | indicate if an action should be exported as raw web action, this                     option is only valid if `web` or `web-export` is set to true |
| [docker] | <code>string</code> | the docker container to run the action into |
| [annotations] | [<code>ManifestActionAnnotations</code>](#ManifestActionAnnotations) | the manifest action annotations |

<a name="ManifestAction"></a>

## ManifestAction : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| include | <code>Array</code> | array of include glob patterns |

<a name="IncludeEntry"></a>

## IncludeEntry : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| dest | <code>string</code> | destination for included files |
| sources | <code>Array</code> | list of files that matched pattern |

<a name="ManifestSequence"></a>

## ManifestSequence : <code>object</code>
The manifest sequence definition
TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_sequences.md

**Kind**: global typedef  
<a name="ManifestTrigger"></a>

## ManifestTrigger : <code>object</code>
The manifest trigger definition
TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_triggers.md

**Kind**: global typedef  
<a name="ManifestRule"></a>

## ManifestRule : <code>object</code>
The manifest rule definition
TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_rules.md

**Kind**: global typedef  
<a name="ManifestApi"></a>

## ManifestApi : <code>object</code>
The manifest api definition
TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_apis.md

**Kind**: global typedef  
<a name="ManifestDependency"></a>

## ManifestDependency : <code>object</code>
The manifest dependency definition
TODO

**Kind**: global typedef  
<a name="ManifestActionLimits"></a>

## ManifestActionLimits : <code>object</code>
The manifest action limits definition
TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#valid-limit-keys.md

**Kind**: global typedef  
<a name="ManifestActionAnnotations"></a>

## ManifestActionAnnotations : <code>object</code>
The manifest action annotations definition
TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#action-annotations

**Kind**: global typedef  
<a name="OpenWhiskEntities"></a>

## OpenWhiskEntities : <code>object</code>
The OpenWhisk entities definitions, which are compatible with the `openwhisk` node
client module. Can be obtained using (processpackage)[#processpackage] (with `onlyNames=true` for un-deployment)

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| apis | [<code>Array.&lt;OpenWhiskEntitiesRoute&gt;</code>](#OpenWhiskEntitiesRoute) | the array of route entities |
| actions | [<code>Array.&lt;OpenWhiskEntitiesAction&gt;</code>](#OpenWhiskEntitiesAction) | the array of action entities |
| triggers | [<code>Array.&lt;OpenWhiskEntitiesTrigger&gt;</code>](#OpenWhiskEntitiesTrigger) | the array of trigger entities |
| rules | [<code>Array.&lt;OpenWhiskEntitiesRule&gt;</code>](#OpenWhiskEntitiesRule) | the array of rule entities |
| pkgAndDeps | [<code>Array.&lt;OpenWhiskEntitiesPackage&gt;</code>](#OpenWhiskEntitiesPackage) | the array of package entities |

<a name="OpenWhiskEntitiesRoute"></a>

## OpenWhiskEntitiesRoute : <code>object</code>
The api entity definition

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | the api name |
| basepath | <code>string</code> | the api basepath |
| relpath | <code>string</code> | the api relpath |
| action | <code>string</code> | the action name behind the api |
| responsettype | <code>string</code> | the response type, e.g. 'json' |
| operation | <code>string</code> | the http method, e.g 'get' |

<a name="OpenWhiskEntitiesAction"></a>

## OpenWhiskEntitiesAction : <code>object</code>
The action entity definition
TODO

**Kind**: global typedef  
<a name="OpenWhiskEntitiesRule"></a>

## OpenWhiskEntitiesRule : <code>object</code>
The rule entity definition
TODO

**Kind**: global typedef  
<a name="OpenWhiskEntitiesTrigger"></a>

## OpenWhiskEntitiesTrigger : <code>object</code>
The trigger entity definition
TODO

**Kind**: global typedef  
<a name="OpenWhiskEntitiesPackage"></a>

## OpenWhiskEntitiesPackage : <code>object</code>
The package entity definition
TODO

**Kind**: global typedef  
<a name="DeploymentPackages"></a>

## DeploymentPackages : <code>Array.&lt;object&gt;</code>
The entry point to the information read from the deployment file, this can be extracted using
[setPaths](#setpaths).
TODO

**Kind**: global typedef  
<a name="DeploymentTrigger"></a>

## DeploymentTrigger : <code>object</code>
The deployment trigger definition
TODO

**Kind**: global typedef  
<a name="DeploymentFileComponents"></a>

## DeploymentFileComponents : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| packages | [<code>ManifestPackages</code>](#ManifestPackages) | Packages in the manifest |
| deploymentTriggers | [<code>Array.&lt;DeploymentTrigger&gt;</code>](#DeploymentTrigger) | Triggers in the deployment manifest |
| deploymentPackages | [<code>DeploymentPackages</code>](#DeploymentPackages) | Packages in the deployment manifest |
| manifestPath | <code>string</code> | Path to manifest |
| manifestContent | <code>object</code> | Parsed manifest object |
| projectName | <code>string</code> | Name of the project |

### Debug Logs

```bash
LOG_LEVEL=debug <your_call_here>
```

Prepend the `LOG_LEVEL` environment variable and `debug` value to the call that invokes your function, on the command line. This should output a lot of debug data for your SDK calls.

### Contributing

Contributions are welcome! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

### Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
