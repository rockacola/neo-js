"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const async_1 = require("async");
const node_log_it_1 = require("node-log-it");
const lodash_1 = require("lodash");
const MODULE_NAME = 'Syncer';
const DEFAULT_OPTIONS = {
    startOnInit: true,
    workerCount: 30,
    doEnqueueBlockIntervalMs: 2000,
    verifyBlocksIntervalMs: 1 * 60 * 1000,
    maxQueueLength: 10000,
    reQueueDelayMs: 2000,
    standardEnqueueBlockPriority: 5,
    retryEnqueueBlockPriority: 3,
    verifyEnqueueBlockPriority: 1,
    loggerOptions: {},
};
class Syncer extends events_1.EventEmitter {
    constructor(mesh, storage, options = {}) {
        super();
        this._isRunning = false;
        this.blockWritePointer = 0;
        this.enqueueBlockIntervalId = undefined;
        this.blockVerificationIntervalId = undefined;
        this.mesh = mesh;
        this.storage = storage;
        this.options = lodash_1.merge({}, DEFAULT_OPTIONS, options);
        this.logger = new node_log_it_1.Logger(MODULE_NAME, this.options.loggerOptions);
        this.queue = this.getPriorityQueue();
        if (this.options.startOnInit) {
            this.start();
        }
        this.on('storeBlock:complete', this.storeBlockCompleteHandler.bind(this));
        this.logger.debug('constructor completes.');
    }
    isRunning() {
        return this._isRunning;
    }
    start() {
        if (this._isRunning) {
            this.logger.info('Syncer has already started.');
            return;
        }
        this.logger.info('Start syncer.');
        this._isRunning = true;
        this.emit('start');
        this.initEnqueueBlock();
        this.initBlockVerification();
    }
    stop() {
        if (!this._isRunning) {
            this.logger.info('Syncer is not running at the moment.');
            return;
        }
        this.logger.info('Stop syncer.');
        this._isRunning = false;
        this.emit('stop');
        clearInterval(this.enqueueBlockIntervalId);
        clearInterval(this.blockVerificationIntervalId);
    }
    storeBlockCompleteHandler(payload) {
        if (payload.isSuccess === false) {
            this.logger.debug('storeBlockCompleteHandler !isSuccess triggered.');
            setTimeout(() => {
                this.enqueueBlock(payload.height, this.options.retryEnqueueBlockPriority);
            }, this.options.reQueueDelayMs);
        }
    }
    getPriorityQueue() {
        return async_1.priorityQueue((task, callback) => {
            const method = task.method;
            const attrs = task.attrs;
            this.logger.debug('new worker for queue.');
            method(attrs)
                .then(() => {
                callback();
                this.logger.debug('queued method run completed.');
                this.emit('syncer:run:complete', { isSuccess: true, task });
            })
                .catch((err) => {
                this.logger.warn(`Task execution error. attrs: [${attrs}]. Continue...`);
                callback();
                this.emit('syncer:run:complete', { isSuccess: false, task });
            });
        }, this.options.workerCount);
    }
    initEnqueueBlock() {
        this.logger.debug('initEnqueueBlock triggered.');
        this.setBlockWritePointer()
            .then(() => {
            this.enqueueBlockIntervalId = setInterval(() => {
                this.doEnqueueBlock();
            }, this.options.doEnqueueBlockIntervalMs);
        })
            .catch((err) => {
            this.logger.warn('storage.getBlockCount() failed. Error:', err.message);
        });
    }
    doEnqueueBlock() {
        this.logger.debug('doEnqueueBlock triggered.');
        const node = this.mesh.getHighestNode();
        if (node) {
            while ((this.blockWritePointer < node.blockHeight) && (this.queue.length() < this.options.maxQueueLength)) {
                this.increaseBlockWritePointer();
                this.enqueueBlock(this.blockWritePointer, this.options.standardEnqueueBlockPriority);
            }
        }
        else {
            this.logger.error('Unable to find a valid node.');
        }
    }
    setBlockWritePointer() {
        this.logger.debug('setBlockWritePointer triggered.');
        return new Promise((resolve, reject) => {
            this.storage.getBlockCount()
                .then((height) => {
                this.logger.debug('getBlockCount success. height:', height);
                this.blockWritePointer = height;
                resolve();
            })
                .catch((err) => {
                this.logger.warn('storage.getBlockCount() failed. Error:', err.message);
                this.logger.info('Assumed that there are no blocks.');
                this.blockWritePointer = 0;
                resolve();
            });
        });
    }
    initBlockVerification() {
        this.logger.debug('initEnqueueBlock triggered.');
        this.blockVerificationIntervalId = setInterval(() => {
            this.doBlockVerification();
        }, this.options.verifyBlocksIntervalMs);
    }
    doBlockVerification() {
        this.logger.debug('doBlockVerification triggered.');
        const startHeight = 1;
        const endHeight = this.blockWritePointer;
        this.storage.listMissingBlocks(startHeight, endHeight)
            .then((res) => {
            this.logger.info('Blocks missing count:', res.length);
            res.forEach((height) => {
                this.enqueueBlock(height, this.options.verifyEnqueueBlockPriority);
            });
        });
    }
    increaseBlockWritePointer() {
        this.logger.debug('increaseBlockWritePointer triggered.');
        this.blockWritePointer += 1;
    }
    enqueueBlock(height, priority) {
        this.logger.debug('enqueueBlock triggered. height:', height, 'priority:', priority);
        this.emit('enqueueBlock:init', { height, priority });
        if (height > this.blockWritePointer) {
            this.logger.debug('height > this.blockWritePointer, blockWritePointer is now:', height);
            this.blockWritePointer = height;
        }
        this.queue.push({
            method: this.storeBlock.bind(this),
            attrs: {
                height,
            },
        }, priority);
    }
    storeBlock(attrs) {
        this.logger.debug('storeBlock triggered. attrs:', attrs);
        const height = attrs.height;
        this.emit('storeBlock:init', { height });
        return new Promise((resolve, reject) => {
            const node = this.mesh.getFastestNode();
            if (!node) {
                this.emit('storeBlock:complete', { isSuccess: false, height });
                return reject(new Error('No valid node found.'));
            }
            node.getBlock(height)
                .then((block) => {
                const source = node.endpoint;
                this.storage.setBlock(height, block, source)
                    .then((res) => {
                    this.logger.debug('setBlock succeeded. For height:', height);
                    this.emit('storeBlock:complete', { isSuccess: true, height });
                    return resolve();
                })
                    .catch((err) => {
                    this.logger.debug('setBlock failed. For height:', height);
                    this.emit('storeBlock:complete', { isSuccess: false, height });
                    return reject(err);
                });
            })
                .catch((err) => {
                this.logger.debug('getBlock failed. For height:', height);
                this.emit('storeBlock:complete', { isSuccess: false, height });
                return reject(err);
            });
        });
    }
}
exports.Syncer = Syncer;
//# sourceMappingURL=syncer.js.map