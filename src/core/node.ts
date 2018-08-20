import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { RpcDelegate } from "../delegates/rpc-delegate"

const MODULE_NAME = 'Node'
const DEFAULT_ID = 0
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
    this.logger.debug('getBlock triggered.')
    const verboseKey: number = isVerbose ? 1 : 0
    return this.query('getblock', [height, verboseKey])
  }

  getBlockCount(): Promise<object> {
    this.logger.debug('getBlockCount triggered.')
    return this.query('getblockcount')
  }

  getVersion(): Promise<object> {
    this.logger.debug('getVersion triggered.')
    return this.query('getversion')
  }

  private query(method: string, params: any[] = [], id: number = DEFAULT_ID): Promise<object> {
    this.logger.debug('query triggered. method:', method)
    return new Promise((resolve, reject) => {
      RpcDelegate.query(this.endpoint, method, params, id)
        .then((res) => {
          return resolve(res)
        })
        .catch((err) => {
          return reject(err)
        })
    })
  }
}
