"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const node_log_it_1 = require("node-log-it");
const lodash_1 = require("lodash");
const mesh_1 = require("./core/mesh");
const node_1 = require("./core/node");
const api_1 = require("./core/api");
const syncer_1 = require("./core/syncer");
const memory_storage_1 = require("./storages/memory-storage");
const mongodb_storage_1 = require("./storages/mongodb-storage");
const endpoint_validator_1 = require("./validators/endpoint-validator");
const profiles_1 = require("./common/profiles");
const constants_1 = require("./common/constants");
const MODULE_NAME = 'Neo';
const DEFAULT_OPTIONS = {
    network: constants_1.default.network.testnet,
    loggerOptions: {},
};
class Neo extends events_1.EventEmitter {
    constructor(options = {}) {
        super();
        this.options = lodash_1.merge({}, DEFAULT_OPTIONS, options);
        this.logger = new node_log_it_1.Logger(MODULE_NAME, this.options.loggerOptions);
        this.mesh = this.getMesh();
        this.storage = this.getStorage();
        this.api = this.getApi();
        this.syncer = this.getSyncer();
        this.logger.debug('constructor completes.');
    }
    static get VERSION() {
        return profiles_1.default.version;
    }
    get VERSION() {
        return profiles_1.default.version;
    }
    getMesh() {
        this.logger.debug('getMesh triggered.');
        const nodes = this.getNodes();
        return new mesh_1.Mesh(nodes, this.options.meshOptions);
    }
    getStorage() {
        this.logger.debug('getStorage triggered.');
        if (!this.options.storageType) {
            return undefined;
        }
        else if (this.options.storageType === constants_1.default.storage.memory) {
            return new memory_storage_1.MemoryStorage(this.options.storageOptions);
        }
        else if (this.options.storageType === constants_1.default.storage.mongodb) {
            return new mongodb_storage_1.MongodbStorage(this.options.storageOptions);
        }
        else {
            throw new Error(`Unknown storageType [${this.options.storageType}]`);
        }
    }
    getApi() {
        this.logger.debug('getApi triggered.');
        return new api_1.Api(this.mesh, this.storage, this.options.apiOptions);
    }
    getSyncer() {
        this.logger.debug('getSyncer triggered.');
        return new syncer_1.Syncer(this.mesh, this.storage, this.options.syncerOptions);
    }
    getNodes() {
        this.logger.debug('getNodes triggered.');
        let endpoints = [];
        if (this.options.endpoints) {
            endpoint_validator_1.EndpointValidator.validateArray(this.options.endpoints);
            endpoints = this.options.endpoints;
        }
        else if (this.options.network === constants_1.default.network.testnet) {
            endpoints = profiles_1.default.rpc.testnet;
        }
        else if (this.options.network === constants_1.default.network.mainnet) {
            endpoints = profiles_1.default.rpc.mainnet;
        }
        else {
            throw new Error('Invalid network or provided endpoints.');
        }
        let nodes = [];
        endpoints.forEach((item) => {
            const node = new node_1.Node(item.endpoint, this.options.nodeOptions);
            nodes.push(node);
        });
        return nodes;
    }
    close() {
        this.logger.debug('close triggered.');
        if (this.mesh) {
            this.mesh.stopBenchmark();
        }
        if (this.storage) {
            this.storage.disconnect();
        }
    }
}
exports.Neo = Neo;
//# sourceMappingURL=neo.js.map