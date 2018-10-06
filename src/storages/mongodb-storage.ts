import { EventEmitter } from 'events'
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mongoose, Schema } from 'mongoose'
const mongoose = new Mongoose()
mongoose.Promise = global.Promise // Explicitly supply promise library (http://mongoosejs.com/docs/promises.html)

const MODULE_NAME = 'MongodbStorage'
const DEFAULT_OPTIONS: MongodbStorageOptions = {
  connectOnInit: true,
  userAgent: 'Unknown',
  collectionNames: {
    blocks: 'blocks',
    transactions: 'transactions',
    assets: 'assets',
  },
  loggerOptions: {},
}

export interface MongodbStorageOptions {
  connectOnInit?: boolean,
  connectionString?: string,
  userAgent?: string,
  collectionNames?: {
    blocks?: string,
    transactions?: string,
    assets?: string,
  },
  loggerOptions?: LoggerOptions,
}

export class MongodbStorage extends EventEmitter {
  private _isReady = false
  private blockModel: any
  private options: MongodbStorageOptions
  private logger: Logger

  constructor(options: MongodbStorageOptions = {}) {
    super()

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
    this.blockModel = this.getBlockModel()
    this.initConnection()

    this.logger.debug('constructor completes.')
  }

  isReady(): boolean {
    return this._isReady
  }

  private getBlockModel() {
    const schema = new Schema({
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
    }, { timestamps: true })

    return mongoose.models[this.options.collectionNames!.blocks!] || mongoose.model(this.options.collectionNames!.blocks!, schema)
  }

  private initConnection() {
    if (this.options.connectOnInit) {
      this.logger.debug('initConnection triggered.')
      // TODO: valid connection string

      mongoose.connect(this.options.connectionString!, { useMongoClient: true })
        .then(() => {
          this.setReady()
          this.logger.info('mongoose connected.')
        })
        .catch((err: any) => {
          this.logger.error('Error establish MongoDB connection.')
          throw err
        })
    }
  }

  private setReady() {
    this._isReady = true
    this.emit('ready')
  }

  getBlockCount(): Promise<number> {
    this.logger.debug('getBlockCount triggered.')
    return new Promise((resolve, reject) => {
      this.blockModel.findOne({}, 'height')
        .sort({ height: -1 })
        .exec((err: any, res: any) => {
          if (err) {
            this.logger.warn('blockModel.findOne() execution failed.')
            return reject(err)
          }
          if (!res) {
            this.logger.info('blockModel.findOne() executed by without response data, hence no blocks available.')
            return resolve(0)
          }
          return resolve(res.height)
        })
    })
  }

  setBlockCount(blockHeight: number): Promise<void> {
    throw new Error('Not implemented.')
  }

  getBlock(height: number): Promise<object> {
    this.logger.debug('getBlock triggered. height:', height)

    return new Promise((resolve, reject) => {
      this.blockModel.findOne({ height })
        .exec((err: any, res: any) => {
          if (err) {
            this.logger.warn('blockModel.findOne() execution failed. error:', err.message)
            return reject(err)
          }
          if (!res || !res.payload) {
            return reject(new Error('No result found.'))
          }
          return resolve(res.payload)
        })
    })
  }

  setBlock(height: number, block: object, source: string): Promise<void> {
    this.logger.debug('setBlock triggered.')

    const data = {
      height,
      source,
      createdBy: this.options.userAgent,
      payload: block,
    }
    return new Promise((resolve, reject) => {
      this.blockModel(data).save((err: any) => {
        if (err) {
          this.logger.warn('blockModel().save() execution failed.')
          reject(err)
        }
        resolve()
      })
    })
  }

  analyzeBlocks(startHeight: number, endHeight: number): Promise<object[]> {
    this.logger.debug('analyzeBlockHeight triggered.')
    /**
     * Example result:
     * [
     *   { _id: 1, count: 1 },
     *   { _id: 2, count: 4 },
     *   ...
     * ]
     */
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
            _id: { // This '_id' is now referring to $height as designated in $group
              $gte: startHeight,
              $lte: endHeight,
            },
          },
        },
      ]

      this.blockModel.aggregate(aggregatorOptions, (err: Error, res: any) => {
        if (err) {
          return reject(err)
        }

        return resolve(res)
      })
    })
  }

  disconnect(): Promise<void> {
    this.logger.debug('disconnect triggered.')
    return mongoose.disconnect()
  }
}
