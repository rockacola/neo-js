import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mesh } from './mesh'
import { MemoryStorage } from "../storages/memory-storage"
import { MongodbStorage } from "../storages/mongodb-storage"

const MODULE_NAME = 'Api'
const DEFAULT_OPTIONS: ApiOptions = {
  loggerOptions: {},
}

export interface ApiOptions {
  loggerOptions?: LoggerOptions,
}

export class Api extends EventEmitter {
  private mesh: Mesh
  private storage: MemoryStorage | MongodbStorage
  private options: ApiOptions
  private logger: Logger

  constructor(mesh: Mesh, storage: any, options: ApiOptions = {}) {
    super()

    // Associate required properties
    this.mesh = mesh
    this.storage = storage

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
  
    this.logger.debug('constructor completes.')
  }

  getBlockCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.storage.getBlockCount()
        .then((blockHeight) => resolve(blockHeight))
        .catch((err) => { // Failed to fetch from storage, try mesh instead
          const highestNode = this.mesh.getHighestNode()
          if (highestNode && highestNode.blockHeight) {
            return resolve(highestNode.blockHeight)
          } else {
            return reject(new Error('Edge case not implemented.'))
          }
        })
    })
  }
}
