import { EventEmitter } from 'events'
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mesh, MeshOptions } from './core/mesh'
import { Node } from './core/node'
import { EndpointValidator } from './validators/endpoint-validator'
import profiles from './common/profiles'
import C from './common/constants'

const MODULE_NAME = 'Neo'
const DEFAULT_OPTIONS: NeoOptions = {
  network: C.network.testnet,
  loggerOptions: {},
}

export interface NeoOptions {
  network?: string,
  endpoints?: object[],
  meshOptions?: MeshOptions,
  loggerOptions?: LoggerOptions,
}

export class Neo extends EventEmitter {
  private options: NeoOptions
  private logger: Logger
  public mesh: Mesh

  constructor(options: NeoOptions = {}) {
    super()

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
    this.mesh = this.getMesh()

    this.logger.debug('constructor completes.')
  }

  private getMesh() {
    this.logger.debug('getMesh triggered.')
    const nodes = this.getNodes()
    return new Mesh(nodes, this.options.meshOptions)
  }

  private getNodes(): Node[] {
    this.logger.debug('getNodes triggered.')
    // Fetch endpoints
    let endpoints: object[] = []
    if (this.options.endpoints) {
      EndpointValidator.validateArray(this.options.endpoints)
      endpoints = this.options.endpoints
    } else if (this.options.network === C.network.testnet) {
      endpoints = profiles.rpc.testnet
    } else if (this.options.network === C.network.mainnet) {
      endpoints = profiles.rpc.mainnet
    } else {
      throw new Error('Invalid network or provided endpoints.')
    }

    // Instantiate nodes
    let nodes: Node[] = []
    endpoints.forEach((item) => {
      const node = new Node((<any> item).endpoint)
      nodes.push(node)
    })

    return nodes
  }
}
