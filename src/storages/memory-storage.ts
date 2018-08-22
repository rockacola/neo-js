import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'

const MODULE_NAME = 'MemoryStorage'
const DEFAULT_OPTIONS: MemoryStorageOptions = {
  loggerOptions: {},
}

export interface MemoryStorageOptions {
  loggerOptions?: LoggerOptions,
}

export class MemoryStorage extends EventEmitter {
  private _isReady = false
  private options: MemoryStorageOptions
  private logger: Logger

  constructor(options: MemoryStorageOptions = {}) {
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
