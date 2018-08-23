import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mesh } from './mesh'
import { MemoryStorage } from "../storages/memory-storage"
import { MongodbStorage } from "../storages/mongodb-storage"
import C from '../common/constants'

const MODULE_NAME = 'Api'
const DEFAULT_OPTIONS: ApiOptions = {
  loggerOptions: {},
}

export interface ApiOptions {
  loggerOptions?: LoggerOptions,
}

interface StorageInsertPayload {
  method: string,
  result: any,
}

export class Api extends EventEmitter {
  private mesh: Mesh
  private storage?: MemoryStorage | MongodbStorage
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
  
    // Event handlers
    this.on('storage:insert', this.storageInsertHandler.bind(this))

    this.logger.debug('constructor completes.')
  }
  
  private storageInsertHandler(payload: StorageInsertPayload) {
    this.logger.debug('storageInsertHandler triggered.')
    if (this.storage) {
      if (payload.method === C.rpc.getblockcount) {
        const blockHeight = <number> payload.result
        this.storage.setBlockCount(blockHeight)
      } else {
        throw new Error('Not implemented.')
      }
    }
  }

  getBlockCount(): Promise<number> {
    this.logger.debug('getBlockCount triggered.')
    if(!this.storage) {
      this.logger.debug('No storage delegate detected.')
      return this.getBlockCountFromMesh()
    }

    return new Promise((resolve, reject) => {
      this.storage!.getBlockCount()
        .then((blockHeight) => resolve(blockHeight))
        .catch((err) => { // Failed to fetch from storage, try mesh instead
          this.logger.debug('Cannot find result from storage delegate, attempt to fetch from mesh instead...')
          this.getBlockCountFromMesh()
            .then((res) => {
              this.logger.debug('Successfully fetch result from mesh.')
              this.emit('storage:insert', { method: C.rpc.getblockcount, result: res})
              resolve(res)
            })
            .catch((err2) => reject(err2))
        })
    })
  }

  private getBlockCountFromMesh(): Promise<number> {
    this.logger.debug('getBlockCountFromMesh triggered.')
    // TODO: check if mesh is ready
    const highestNode = this.mesh.getHighestNode()
    if (highestNode && highestNode.blockHeight) {
      return Promise.resolve(highestNode.blockHeight)
    } else {
      return Promise.reject(new Error('Edge case not implemented.'))
    }
  }
}
