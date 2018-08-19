import { EventEmitter } from 'events'
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'

interface Options {
  network?: string,
  loggerOptions?: LoggerOptions,
}

const DEFAULT_OPTIONS = {
  network: 'testnet',
  loggerOptions: {},
}

export class Neo extends EventEmitter {
  private options: Options
  private logger: Logger

  constructor(options = {}) {
    super()

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger('Neo', this.options.loggerOptions)

    this.logger.debug('constructor completes.')
  }
}
