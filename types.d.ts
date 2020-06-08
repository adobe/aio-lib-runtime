/**
 * returns key value pairs in an object from the key value array supplied. Used to create parameters object
 * @param inputsArray - Array in the form of [{'key':'key1', 'value': 'value1'}]
 * @returns An object of key value pairs in this format : {Your key1 : 'Your Value 1' , Your key2: 'Your value 2'}
 */
declare function createKeyValueObjectFromArray(inputsArray: any[]): any;

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

