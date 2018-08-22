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
  private _blockHeight?: number
  private options: MemoryStorageOptions
  private logger: Logger

  constructor(options: MemoryStorageOptions = {}) {
    super()

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
    this._isReady = true

    this.logger.debug('constructor completes.')
  }

  isReady(): boolean {
    return this._isReady
  }

  getBlockCount(): Promise<number> {
    if (this._blockHeight) {
      return Promise.resolve(this._blockHeight)
    } else {
      return Promise.reject(new Error('blockHeight unavailable'))
    }
  }

  setBlockCount(blockHeight: number) {
    this._blockHeight = blockHeight
  }
}
