/**
 * @property apihost - Hostname and optional port for openwhisk platform
 * @property api_key - Authorisation key
 * @property [api] - Full API URL
 * @property [apiversion] - Api version
 * @property [namespace] - Namespace for resource requests
 * @property [ignore_certs] - Turns off server SSL/TLS certificate verification
 * @property [key] - Client key to use when connecting to the apihost
 */
declare type OpenwhiskOptions = {
    apihost: string;
    api_key: string;
    api?: string;
    apiversion?: string;
    namespace?: string;
    ignore_certs?: boolean;
    key?: string;
};

/**
 * @property actions - actions
 * @property activations - activations
 * @property namespaces - namespaces
 * @property packages - packages
 * @property rules - rules
 * @property triggers - triggers
 * @property routes - routes
 */
declare type OpenwhiskClient = {
    actions: ow.Actions;
    activations: ow.Activations;
    namespaces: ow.Namespaces;
    packages: ow.Packages;
    rules: ow.Rules;
    triggers: ow.Triggers;
    routes: ow.Routes;
};

/**
 * This class provides methods to call your RuntimeAPI APIs.
 * Before calling any method initialize the instance by calling the `init` method on it
 * with valid options argument
 */
declare class RuntimeAPI {
    /**
     * Initializes a RuntimeAPI object and returns it.
     * @param options - options for initialization
     * @returns a RuntimeAPI object
     */
    init(options: OpenwhiskOptions): Promise<OpenwhiskClient>;
}

/**
 * runs the command
 * @param [deployConfig.filterEntities] - add filters to deploy only specified OpenWhisk entities
 * @param [deployConfig.filterEntities.actions] - filter list of actions to deploy, e.g. ['name1', ..]
 * @param [deployConfig.filterEntities.sequences] - filter list of sequences to deploy, e.g. ['name1', ..]
 * @param [deployConfig.filterEntities.triggers] - filter list of triggers to deploy, e.g. ['name1', ..]
 * @param [deployConfig.filterEntities.rules] - filter list of rules to deploy, e.g. ['name1', ..]
 * @param [deployConfig.filterEntities.apis] - filter list of apis to deploy, e.g. ['name1', ..]
 * @param [deployConfig.filterEntities.dependencies] - filter list of package dependencies to deploy, e.g. ['name1', ..]
 * @returns deployedEntities
 */
declare function deployActions(config?: any, deployConfig?: {
    filterEntities?: {
        actions?: any[];
        sequences?: any[];
        triggers?: any[];
        rules?: any[];
        apis?: any[];
        dependencies?: any[];
    };
}, eventEmitter: any, logFunc: any): Promise<object>;

declare function deployWsk(scriptConfig: any, manifestContent: any, logFunc: any, filterEntities: any): void;

/**
 * Returns a Promise that resolves with a new RuntimeAPI object.
 * @param options - options for initialization
 * @returns a Promise with a RuntimeAPI object
 */
declare function init(options: OpenwhiskOptions): Promise<OpenwhiskClient>;

/**
 * Prints action logs.
 * @param config - openwhisk config
 * @param logger - an instance of a logger to emit messages to
 * @param limit - maximum number of activations to fetch logs from
 * @param filterActions - array of actions to fetch logs from
 *    examples:-
 *    ['pkg1/'] = logs of all deployed actions under package pkg1
 *    ['pkg1/action'] = logs of action 'action' under package 'pkg1'
 *    [] = logs of all actions in the namespace
 * @param strip - if true, strips the timestamp which prefixes every log line
 * @param tail - if true, logs are fetched continuously
 * @param fetchLogsInterval - number of seconds to wait before fetching logs again when tail is set to true
 * @param startTime - time in milliseconds. Only logs after this time will be fetched
 */
declare function printActionLogs(config: any, logger: any, limit: number, filterActions: any[], strip: boolean, tail: boolean, fetchLogsInterval?: number, startTime: number): void;

/**
 * A class to manage triggers
 */
declare class Triggers {
    /**
     * Creates a trigger and associated feeds
     * @param options - input options to create the trigger from manifest
     * @returns the result of the create operation
     */
    create(options: any): Promise<object>;
    /**
     * Deletes a trigger and associated feeds
     * @param options - options with the `name` of the trigger
     * @returns the result of the delete operation
     */
    delete(options: any): Promise<object>;
}

declare function undeployActions(config: any, logFunc: any): void;

declare function undeployWsk(packageName: any, manifestContent: any, owOptions: any, logger: any): void;

/**
 * The entry point to the information read from the manifest, this can be extracted using
 * [setPaths](#setpaths).
 */
declare type ManifestPackages = ManifestPackage[];

/**
 * The manifest package definition
 * @property version - the manifest package version
 * @property [license] - the manifest package license, e.g. Apache-2.0
 * @property [actions] - Actions in the manifest package
 * @property [sequences] - Sequences in the manifest package
 * @property [triggers] - Triggers in the manifest package
 * @property [rules] - Rules in the manifest package
 * @property [dependencies] - Dependencies in the manifest package
 * @property [apis] - Apis in the manifest package
 */
declare type ManifestPackage = {
    version: string;
    license?: string;
    actions?: ManifestAction[];
    sequences?: ManifestSequence[];
    triggers?: ManifestTrigger[];
    rules?: ManifestRule[];
    dependencies?: ManifestDependency[];
    apis?: ManifestApi[];
};

/**
 * The manifest action definition
 * @property [version] - the manifest action version
 * @property function - the path to the action code
 * @property runtime - the runtime environment or kind in which the action
 *                    executes, e.g. 'nodejs:12'
 * @property [main] - the entry point to the function
 * @property [inputs] - the list of action default parameters
 * @property [limits] - limits for the action
 * @property [web] - indicate if an action should be exported as web, can take the
 *                    value of: true | false | yes | no | raw
 * @property [web-export] - same as web
 * @property [raw-http] - indicate if an action should be exported as raw web action, this
 *                     option is only valid if `web` or `web-export` is set to true
 * @property [docker] - the docker container to run the action into
 * @property [annotations] - the manifest action annotations
 */
declare type ManifestAction = {
    version?: string;
    function: string;
    runtime: string;
    main?: string;
    inputs?: any;
    limits?: ManifestActionLimits;
    web?: string;
    web-export?: string;
    raw-http?: boolean;
    docker?: string;
    annotations?: ManifestActionAnnotations;
};

/**
 * The manifest action definition
 * @property [version] - the manifest action version
 * @property function - the path to the action code
 * @property runtime - the runtime environment or kind in which the action
 *                    executes, e.g. 'nodejs:12'
 * @property [main] - the entry point to the function
 * @property [inputs] - the list of action default parameters
 * @property [limits] - limits for the action
 * @property [web] - indicate if an action should be exported as web, can take the
 *                    value of: true | false | yes | no | raw
 * @property [web-export] - same as web
 * @property [raw-http] - indicate if an action should be exported as raw web action, this
 *                     option is only valid if `web` or `web-export` is set to true
 * @property [docker] - the docker container to run the action into
 * @property [annotations] - the manifest action annotations
 */
declare type ManifestAction = {
    version?: string;
    function: string;
    runtime: string;
    main?: string;
    inputs?: any;
    limits?: ManifestActionLimits;
    web?: string;
    web-export?: string;
    raw-http?: boolean;
    docker?: string;
    annotations?: ManifestActionAnnotations;
};

/**
 * @property dest - destination for included files
 * @property sources - list of files that matched pattern
 */
declare type IncludeEntry = {
    dest: string;
    sources: any[];
};

/**
 * Gets the list of files matching the patterns defined by action.include
 * @param action - action object from manifest which defines includes
 */
declare function getIncludesForAction(action: ManifestAction): any[];

/**
 * The manifest sequence definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_sequences.md
 */
declare type ManifestSequence = any;

/**
 * The manifest trigger definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_triggers.md
 */
declare type ManifestTrigger = any;

/**
 * The manifest rule definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_rules.md
 */
declare type ManifestRule = any;

/**
 * The manifest api definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_apis.md
 */
declare type ManifestApi = any;

/**
 * The manifest dependency definition
 * TODO
 */
declare type ManifestDependency = any;

/**
 * The manifest action limits definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#valid-limit-keys.md
 */
declare type ManifestActionLimits = any;

/**
 * The manifest action annotations definition
 * TODO: see https://github.com/apache/openwhisk-wskdeploy/blob/master/specification/html/spec_actions.md#action-annotations
 */
declare type ManifestActionAnnotations = any;

/**
 * The OpenWhisk entities definitions, which are compatible with the `openwhisk` node
 * client module. Can be obtained using (processpackage)[#processpackage] (with `onlyNames=true` for un-deployment)
 * @property apis - the array of route entities
 * @property actions - the array of action entities
 * @property triggers - the array of trigger entities
 * @property rules - the array of rule entities
 * @property pkgAndDeps - the array of package entities
 */
declare type OpenWhiskEntities = {
    apis: OpenWhiskEntitiesRoute[];
    actions: OpenWhiskEntitiesAction[];
    triggers: OpenWhiskEntitiesTrigger[];
    rules: OpenWhiskEntitiesRule[];
    pkgAndDeps: OpenWhiskEntitiesPackage[];
};

/**
 * The api entity definition
 * @property name - the api name
 * @property basepath - the api basepath
 * @property relpath - the api relpath
 * @property action - the action name behind the api
 * @property responsettype - the response type, e.g. 'json'
 * @property operation - the http method, e.g 'get'
 */
declare type OpenWhiskEntitiesRoute = {
    name: string;
    basepath: string;
    relpath: string;
    action: string;
    responsettype: string;
    operation: string;
};

/**
 * The action entity definition
 * TODO
 */
declare type OpenWhiskEntitiesAction = any;

/**
 * The rule entity definition
 * TODO
 */
declare type OpenWhiskEntitiesRule = any;

/**
 * The trigger entity definition
 * TODO
 */
declare type OpenWhiskEntitiesTrigger = any;

/**
 * The package entity definition
 * TODO
 */
declare type OpenWhiskEntitiesPackage = any;

/**
 * The entry point to the information read from the deployment file, this can be extracted using
 * [setPaths](#setpaths).
 * TODO
 */
declare type DeploymentPackages = object[];

/**
 * The deployment trigger definition
 * TODO
 */
declare type DeploymentTrigger = any;

/**
 * @property packages - Packages in the manifest
 * @property deploymentTriggers - Triggers in the deployment manifest
 * @property deploymentPackages - Packages in the deployment manifest
 * @property manifestPath - Path to manifest
 * @property manifestContent - Parsed manifest object
 * @property projectName - Name of the project
 */
declare type DeploymentFileComponents = {
    packages: ManifestPackages;
    deploymentTriggers: DeploymentTrigger[];
    deploymentPackages: DeploymentPackages;
    manifestPath: string;
    manifestContent: any;
    projectName: string;
};

/**
 * Prints activation logs messages.
 * @param activation - the activation
 * @param strip - if true, strips the timestamp which prefixes every log line
 * @param logger - an instance of a logger to emit messages to
 */
declare function printLogs(activation: any, strip: boolean, logger: any): void;

/**
 * Filters and prints action logs.
 * @param runtime - runtime (openwhisk) object
 * @param logger - an instance of a logger to emit messages to
 * @param limit - maximum number of activations to fetch logs from
 * @param filterActions - array of actions to fetch logs from
 *    ['pkg1/'] = logs of all deployed actions under package pkg1
 *    ['pkg1/action'] = logs of action 'action' under package 'pkg1'
 *    [] = logs of all actions in the namespace
 * @param strip - if true, strips the timestamp which prefixes every log line
 * @param startTime - time in milliseconds. Only logs after this time will be fetched
 */
declare function printFilteredActionLogs(runtime: any, logger: any, limit: number, filterActions: any[], strip: boolean, startTime: number): void;

/**
 * returns path to main function as defined in package.json OR default of index.js
 * note: file MUST exist, caller's responsibility, this method will throw if it does not exist
 * @param pkgJson - : path to a package.json file
 */
declare function getActionEntryFile(pkgJson: any): string;

/**
 * Zip a file/folder using archiver
 */
declare function zip(filePath: string, out: string, pathInZip: boolean): Promise;

/**
 * returns key value pairs in an object from the key value array supplied. Used to create parameters object.
 * @param inputsArray - Array in the form of [{'key':'key1', 'value': 'value1'}]
 * @returns An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 */
declare function createKeyValueObjectFromArray(inputsArray: any[]): any;

/**
 * returns key value array from the object supplied.
 * @param object - JSON object
 * @returns An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]
 */
declare function createKeyValueArrayFromObject(object: any): any[];

/**
 * returns key value array from the parameters supplied. Used to create --param and --annotation key value pairs
 * @param flag - value from flags.param or flags.annotation
 * @returns An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]
 */
declare function createKeyValueArrayFromFlag(flag: any[]): any[];

/**
 * returns key value array from the json file supplied. Used to create --param-file and annotation-file key value pairs
 * @param file - from flags['param-file'] or flags['annotation-file]
 * @returns An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]
 */
declare function createKeyValueArrayFromFile(file: string): any[];

/**
 * returns key value pairs in an object from the parameters supplied. Used to create --param and --annotation key value pairs
 * @param flag - from flags.param or flags.annotation
 * @returns An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 */
declare function createKeyValueObjectFromFlag(flag: any[]): any;

/**
 * parses a package name string and returns the namespace and entity name for a package
 * @param name - package name
 * @returns An object { namespace: string, name: string }
 */
declare function parsePackageName(name: string): any;

/**
 * returns key value array from the params and/or param-file supplied with more precendence to params.
 * @param params - from flags.param or flags.annotation
 * @param paramFilePath - from flags['param-file'] or flags['annotation-file']
 * @returns An array of key value pairs in this format : [{key : 'Your key 1' , value: 'Your value 1'}, {key : 'Your key 2' , value: 'Your value 2'} ]
 */
declare function getKeyValueArrayFromMergedParameters(params: any[], paramFilePath: string): any[];

/**
 * returns key value object from the params and/or param-file supplied with more precendence to params.
 * @param params - from flags.param or flags.annotation
 * @param paramFilePath - from flags['param-file'] or flags['annotation-file']
 * @returns An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 */
declare function getKeyValueObjectFromMergedParameters(params: any[], paramFilePath: string): any;

/**
 * returns key value pairs from the parameters supplied. Used to create --param-file and --annotation-file key value pairs
 * @param file - from flags['param-file'] or flags['annotation-file']
 * @returns An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 */
declare function createKeyValueObjectFromFile(file: string): any;

/**
 * Creates an object representation of a sequence.
 * @param sequenceAction - the sequence action array
 * @returns the object representation of the sequence
 */
declare function createComponentsfromSequence(sequenceAction: any[]): any;

/**
 * Creates a union of two objects
 * @param firstObject - the object to merge into
 * @param secondObject - the object to merge from
 * @returns the union of both objects
 */
declare function returnUnion(firstObject: any, secondObject: any): any;

/**
 * Parse a path pattern
 * @param path - the path to parse
 * @returns array of matches
 */
declare function parsePathPattern(path: string): any[];

/**
 * Process inputs
 * @param input - the input object to process
 * @param params - the parameters for the input to process
 * @returns the processed inputs
 */
declare function processInputs(input: any, params: any): any;

/**
 * Create a key-value object from the input
 * @param input - the input to process
 * @returns the processed input as a key-value object
 */
declare function createKeyValueInput(input: any): any;

/**
 * Get the deployment yaml file path
 * @returns the deployment yaml path
 */
declare function getDeploymentPath(): string;

/**
 * Get the manifest yaml file path
 * @returns the manifest yaml path
 */
declare function getManifestPath(): string;

/**
 * Get the deployment trigger inputs.
 * @param deploymentPackages - the deployment packages
 * @returns the deployment trigger inputs
 */
declare function returnDeploymentTriggerInputs(deploymentPackages: DeploymentPackages): any;

/**
 * Get the annotations for an action
 * @param action - the action manifest object
 * @returns the action annotation entities
 */
declare function returnAnnotations(action: ManifestAction): any;

/**
 * Creates an array of route definitions from the given manifest-based package.
 * See https://github.com/apache/openwhisk-wskdeploy/blob/master/parsers/manifest_parser.go#L1187
 * @param pkg - The package definition from the manifest.
 * @param pkgName - The name of the package.
 * @param apiName - The name of the HTTP API definition from the manifest.
 * @param allowedActions - List of action names allowed to be used in routes.
 * @param allowedSequences - List of sequence names allowed to be used in routes.
 * @param pathOnly - Skip action, method and response type in route definitions.
 * @returns the array of route entities
 */
declare function createApiRoutes(pkg: ManifestPackage, pkgName: string, apiName: string, allowedActions: any[], allowedSequences: any[], pathOnly: boolean): OpenWhiskEntitiesRoute[];

/**
 * Create a sequence object that is compatible with the OpenWhisk API from a parsed manifest object
 * @param fullName - the full sequence name prefixed with the package, e.g. `pkg/sequence`
 * @param manifestSequence - a sequence object as defined in a valid manifest file
 * @param packageName - the package name of the sequence, which will be set to for actions in the sequence
 * @returns a sequence object describing the action entity
 */
declare function createSequenceObject(fullName: string, manifestSequence: ManifestSequence, packageName: string): OpenWhiskEntitiesAction;

/**
 * Check the web flags
 * @param flag - the flag to check
 * @returns object with the appropriate web flags for an action
 */
declare function checkWebFlags(flag: string | boolean): any;

/**
 * Create an action object compatible with the OpenWhisk API from an action object parsed from the manifest.
 * @param fullName - the full action name prefixed with the package, e.g. `pkg/action`
 * @param manifestAction - the action object as parsed from the manifest
 * @returns the action entity object
 */
declare function createActionObject(fullName: string, manifestAction: ManifestAction): OpenWhiskEntitiesAction;

/**
 * Process the manifest and deployment content and returns deployment entities.
 * @param packages - the manifest packages
 * @param deploymentPackages - the deployment packages
 * @param deploymentTriggers - the deployment triggers
 * @param params - the package params
 * @param [namesOnly = false] - if false, set the namespaces as well
 * @param [owOptions = {}] - additional OpenWhisk options
 * @returns deployment entities
 */
declare function processPackage(packages: ManifestPackages, deploymentPackages: DeploymentPackages, deploymentTriggers: DeploymentTrigger, params: any, namesOnly?: boolean, owOptions?: any): OpenWhiskEntities;

/**
 * Get the deployment file components.
 * @param flags - (manifest + deployment)
 * @returns fileComponents
 */
declare function setPaths(flags: any): DeploymentFileComponents;

/**
 * Handle Adobe auth action dependency
 *
 * This is a temporary solution and needs to be removed when headless apps will be able to
 * validate against app-registry
 *
 * This function stores the IMS organization id in the Adobe I/O cloud state library which
 * is required by the headless validator.
 *
 * The IMS org id must be stored beforehand in `@adobe/aio-lib-core-config` under the
 * `'project.org.ims_org_id'` key. TODO: pass in imsOrgId
 * @param actions - the array of action deployment entities
 * @param owOptions - OpenWhisk options
 * @param imsOrgId - the IMS Org Id
 */
declare function setupAdobeAuth(actions: OpenWhiskEntitiesAction[], owOptions: any, imsOrgId: string): void;

/**
 * Deploy all processed entities: can deploy packages, actions, triggers, rules and apis.
 * @param entities - the processed entities
 * @param ow - the OpenWhisk client
 * @param logger - the logger
 * @param imsOrgId - the IMS Org ID
 */
declare function deployPackage(entities: OpenWhiskEntitiesAction, ow: any, logger: any, imsOrgId: string): void;

/**
 * Undeploy all processed entities: can undeploy packages, actions, triggers, rules and apis.
 * Entity definitions do not need to be complete, only the names are needed for un-deployment.
 * @param entities - the processed entities, only names are enough for undeploy
 * @param ow - the OpenWhisk object
 * @param logger - the logger
 */
declare function undeployPackage(entities: any, ow: any, logger: any): void;

/**
 * Sync a project. This is a higher level function that can be used to sync a local
 * manifest with deployed entities.
 *
 * `syncProject` doesn't only deploy entities it might also undeploy entities that are not
 * defined in the manifest. This behavior can be disabled via the `deleteEntities` boolean
 * parameter.
 * @param projectName - the project name
 * @param manifestPath - the manifest path
 * @param manifestContent - the manifest content, needed to compute hash
 * @param entities - the entities, extracted via `processPackage`
 * @param ow - the OpenWhisk object
 * @param logger - the logger
 * @param imsOrgId - the IMS Org ID
 * @param deleteEntities - set to true to delete entities
 */
declare function syncProject(projectName: string, manifestPath: string, manifestContent: string, entities: OpenWhiskEntities, ow: any, logger: any, imsOrgId: string, deleteEntities?: boolean): void;

/**
 * Get deployed entities for a managed project. This methods retrieves all the deployed
 * entities for a given project name or project hash. This only works if the project was
 * deployed using the `whisk-managed` annotation. This annotation can be set
 * pre-deployement using `[addManagedProjectAnnotations](#addmanagedprojectannotations)`.
 *
 * Note that returned apis will always be empty as they don't support annotations and
 * hence are not managed as part of a project.
 * @param project - the project name or hash
 * @param isProjectHash - set to true if the project is a hash, and not the name
 * @param ow - the OpenWhisk client object
 * @returns the deployed project entities
 */
declare function getProjectEntities(project: string, isProjectHash: boolean, ow: any): Promise<OpenWhiskEntities>;

/**
 * Add the `whisk-managed` annotation to processed entities. This is needed for syncing
 * managed projects.
 * @param entities - the processed entities
 * @param manifestPath - the manifest path
 * @param projectName - the project name
 * @param projectHash - the project hash
 */
declare function addManagedProjectAnnotations(entities: OpenWhiskEntities, manifestPath: string, projectName: string, projectHash: string): void;

/**
 * Compute the project hash based on the manifest content and manifest path. This is used
 * for syncing managed projects.
 * @param manifestContent - the manifest content
 * @param manifestPath - the manifest path
 * @returns the project hash
 */
declare function getProjectHash(manifestContent: string, manifestPath: string): string;

/**
 * Retrieve the project hash from a deployed managed project.
 * @param ow - the OpenWhisk client object
 * @param projectName - the project name
 * @returns the project hash, or '' if not found
 */
declare function findProjectHashonServer(ow: any, projectName: string): Promise<string>;

declare function _relApp(root: any, p: any): void;

declare function _absApp(root: any, p: any): void;

declare function checkOpenWhiskCredentials(config: any): void;

declare function getActionUrls(appConfig: any, isRemoteDev: any, isLocalDev: any): void;

/**
 * Joins url path parts
 * @param args - url parts
 */
declare function urlJoin(...args: string[]): string;

declare function removeProtocolFromURL(url: any): void;

/**
 * Checks the validity of nodejs version in action definition and throws an error if invalid.
 * @param action - action object
 */
declare function validateActionRuntime(action: any): void;

/**
 * Returns the action's build file name without the .zip extension
 * @param pkgName - name of the package
 * @param actionName - name of the action
 * @param defaultPkg - true if pkgName is the default/first package
 */
declare function getActionZipFileName(pkgName: string, actionName: string, defaultPkg: boolean): void;

