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
 * Returns a Promise that resolves with a new RuntimeAPI object.
 * @param options - options for initialization
 * @returns a Promise with a RuntimeAPI object
 */
declare function init(options: OpenwhiskOptions): Promise<OpenwhiskClient>;

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
 * Prints activation logs messages.
 * @param activation - the activation
 * @param strip - if true, strips the timestamp which prefixes every log line
 * @param logger - an instance of a logger to emit messages to
 */
declare function printLogs(activation: any, strip: boolean, logger: any): void;

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
declare function returnDeploymentTriggerInputs(deploymentPackages: any): any;

/**
 * Get the annotations for an action
 * @param action - the action object
 * @returns the action object annotations
 */
declare function returnAnnotations(action: any): any;

/**
 * Creates an array of route definitions from the given manifest-based package.
 * See https://github.com/apache/openwhisk-wskdeploy/blob/master/parsers/manifest_parser.go#L1187
 * @param pkg - The package definition from the manifest.
 * @param pkgName - The name of the package.
 * @param apiName - The name of the HTTP API definition from the manifest.
 * @param allowedActions - List of action names allowed to be used in routes.
 * @param allowedSequences - List of sequence names allowed to be used in routes.
 * @param pathOnly - Skip action, method and response type in route definitions.
 */
declare function createApiRoutes(pkg: any, pkgName: string, apiName: string, allowedActions: any[], allowedSequences: any[], pathOnly: boolean): any;

/**
 * Create a sequence object
 * @param thisSequence - a sequence object
 * @param options - the sequence options
 * @param key - the action key
 * @returns a sequence object
 */
declare function createSequenceObject(thisSequence: any, options: any, key: string): any;

/**
 * Check the web flags
 * @param flag - the flag to check
 * @returns object with the appropriate web flags for an action
 */
declare function checkWebFlags(flag: string | boolean): any;

/**
 * Create an action object from an action
 * @param thisAction - the action
 * @param objAction - the result action object
 * @returns the action object
 */
declare function createActionObject(thisAction: any, objAction: any): any;

/**
 * Process a package.
 * @param packages - the manifest packages
 * @param deploymentPackages - the deployment packages
 * @param deploymentTriggers - the deployment triggers
 * @param params - the package params
 * @param [namesOnly = false] - if false, set the namespaces as well
 * @param [owOptions = {}] - additional OpenWhisk options
 * @returns object with all the new package contents
 */
declare function processPackage(packages: any, deploymentPackages: any, deploymentTriggers: any, params: any, namesOnly?: boolean, owOptions?: any): any;

/**
 * @property packages - Packages in the manifest
 * @property deploymentTriggers - Triggers in the manifest
 * @property deploymentPackages - Packages in the manifest
 * @property manifestPath - Path to manifest
 * @property manifestContent - Parsed manifest object
 * @property projectName - Name of the project
 */
declare type DeploymentFileComponents = {
    packages: any[];
    deploymentTriggers: any[];
    deploymentPackages: any[];
    manifestPath: string;
    manifestContent: any;
    projectName: string;
};

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
 * @param actions - the actions
 * @param owOptions - OpenWhisk actions
 * @param imsOrgId - the IMS Org Id
 */
declare function setupAdobeAuth(actions: any, owOptions: any, imsOrgId: string): void;

/**
 * Deploy a package
 * @param entities - the entities
 * @param ow - the OpenWhisk object
 * @param logger - the logger
 * @param imsOrgId - the IMS Org ID
 */
declare function deployPackage(entities: any, ow: any, logger: any, imsOrgId: string): void;

/**
 * Undeploy a package
 * @param entities - the entities
 * @param ow - the OpenWhisk object
 * @param logger - the logger
 */
declare function undeployPackage(entities: any, ow: any, logger: any): void;

/**
 * Sync a project.
 * @param projectName - the project name
 * @param manifestPath - the manifest path
 * @param manifestContent - the manifest content
 * @param entities - the entities
 * @param ow - the OpenWhisk object
 * @param logger - the logger
 * @param imsOrgId - the IMS Org ID
 * @param deleteEntities - set to true to delete entities
 */
declare function syncProject(projectName: string, manifestPath: string, manifestContent: string, entities: any, ow: any, logger: any, imsOrgId: string, deleteEntities?: boolean): void;

/**
 * Get project entities
 * @param project - the project
 * @param isProjectHash - set to true if the project is a hash, and not just the name
 * @param ow - the OpenWhisk object
 */
declare function getProjectEntities(project: string, isProjectHash: boolean, ow: any): void;

/**
 * Add managed project annotations
 * @param entities - the entities
 * @param manifestPath - the manifest path
 * @param projectName - the project name
 * @param projectHash - the project hash
 */
declare function addManagedProjectAnnotations(entities: any, manifestPath: string, projectName: string, projectHash: string): void;

/**
 * Get the project hash
 * @param manifestContent - the manifest content
 * @param manifestPath - the manifest path
 * @returns the project hash
 */
declare function getProjectHash(manifestContent: string, manifestPath: string): string;

/**
 * Find project hash on the server
 * @param ow - the OpenWhisk object
 * @param projectName - the project name
 * @returns the project hash, or '' if not found
 */
declare function findProjectHashonServer(ow: any, projectName: string): string;

/**
 * Get the file extension for a kind
 * @param kind - the kind
 * @returns the file extension, or '' if not found
 */
declare function fileExtensionForKind(kind: string): string;

/**
 * Get the kind for a file extension
 * @param filename - the filename
 * @returns the kind, or undefined if not found
 */
declare function kindForFileExtension(filename: string): string;

