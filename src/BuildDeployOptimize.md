
Both BuildActions and DeployActions contain considerable code to handle things like filtering which actions are to be built/deployed and rewriting entries that are missing a package name. checks if appConfig has backend, .. etc

build will empty the dist folder



### Build Actions

runtime lib - buildActions is called with a bunch of actions
- config, filterActions, skipCheck:boolean


- checks if appConfig has backend ( this should be done by app plugin )
- replaces packagePlaceholder in config ??
- creates sanitizedFilterActions
  - convert <actionname> to <package>/<actionname> using default/first package
- empty dist folder dist/actions ?? this should be done by the app plugin
- create a list of actions to build
- load list of last built actions (last-built-actions.json)
- calls `prepareToBuildAction` for each action
  - gen zipFileName `actionName.zip`
  - create tempBuildDir `actionName-temp/`
  - copy include files if any
  - if action is a dir
    - we copy it to tempBuildDir dereferencing symlinks
  - else if action is not a dir
    - look for and load webpack config
    - create webpack compiler
    - webpack it
  : return `actionName, buildHash, legacy: defaultPackage, outPath, tempBuildDir, tempActionName: 'index.js'`

- calls zipActions with entire list

### Deploy Actions

/**
 * runs the command
 *
 * @param {object} config app config
 * @param {object} [deployConfig={}] deployment config
 * @param {boolean} [deployConfig.isLocalDev] local dev flag
 * @param {object} [deployConfig.filterEntities] add filters to deploy only specified OpenWhisk entities
 * @param {Array} [deployConfig.filterEntities.actions] filter list of actions to deploy by provided array, e.g. ['name1', ..]
 * @param {boolean} [deployConfig.filterEntities.byBuiltActions] if true, trim actions from the manifest based on the already built actions
 * @param {Array} [deployConfig.filterEntities.sequences] filter list of sequences to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.triggers] filter list of triggers to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.rules] filter list of rules to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.apis] filter list of apis to deploy, e.g. ['name1', ..]
 * @param {Array} [deployConfig.filterEntities.dependencies] filter list of package dependencies to deploy, e.g. ['name1', ..]
 * @param {object} [logFunc] custom logger function
 * @returns {Promise<object>} deployedEntities
 */

special cases for localDev




loadActionDeployLog
foreach action
  calculate hash of source
  if hash is changed
    add action to list
    delete actionLogEntry

TODO:

- timing comparisons for build, deploy, run
- error when pointing yaml action at a dir with just index.js
✖ An error occured while running #initializing
 ›   Error: /Users/jessem/repos/adobe/aio-all/test/test-many-actions/src/dx-excshell-1/actions/generic/package.json: ENOENT: no such file or
 ›    directory, open '/Users/jessem/repos/adobe/aio-all/test/test-many-actions/src/dx-excshell-1/actions/generic/package.json'


TODO:
better error for a missing action dir ... if xaml points to a non-existent folder it fails in build be we can tell them why
✖ Building actions for 'dx/excshell/1'
 ›   Error: ENOENT: no such file or directory, lstat
 ›   '/Users/jessem/repos/adobe/aio-all/test/test-many-actions/src/dx-excshell-1/actions/action'

 todo: hash action params + zip file and store every time we deploy so we can see if values have changed
// replaceIfEnvKey
// env var changes should be enough to re-deploy an action

///
No optimization ...

aio app run  75.48s user 10.70s system 86% cpu 1:39.09 total
aio app run  15.27s user 2.17s system 31% cpu 55.982 total

aio app build --force-build --no-web-assets  62.16s user 8.92s system 155% cpu 45.631 total
aio app build --no-web-assets  1.36s user 0.32s system 99% cpu 1.686 total

aio app deploy --no-web-assets --no-publish --force-build  66.36s user 9.68s system 76% cpu 1:38.77 total
aio app deploy --no-web-assets --no-publish --no-force-build  5.76s user 0.99s system 12% cpu 52.66 total


Can optimize further by not always deploying all actions during run ... only if they have changed ...
Need to hash build output + params/settings/config in yaml to detect if we really need to deploy an action