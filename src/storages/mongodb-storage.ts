import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mongoose } from "mongoose"
const mongoose = new Mongoose()
mongoose.Promise = global.Promise // Explicitly supply promise library (http://mongoosejs.com/docs/promises.html)

const MODULE_NAME = 'MongodbStorage'
const DEFAULT_OPTIONS: MongodbStorageOptions = {
  connectOnInit: true,
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
  collectionNames?: {
    blocks?: string,
    transactions?: string,
    assets?: string,
  },
  loggerOptions?: LoggerOptions,
}

export class MongodbStorage extends EventEmitter {
  private _isReady = false
  private options: MongodbStorageOptions
  private logger: Logger

  constructor(options: MongodbStorageOptions = {}) {
    super()

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
    // TODO: init models
    this.initConnection()
    this.logger.debug('mongoose:', mongoose)

    this.logger.debug('constructor completes.')
  }

  isReady(): boolean {
    return this._isReady
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
    throw new Error('Not implemented.')
  }

  setBlockCount(blockHeight: number) {
    throw new Error('Not implemented.')
  }

  getBlock(blockHeight: number): Promise<object> {
    throw new Error('Not implemented.')
  }

  setBlock(height: number, block: object): Promise<void> {
    throw new Error('Not implemented.')
  }
}
