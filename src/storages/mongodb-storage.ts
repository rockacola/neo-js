import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'

const MODULE_NAME = 'MongodbStorage'
const DEFAULT_OPTIONS: MongodbStorageOptions = {
  loggerOptions: {},
}

export interface MongodbStorageOptions {
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
  
    this.logger.debug('constructor completes.')
  }

  isReady(): boolean {
    return this._isReady
  }
}
