"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const node_log_it_1 = require("node-log-it");
const lodash_1 = require("lodash");
const mongoose_1 = require("mongoose");
const mongoose = new mongoose_1.Mongoose();
mongoose.Promise = global.Promise;
const MODULE_NAME = 'MongodbStorage';
const DEFAULT_OPTIONS = {
    connectOnInit: true,
    userAgent: 'Unknown',
    collectionNames: {
        blocks: 'blocks',
        transactions: 'transactions',
        assets: 'assets',
    },
    loggerOptions: {},
};
class MongodbStorage extends events_1.EventEmitter {
    constructor(options = {}) {
        super();
        this._isReady = false;
        this.options = lodash_1.merge({}, DEFAULT_OPTIONS, options);
        this.logger = new node_log_it_1.Logger(MODULE_NAME, this.options.loggerOptions);
        this.blockModel = this.getBlockModel();
        this.initConnection();
        this.logger.debug('constructor completes.');
    }
    isReady() {
        return this._isReady;
    }
    getBlockModel() {
        const schema = new mongoose_1.Schema({
            height: Number,
            createdBy: String,
            source: String,
            payload: {
                hash: String,
                size: Number,
                version: Number,
                previousblockhash: String,
                merkleroot: String,
                time: Number,
                index: { type: 'Number', required: true },
                nonce: String,
                nextconsensus: String,
                script: {
                    invocation: String,
                    verification: String
                },
                tx: [],
                confirmations: Number,
                nextblockhash: String
            },
        }, { timestamps: true });
        return mongoose.models[this.options.collectionNames.blocks] || mongoose.model(this.options.collectionNames.blocks, schema);
    }
    initConnection() {
        if (this.options.connectOnInit) {
            this.logger.debug('initConnection triggered.');
            mongoose.connect(this.options.connectionString, { useMongoClient: true })
                .then(() => {
                this.setReady();
                this.logger.info('mongoose connected.');
            })
                .catch((err) => {
                this.logger.error('Error establish MongoDB connection.');
                throw err;
            });
        }
    }
    setReady() {
        this._isReady = true;
        this.emit('ready');
    }
    getBlockCount() {
        this.logger.debug('getBlockCount triggered.');
        return new Promise((resolve, reject) => {
            this.blockModel.findOne({}, 'height')
                .sort({ height: -1 })
                .exec((err, res) => {
                if (err) {
                    this.logger.warn('blockModel.findOne() execution failed.');
                    return reject(err);
                }
                if (!res) {
                    this.logger.info('blockModel.findOne() executed by without response data, hence no blocks available.');
                    return resolve(0);
                }
                return resolve(res.height);
            });
        });
    }
    setBlockCount(blockHeight) {
        throw new Error('Not implemented.');
    }
    getBlock(height) {
        this.logger.debug('getBlock triggered. height:', height);
        return new Promise((resolve, reject) => {
            this.blockModel.findOne({ height })
                .exec((err, res) => {
                if (err) {
                    this.logger.warn('blockModel.findOne() execution failed. error:', err.message);
                    return reject(err);
                }
                if (!res || !res.payload) {
                    return reject(new Error('No result found.'));
                }
                return resolve(res.payload);
            });
        });
    }
    setBlock(height, block, source) {
        this.logger.debug('setBlock triggered.');
        const data = {
            height,
            source,
            createdBy: this.options.userAgent,
            payload: block,
        };
        return new Promise((resolve, reject) => {
            this.blockModel(data).save((err) => {
                if (err) {
                    this.logger.warn('blockModel().save() execution failed.');
                    reject(err);
                }
                resolve();
            });
        });
    }
    analyzeBlocks(startHeight, endHeight) {
        this.logger.debug('analyzeBlockHeight triggered.');
        return new Promise((resolve, reject) => {
            const aggregatorOptions = [
                {
                    $group: {
                        _id: '$height',
                        count: { $sum: 1 },
                    },
                },
                {
                    $match: {
                        _id: {
                            $gte: startHeight,
                            $lte: endHeight,
                        },
                    },
                },
            ];
            this.blockModel.aggregate(aggregatorOptions, (err, res) => {
                if (err) {
                    return reject(err);
                }
                return resolve(res);
            });
        });
    }
    disconnect() {
        this.logger.debug('disconnect triggered.');
        return mongoose.disconnect();
    }
}
exports.MongodbStorage = MongodbStorage;
//# sourceMappingURL=mongodb-storage.js.map