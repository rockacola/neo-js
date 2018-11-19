import { EventEmitter } from 'events'
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mesh } from './mesh'
import { NodeMeta } from './node'
import { MemoryStorage } from '../storages/memory-storage'
import { MongodbStorage } from '../storages/mongodb-storage'
import C from '../common/constants'
import { NeoValidator } from '../validators/neo-validator'

const MODULE_NAME = 'Api'
const DEFAULT_OPTIONS: ApiOptions = {
  loggerOptions: {},
}

export interface ApiOptions {
  loggerOptions?: LoggerOptions
}

interface StorageInsertPayload {
  method: string
  nodeMeta: NodeMeta | undefined
  result: any
}

export class Api extends EventEmitter {
  private mesh: Mesh
  private storage?: MemoryStorage | MongodbStorage
  private options: ApiOptions
  private logger: Logger

  constructor(mesh: Mesh, storage?: MemoryStorage | MongodbStorage, options: ApiOptions = {}) {
    super()

    // Associate required properties
    this.mesh = mesh
    this.storage = storage

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)
    this.validateOptionalParameters()

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)

    // Event handlers
    this.on('storage:insert', this.storageInsertHandler.bind(this))

    this.logger.debug('constructor completes.')
  }

  getBlockCount(): Promise<number> {
    this.logger.debug('getBlockCount triggered.')
    if (!this.storage) {
      this.logger.debug('No storage delegate detected.')
      return this.getBlockCountFromMesh()
    }

    return new Promise((resolve, reject) => {
      this.storage!.getBlockCount()
        .then((blockHeight) => resolve(blockHeight))
        .catch((err) => {
          // Failed to fetch from storage, try mesh instead
          this.logger.debug('Cannot find result from storage delegate, attempt to fetch from mesh instead...')
          this.getBlockCountFromMesh()
            .then((res) => {
              this.logger.debug('Successfully fetch result from mesh.')
              this.emit('storage:insert', { method: C.rpc.getblockcount, result: res })
              resolve(res)
            })
            .catch((err2) => reject(err2))
        })
    })
  }

  getBlock(height: number): Promise<object> {
    this.logger.debug('getBlock triggered. height:', height)

    NeoValidator.validateHeight(height)

    if (!this.storage) {
      this.logger.debug('No storage delegate detected.')
      return this.getBlockFromMesh(height)
    }

    return new Promise((resolve, reject) => {
      this.storage!.getBlock(height)
        .then((block: object) => resolve(block))
        .catch((err: any) => {
          // Failed to fetch from storage, try mesh instead
          this.logger.debug('Cannot find result from storage delegate. Error:', err.message)
          this.logger.debug('Attempt to fetch from mesh instead...')
          this.getBlockAndNodeMetaFromMesh(height)
            .then((res: any) => {
              this.logger.debug('Successfully fetch result from mesh.')
              const { block, nodeMeta } = res
              this.emit('storage:insert', { method: C.rpc.getblock, result: { height, block }, nodeMeta })
              return resolve(block)
            })
            .catch((err2: any) => reject(err2))
        })
    })
  }

  private storageInsertHandler(payload: StorageInsertPayload) {
    this.logger.debug('storageInsertHandler triggered.')
    if (payload.method === C.rpc.getblockcount) {
      this.storeBlockCount(payload)
    } else if (payload.method === C.rpc.getblock) {
      this.storeBlock(payload)
    } else {
      throw new Error('Not implemented.')
    }
  }

  private validateOptionalParameters() {
    // TODO
  }

  private storeBlockCount(payload: StorageInsertPayload) {
    if (this.storage) {
      const blockHeight = payload.result as number
      this.storage.setBlockCount(blockHeight)
    }
  }

  private storeBlock(payload: StorageInsertPayload) {
    if (this.storage) {
      const height = payload.result.height as number
      const block = payload.result.block as object
      const source = payload.nodeMeta ? payload.nodeMeta.endpoint : 'api:storeBlock'
      this.storage.setBlock(height, block, { source })
    }
  }

  private getBlockCountFromMesh(): Promise<number> {
    this.logger.debug('getBlockCountFromMesh triggered.')
    const highestNode = this.mesh.getHighestNode()
    if (highestNode && highestNode.blockHeight) {
      return Promise.resolve(highestNode.blockHeight)
    } else {
      // TODO
      return Promise.reject(new Error('Edge case not implemented.'))
    }
  }

  private getBlockFromMesh(height: number): Promise<object> {
    this.logger.debug('getBlockFromMesh triggered.')
    return new Promise((resolve, reject) => {
      this.getBlockAndNodeMetaFromMesh(height)
        .then((res: any) => {
          const { block } = res
          return resolve(block)
        })
        .catch((err: any) => reject(err))
    })
  }

  private getBlockAndNodeMetaFromMesh(height: number): Promise<object> {
    this.logger.debug('getBlockAndNodeMetaFromMesh triggered.')
    const highestNode = this.mesh.getHighestNode()
    if (highestNode && highestNode.blockHeight) {
      const nodeMeta = highestNode.getNodeMeta()
      return new Promise((resolve, reject) => {
        highestNode
          .getBlock(height)
          .then((block: object) => {
            return resolve({ block, nodeMeta })
          })
          .catch((err: any) => reject(err))
      })
    } else {
      // TODO
      return Promise.reject(new Error('Edge case not implemented.'))
    }
  }
}
