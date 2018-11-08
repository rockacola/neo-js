"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const node_log_it_1 = require("node-log-it");
const lodash_1 = require("lodash");
const MODULE_NAME = 'Mesh';
const DEFAULT_OPTIONS = {
    startBenchmarkOnInit: true,
    benchmarkIntervalMs: 2000,
    minActiveNodesRequired: 2,
    loggerOptions: {},
};
class Mesh extends events_1.EventEmitter {
    constructor(nodes, options = {}) {
        super();
        this._isReady = false;
        this.nodes = nodes;
        if (this.nodes.length === 0) {
            throw new Error('Mesh must have 1 or more nodes.');
        }
        this.options = lodash_1.merge({}, DEFAULT_OPTIONS, options);
        this.validateOptionalParameters();
        this.logger = new node_log_it_1.Logger(MODULE_NAME, this.options.loggerOptions);
        if (this.options.startBenchmarkOnInit) {
            this.startBenchmark();
        }
        this.logger.debug('constructor completes.');
    }
    isReady() {
        return this._isReady;
    }
    startBenchmark() {
        this.logger.debug('startBenchmark triggered.');
        const unknownNodes = lodash_1.filter(this.nodes, (n) => n.isActive === undefined);
        this.logger.debug('unknownNodes.length:', unknownNodes.length);
        unknownNodes.forEach((n) => {
            n.getBlockCount()
                .then(() => {
                this.checkMeshReady();
            })
                .catch((err) => {
                this.logger.info('node.getBlockCount error, but to continue... Endpoint:', n.endpoint, 'Message:', err.message);
            });
        });
        this.benchmarkIntervalId = setInterval(() => this.performBenchmark(), this.options.benchmarkIntervalMs);
    }
    stopBenchmark() {
        this.logger.debug('stopBenchmark triggered.');
        if (this.benchmarkIntervalId) {
            clearInterval(this.benchmarkIntervalId);
        }
    }
    getFastestNode(activeOnly = true) {
        this.logger.debug('getFastestNode triggered.');
        let nodePool = activeOnly ? this.listActiveNodes() : this.nodes;
        if (nodePool.length === 0) {
            return undefined;
        }
        nodePool = lodash_1.filter(nodePool, (n) => n.latency !== undefined);
        if (nodePool.length === 0) {
            return undefined;
        }
        return lodash_1.minBy(nodePool, 'latency');
    }
    getHighestNode(activeOnly = true) {
        this.logger.debug('getHighestNode triggered.');
        let nodePool = activeOnly ? this.listActiveNodes() : this.nodes;
        if (nodePool.length === 0) {
            return undefined;
        }
        nodePool = lodash_1.filter(nodePool, (n) => n.blockHeight !== undefined);
        if (nodePool.length === 0) {
            return undefined;
        }
        return lodash_1.maxBy(nodePool, 'blockHeight');
    }
    getRandomNode(activeOnly = true) {
        this.logger.debug('getRandomNode triggered.');
        const nodePool = activeOnly ? this.listActiveNodes() : this.nodes;
        if (nodePool.length === 0) {
            return undefined;
        }
        const randomIndex = lodash_1.random(0, nodePool.length - 1);
        return nodePool[randomIndex];
    }
    validateOptionalParameters() {
    }
    performBenchmark() {
        this.logger.debug('performBenchmark triggered.');
        const node = this.getRandomNode();
        if (node) {
            node.getBlockCount().catch((err) => {
                this.logger.info('node.getBlockCount error in performBenchmark(). Endpoint:', node.endpoint, 'Message:', err.message);
            });
        }
    }
    checkMeshReady() {
        this.logger.debug('checkMeshReady triggered.');
        const activeNodes = this.listActiveNodes();
        if (!this.options.minActiveNodesRequired || activeNodes.length >= this.options.minActiveNodesRequired) {
            if (!this._isReady) {
                this.setReady();
                this.logger.debug('mesh is considered to be now ready.');
            }
        }
    }
    setReady() {
        this._isReady = true;
        this.emit('ready');
    }
    listActiveNodes() {
        return lodash_1.filter(this.nodes, { isActive: true });
    }
}
exports.Mesh = Mesh;
//# sourceMappingURL=mesh.js.map