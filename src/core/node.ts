import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { RpcDelegate } from "../delegates/rpc-delegate"
import C from '../common/constants'

const MODULE_NAME = 'Node'
const DEFAULT_ID = 0
const DEFAULT_OPTIONS: NodeOptions = {
  toBenchmark: true,
  loggerOptions: {},
}

export interface NodeOptions {
  toBenchmark?: boolean,
  loggerOptions?: LoggerOptions,
}

export class Node extends EventEmitter {
  public isActive: boolean | undefined
  public pendingRequests: number | undefined
  public latency: number | undefined // In milliseconds
  public blockHeight: number | undefined
  public lastSeenTimestamp: number | undefined

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

    // Event handlers
    this.on('query:init', this.queryInitHandler.bind(this))
    this.on('query:success', this.querySuccessHandler.bind(this))
    this.on('query:failed', this.queryFailedHandler.bind(this))

    this.logger.debug('constructor completes.')
  }

  private queryInitHandler(payload: object) {
    this.logger.debug('queryInitHandler triggered.')
    if (this.options.toBenchmark) {
      this.increasePendingRequest()
    }
  }

  private querySuccessHandler(payload: object) {
    this.logger.debug('querySuccessHandler triggered.')
    if (this.options.toBenchmark) {
      this.decreasePendingRequest()
      this.lastSeenTimestamp = Date.now()
      this.isActive = true
      if ((<any> payload).latency) {
        this.latency = (<any> payload).latency
      }
      if ((<any> payload).blockHeight) {
        this.blockHeight = (<any> payload).blockHeight
      }
    }
  }

  private queryFailedHandler(payload: object) {
    this.logger.debug('queryFailedHandler triggered.')
    if (this.options.toBenchmark) {
      this.decreasePendingRequest()
      this.lastSeenTimestamp = Date.now()
      this.isActive = false
    }
  }

  getBlock(height: number, isVerbose: boolean = true): Promise<object> {
    this.logger.debug('getBlock triggered.')
    const verboseKey: number = isVerbose ? 1 : 0
    return this.query(C.rpc.getblock, [height, verboseKey])
  }

  getBlockCount(): Promise<object> {
    this.logger.debug('getBlockCount triggered.')
    return this.query(C.rpc.getblockcount)
  }

  getVersion(): Promise<object> {
    this.logger.debug('getVersion triggered.')
    return this.query(C.rpc.getversion)
  }

  private query(method: string, params: any[] = [], id: number = DEFAULT_ID): Promise<object> {
    this.logger.debug('query triggered. method:', method)
    this.emit('query:init', { method, params, id })
    const t0 = Date.now()
    return new Promise((resolve, reject) => {
      RpcDelegate.query(this.endpoint, method, params, id)
        .then((res) => {
          const latency = Date.now() - t0
          const blockHeight = (method === C.rpc.getblockcount) ? (<any> res).result : undefined
          this.emit('query:success', { method, latency, blockHeight })
          return resolve(res)
        })
        .catch((err) => {
          this.emit('query:failed', { method, error: err })
          return reject(err)
        })
    })
  }

  private increasePendingRequest() {
    this.logger.debug('increasePendingRequest triggered.')
    if (!this.pendingRequests) {
      this.pendingRequests = 1
    } else {
      this.pendingRequests += 1
    }
  }

  private decreasePendingRequest() {
    this.logger.debug('decreasePendingRequest triggered.')
    if (!this.pendingRequests) {
      this.pendingRequests = 0
    } else {
      this.pendingRequests -= 1
    }
  }
}
