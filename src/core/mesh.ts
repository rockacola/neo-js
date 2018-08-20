import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Node } from "./node"
import { RpcDelegate } from '../delegates/rpc-delegate'

const MODULE_NAME = 'Mesh'
const DEFAULT_OPTIONS: MeshOptions = {
  loggerOptions: {},
}

export interface MeshOptions {
  loggerOptions?: LoggerOptions,
}

export class Mesh extends EventEmitter {
  private nodes: Node[]
  private options: MeshOptions
  private logger: Logger

  constructor(nodes: Node[], options: MeshOptions = {}) {
    super()

    // Associate required properties
    this.nodes = nodes

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)

    this.logger.debug('constructor completes.')
  }
}
