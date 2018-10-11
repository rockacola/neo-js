"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const async_1 = require("async");
const node_log_it_1 = require("node-log-it");
const lodash_1 = require("lodash");
const MODULE_NAME = 'Syncer';
const DEFAULT_OPTIONS = {
    minHeight: 1,
    maxHeight: undefined,
    blockRedundancy: 1,
    startOnInit: true,
    workerCount: 30,
    enqueueBlockIntervalMs: 2000,
    verifyBlocksIntervalMs: 1 * 60 * 1000,
    maxQueueLength: 10000,
    retryEnqueueDelayMs: 2000,
    standardEnqueueBlockPriority: 5,
    retryEnqueueBlockPriority: 3,
    missingEnqueueStoreBlockPriority: 1,
    loggerOptions: {},
};
class Syncer extends events_1.EventEmitter {
    constructor(mesh, storage, options = {}) {
        super();
        this._isRunning = false;
        this.blockWritePointer = 0;
        this.mesh = mesh;
        this.storage = storage;
        this.options = lodash_1.merge({}, DEFAULT_OPTIONS, options);
        this.validateOptionalParameters();
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
        this.logger.info('Start syncer. minHeight:', this.options.minHeight, 'maxHeight:', this.options.maxHeight);
        this._isRunning = true;
        this.emit('start');
        this.initStoreBlock();
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
        clearInterval(this.enqueueStoreBlockIntervalId);
        clearInterval(this.blockVerificationIntervalId);
    }
    storeBlockCompleteHandler(payload) {
        if (payload.isSuccess === false) {
            this.logger.debug('storeBlockCompleteHandler !isSuccess triggered.');
            setTimeout(() => {
                this.enqueueStoreBlock(payload.height, this.options.retryEnqueueBlockPriority);
            }, this.options.retryEnqueueDelayMs);
        }
    }
    validateOptionalParameters() {
        if (!this.options.blockRedundancy) {
            throw new Error('blockRedundancy parameter must be supplied.');
        }
        else if (this.options.blockRedundancy !== 1) {
            throw new Error('supplied blockRedundancy parameter is invalid. Currently only supports for value [1].');
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
                this.logger.info('Task execution error, but to continue... attrs:', attrs);
                callback();
                this.emit('syncer:run:complete', { isSuccess: false, task });
            });
        }, this.options.workerCount);
    }
    initStoreBlock() {
        this.logger.debug('initStoreBlock triggered.');
        this.setBlockWritePointer()
            .then(() => {
            this.enqueueStoreBlockIntervalId = setInterval(() => {
                this.doEnqueueStoreBlock();
            }, this.options.enqueueBlockIntervalMs);
        })
            .catch((err) => {
            this.logger.warn('storage.getBlockCount() failed. Error:', err.message);
        });
    }
    doEnqueueStoreBlock() {
        this.logger.debug('doEnqueueStoreBlock triggered.');
        if (this.options.maxHeight && this.blockWritePointer >= this.options.maxHeight) {
            this.logger.info(`BlockWritePointer is greater or equal to designated maxHeight [${this.options.maxHeight}]. There will be no enqueue block beyond this point.`);
            return;
        }
        const node = this.mesh.getHighestNode();
        if (node) {
            while ((!this.options.maxHeight || this.blockWritePointer < this.options.maxHeight)
                && (this.blockWritePointer < node.blockHeight)
                && (this.queue.length() < this.options.maxQueueLength)) {
                this.increaseBlockWritePointer();
                this.enqueueStoreBlock(this.blockWritePointer, this.options.standardEnqueueBlockPriority);
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
                if (this.options.minHeight && height < this.options.minHeight) {
                    this.logger.info(`storage height is smaller than designated minHeight. BlockWritePointer will be set to minHeight [${this.options.minHeight}] instead.`);
                    this.blockWritePointer = this.options.minHeight;
                }
                else {
                    this.blockWritePointer = height;
                }
                resolve();
            })
                .catch((err) => {
                this.logger.warn('storage.getBlockCount() failed. Error:', err.message);
                this.logger.info('Assumed that there are no blocks.');
                this.blockWritePointer = this.options.minHeight;
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
        const startHeight = this.options.minHeight;
        const endHeight = (this.options.maxHeight && this.blockWritePointer > this.options.maxHeight) ? this.options.maxHeight : this.blockWritePointer;
        this.storage.analyzeBlocks(startHeight, endHeight)
            .then((res) => {
            let all = [];
            for (let i = startHeight; i <= endHeight; i++) {
                all.push(i);
            }
            const availableBlocks = lodash_1.map(res, (item) => item._id);
            this.logger.info('Blocks available count:', availableBlocks.length);
            const missingBlocks = lodash_1.difference(all, availableBlocks);
            this.logger.info('Blocks missing count:', missingBlocks.length);
            missingBlocks.forEach((height) => {
                this.enqueueStoreBlock(height, this.options.missingEnqueueStoreBlockPriority);
            });
            const excessiveBlocks = lodash_1.map(lodash_1.filter(res, (item) => item.count > this.options.blockRedundancy), (item) => item._id);
            this.logger.info('Blocks excessive redundancy count:', excessiveBlocks.length);
            if (this.options.blockRedundancy > 1) {
                let insufficientBlocks = lodash_1.map(lodash_1.filter(res, (item) => item.count < this.options.blockRedundancy), (item) => item._id);
                this.logger.info('Blocks insufficient redundancy count:', insufficientBlocks.length);
            }
        });
    }
    increaseBlockWritePointer() {
        this.logger.debug('increaseBlockWritePointer triggered.');
        this.blockWritePointer += 1;
    }
    enqueueStoreBlock(height, priority) {
        this.logger.debug('enqueueStoreBlock triggered. height:', height, 'priority:', priority);
        this.emit('enqueueStoreBlock:init', { height, priority });
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