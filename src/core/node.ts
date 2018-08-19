import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { RpcDelegate } from '../delegates/rpc-delegate'

interface Options {
  loggerOptions?: LoggerOptions,
}

const MODULE_NAME = 'Node'
const DEFAULT_OPTIONS: Options = {
  loggerOptions: {},
}

export class Node extends EventEmitter {
  private options: Options
  private logger: Logger

  constructor(options = {}) {
    super()

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)

    this.logger.debug('constructor completes.')
  }
}
