import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mesh } from './mesh'

const MODULE_NAME = 'Api'
const DEFAULT_OPTIONS: ApiOptions = {
  loggerOptions: {},
}

export interface ApiOptions {
  loggerOptions?: LoggerOptions,
}

export class Api extends EventEmitter {
  private mesh: Mesh
  private options: ApiOptions
  private logger: Logger

  constructor(mesh: Mesh, options: ApiOptions = {}) {
    super()

    // Associate required properties
    this.mesh = mesh

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
  
    this.logger.debug('constructor completes.')
  }

  getBlockCount(): Promise<number> {
    const highestNode = this.mesh.getHighestNode()
    if (highestNode) {
      return Promise.resolve(<number> highestNode.blockHeight)
    } else {
      throw new Error('Edge case not implemented.')
    }
  }
}
