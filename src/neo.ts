import { EventEmitter } from 'events'
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mesh, MeshOptions } from './core/mesh'
import { Node, NodeOptions } from './core/node'
import { Api, ApiOptions } from './core/api'
import { MemoryStorage, MemoryStorageOptions } from './storages/memory-storage'
import { MongodbStorage, MongodbStorageOptions } from './storages/mongodb-storage'
import { EndpointValidator } from './validators/endpoint-validator'
import profiles from './common/profiles'
import C from './common/constants'

const MODULE_NAME = 'Neo'
const DEFAULT_OPTIONS: NeoOptions = {
  network: C.network.testnet,
  storageType: C.storage.memory,
  loggerOptions: {},
}

export interface NeoOptions {
  network?: string,
  storageType?: string,
  endpoints?: object[],
  nodeOptions?: NodeOptions,
  meshOptions?: MeshOptions,
  storageOptions?: MemoryStorageOptions | MongodbStorageOptions,
  apiOptions?: ApiOptions,
  loggerOptions?: LoggerOptions,
}

export class Neo extends EventEmitter {
  public mesh: Mesh
  public storage: MemoryStorage | MongodbStorage
  public api: Api

  private options: NeoOptions
  private logger: Logger

  constructor(options: NeoOptions = {}) {
    super()

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
    this.mesh = this.getMesh()
    this.storage = this.getStorage()
    this.api = this.getApi()

    this.logger.debug('constructor completes.')
  }

  static get VERSION(): string {
    return profiles.version
  }

  get VERSION(): string {
    return profiles.version
  }

  private getMesh(): Mesh {
    this.logger.debug('getMesh triggered.')
    const nodes = this.getNodes()
    return new Mesh(nodes, this.options.meshOptions)
  }

  private getStorage(): MemoryStorage | MongodbStorage {
    this.logger.debug('getStorage triggered.')
    if (this.options.storageType === C.storage.memory) {
      return new MemoryStorage(this.options.storageOptions)
    } else if (this.options.storageType === C.storage.mongodb) {
      return new MongodbStorage(this.options.storageOptions)
    } else {
      throw new Error(`Unknown storageType [${this.options.storageType}]`)
    }
  }

  private getApi(): Api {
    this.logger.debug('getApi triggered.')
    return new Api(this.mesh, this.storage, this.options.apiOptions)
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
      const node = new Node((<any> item).endpoint, this.options.nodeOptions)
      nodes.push(node)
    })

    return nodes
  }
}
