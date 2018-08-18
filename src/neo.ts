import { EventEmitter } from 'events'
import { Logger, LoggerOptions } from 'node-log-it'
import { assign } from 'lodash'

interface Options {
  network?: string,
  loggerOptions?: LoggerOptions,
}

class Neo extends EventEmitter {
  private options: Options
  private logger: Logger

  constructor(options = {}) {
    super()

    // Associate optional properties
    this.options = {
      network: 'testnet',
      loggerOptions: {},
    }
    assign(this.options, options)

    // Bootstrapping
    this.logger = new Logger('Neo', this.options.loggerOptions)

    this.logger.debug('constructor completes.')
  }
}

export default Neo
