import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { RpcDelegate } from '../delegates/rpc-delegate'

const MODULE_NAME = 'Node'
const DEFAULT_OPTIONS: NodeOptions = {
  loggerOptions: {},
}

export interface NodeOptions {
  loggerOptions?: LoggerOptions,
}

export class Node extends EventEmitter {
  private endpoint: string
  private options: NodeOptions
  private logger: Logger

  constructor(endpoint: string, options: NodeOptions = {}) {
    super()

    // Associate required properties
    this.endpoint = endpoint

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)

    this.logger.debug('constructor completes.')
  }

  getBlock(height: number, isVerbose: boolean = true): Promise<object> {
    return RpcDelegate.getBlock(this.endpoint, height, isVerbose)
  }

  getBlockCount(): Promise<object> {
    return RpcDelegate.getBlockCount(this.endpoint)
  }

  getVersion(): Promise<object> {
    return RpcDelegate.getVersion(this.endpoint)
  }
}
