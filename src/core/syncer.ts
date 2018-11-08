import { EventEmitter } from 'events'
import { priorityQueue } from 'async'
import { Logger, LoggerOptions } from 'node-log-it'
import { merge, map, difference, filter, take } from 'lodash'
import { Node } from './node'
import { Mesh } from './mesh'
import { MemoryStorage } from '../storages/memory-storage'
import { MongodbStorage } from '../storages/mongodb-storage'

// import C from '../common/constants'

const MODULE_NAME = 'Syncer'
const DEFAULT_OPTIONS: SyncerOptions = {
  minHeight: 1,
  maxHeight: undefined,
  blockRedundancy: 1, // If value is greater than 1, than it'll keep multiple copies of same block as integrity measurement // TODO: to ensure redundant blocks are coming from unique sources
  startOnInit: true,
  toSyncIncremental: true,
  toSyncForMissingBlocks: true,
  toPruneRedundantBlocks: false,
  workerCount: 30,
  enqueueBlockIntervalMs: 2000,
  verifyBlocksIntervalMs: 1 * 60 * 1000,
  maxQueueLength: 10000,
  retryEnqueueDelayMs: 2000,
  standardEnqueueBlockPriority: 5,
  retryEnqueueBlockPriority: 3,
  missingEnqueueStoreBlockPriority: 1,
  enqueuePruneBlockPriority: 2,
  maxPruneChunkSize: 1000,
  loggerOptions: {},
}

export interface SyncerOptions {
  minHeight?: number
  maxHeight?: number
  blockRedundancy?: number
  startOnInit?: boolean
  toSyncIncremental?: boolean
  toSyncForMissingBlocks?: boolean
  toPruneRedundantBlocks?: boolean
  workerCount?: number
  enqueueBlockIntervalMs?: number
  verifyBlocksIntervalMs?: number
  maxQueueLength?: number
  retryEnqueueDelayMs?: number
  standardEnqueueBlockPriority?: number
  retryEnqueueBlockPriority?: number
  missingEnqueueStoreBlockPriority?: number
  enqueuePruneBlockPriority?: number
  maxPruneChunkSize?: number
  loggerOptions?: LoggerOptions
}

export class Syncer extends EventEmitter {
  private _isRunning = false
  private queue: any
  private blockWritePointer: number = 0
  private mesh: Mesh
  private storage?: MemoryStorage | MongodbStorage
  private options: SyncerOptions
  private logger: Logger
  private enqueueStoreBlockIntervalId?: NodeJS.Timer
  private blockVerificationIntervalId?: NodeJS.Timer

  constructor(mesh: Mesh, storage?: MemoryStorage | MongodbStorage, options: SyncerOptions = {}) {
    super()

    // Associate required properties
    this.mesh = mesh
    this.storage = storage

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)
    this.validateOptionalParameters()

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
    this.queue = this.getPriorityQueue()
    if (this.options.startOnInit) {
      this.start()
    }

    // Event handlers
    this.on('storeBlock:complete', this.storeBlockCompleteHandler.bind(this))

    this.logger.debug('constructor completes.')
  }

  isRunning(): boolean {
    return this._isRunning
  }

  start() {
    if (this._isRunning) {
      this.logger.info('Syncer has already started.')
      return
    }

    this.logger.info('Start syncer. minHeight:', this.options.minHeight!, 'maxHeight:', this.options.maxHeight)
    this._isRunning = true
    this.emit('start')

    this.initStoreBlock()
    this.initBlockVerification()
  }

  stop() {
    if (!this._isRunning) {
      this.logger.info('Syncer is not running at the moment.')
      return
    }

    this.logger.info('Stop syncer.')
    this._isRunning = false
    this.emit('stop')

    clearInterval(this.enqueueStoreBlockIntervalId!)
    clearInterval(this.blockVerificationIntervalId!)
  }

  private storeBlockCompleteHandler(payload: any) {
    if (payload.isSuccess === false) {
      this.logger.debug('storeBlockCompleteHandler !isSuccess triggered.')
      setTimeout(() => {
        // Re-queue the method when failed after an injected delay
        this.enqueueStoreBlock(payload.height, this.options.retryEnqueueBlockPriority!)
      }, this.options.retryEnqueueDelayMs!)
    }
  }

  private validateOptionalParameters() {
    if (!this.options.blockRedundancy) {
      throw new Error('blockRedundancy parameter must be supplied.')
    } else if (this.options.blockRedundancy !== 1) {
      throw new Error('supplied blockRedundancy parameter is invalid. Currently only supports for value [1].')
    }
  }

  private getPriorityQueue(): any {
    /**
     * @param {object} task
     * @param {string} task.method
     * @param {object} task.attrs
     * @param {function} callback
     */
    return priorityQueue((task: object, callback: () => void) => {
      const method: (attrs: object) => Promise<any> = (<any>task).method
      const attrs: object = (<any>task).attrs
      this.logger.debug('new worker for queue.')

      method(attrs)
        .then(() => {
          callback()
          this.logger.debug('queued method run completed.')
          this.emit('sync:complete', { isSuccess: true, task })
        })
        .catch((err: any) => {
          this.logger.info('Task execution error, but to continue... attrs:', attrs)
          // this.logger.info('Error:', err)
          callback()
          this.emit('sync:complete', { isSuccess: false, task })
        })
    }, this.options.workerCount!)
  }

  private initStoreBlock() {
    this.logger.debug('initStoreBlock triggered.')
    this.setBlockWritePointer()
      .then(() => {
        if (this.options.toSyncIncremental) {
          // Enqueue blocks for download periodically
          this.enqueueStoreBlockIntervalId = setInterval(() => {
            this.doEnqueueStoreBlock()
          }, this.options.enqueueBlockIntervalMs!)
        }
      })
      .catch((err: any) => {
        this.logger.warn('storage.getBlockCount() failed. Error:', err.message)
      })
  }

  private doEnqueueStoreBlock() {
    this.logger.debug('doEnqueueStoreBlock triggered.')

    if (this.isReachedMaxHeight()) {
      this.logger.info(`BlockWritePointer is greater or equal to designated maxHeight [${this.options.maxHeight}]. There will be no enqueue block beyond this point.`)
      return
    }

    const node = this.mesh.getHighestNode()
    if (node) {
      // TODO: better way to validate a node
      // TODO: undefined param handler
      while (!this.isReachedMaxHeight() && !this.isReachedHighestBlock(node) && !this.isReachedMaxQueueLength()) {
        this.increaseBlockWritePointer()
        this.enqueueStoreBlock(this.blockWritePointer!, this.options.standardEnqueueBlockPriority!)
      }
    } else {
      this.logger.error('Unable to find a valid node.')
    }
  }

  private isReachedMaxHeight(): boolean {
    return !!(this.options.maxHeight && this.blockWritePointer >= this.options.maxHeight)
  }

  private isReachedHighestBlock(node: Node): boolean {
    return this.blockWritePointer! >= node.blockHeight!
  }

  private isReachedMaxQueueLength(): boolean {
    return this.queue.length() >= this.options.maxQueueLength!
  }

  private setBlockWritePointer(): Promise<void> {
    this.logger.debug('setBlockWritePointer triggered.')
    return new Promise((resolve, reject) => {
      this.storage!.getBlockCount()
        .then((height: number) => {
          this.logger.debug('getBlockCount success. height:', height)
          if (this.options.minHeight && height < this.options.minHeight) {
            this.logger.info(`storage height is smaller than designated minHeight. BlockWritePointer will be set to minHeight [${this.options.minHeight}] instead.`)
            this.blockWritePointer = this.options.minHeight
          } else {
            this.blockWritePointer = height
          }
          resolve()
        })
        .catch((err: any) => {
          this.logger.warn('storage.getBlockCount() failed. Error:', err.message)
          this.logger.info('Assumed that there are no blocks.')
          this.blockWritePointer = this.options.minHeight!
          resolve()
        })
    })
  }

  private initBlockVerification() {
    this.logger.debug('initEnqueueBlock triggered.')
    this.blockVerificationIntervalId = setInterval(() => {
      this.doBlockVerification()
    }, this.options.verifyBlocksIntervalMs!)
  }

  private doBlockVerification() {
    this.logger.debug('doBlockVerification triggered.')
    this.emit('blockVerification:init')
    const startHeight = this.options.minHeight!
    const endHeight = this.options.maxHeight && this.blockWritePointer > this.options.maxHeight ? this.options.maxHeight : this.blockWritePointer

    this.storage!.analyzeBlocks(startHeight, endHeight)
      .then((res: object[]) => {
        const all: number[] = []
        for (let i = startHeight; i <= endHeight; i++) {
          all.push(i)
        }

        const availableBlocks: number[] = map(res, (item: any) => item._id)
        this.logger.info('Blocks available count:', availableBlocks.length)

        // Enqueue missing block heights
        const missingBlocks = difference(all, availableBlocks)
        this.logger.info('Blocks missing count:', missingBlocks.length)
        this.emit('blockVerification:missingBlocks', { count: missingBlocks.length })
        if (this.options.toSyncForMissingBlocks) {
          missingBlocks.forEach((height: number) => {
            this.enqueueStoreBlock(height, this.options.missingEnqueueStoreBlockPriority!)
          })
        }

        // Request pruning of excessive blocks
        const excessiveBlocks = map(filter(res, (item: any) => item.count > this.options.blockRedundancy!), (item: any) => item._id)
        this.logger.info('Blocks excessive redundancy count:', excessiveBlocks.length)
        this.emit('blockVerification:excessiveBlocks', { count: excessiveBlocks.length })
        if (this.options.toPruneRedundantBlocks) {
          const takenBlocks = take(excessiveBlocks, this.options.maxPruneChunkSize!)
          takenBlocks.forEach((height: number) => {
            this.enqueuePruneBlock(height, this.options.blockRedundancy!, this.options.enqueuePruneBlockPriority!)
          })
        }

        // Enqueue for redundancy blocks
        if (this.options.blockRedundancy! > 1) {
          const insufficientBlocks = map(filter(res, (item: any) => item.count < this.options.blockRedundancy!), (item: any) => item._id)
          this.logger.info('Blocks insufficient redundancy count:', insufficientBlocks.length)
          // TODO
          throw new Error('Not Implemented.')
        }

        // Check if fully sync'ed
        const node = this.mesh.getHighestNode()
        if (node) {
          if (this.isReachedMaxHeight() || this.isReachedHighestBlock(node)) {
            if (missingBlocks.length === 0) {
              this.logger.info('Storage is fully synced and up to date.')
              this.emit('UpToDate')
            }
          }
        }
      })
      .catch((err: any) => {
        this.logger.info('storage.analyzeBlocks error, but to continue... Message:', err.message)
      })
  }

  private increaseBlockWritePointer() {
    this.logger.debug('increaseBlockWritePointer triggered.')
    this.blockWritePointer += 1
  }

  /**
   * @param priority Lower value, the higher its priority to be executed.
   */
  private enqueueStoreBlock(height: number, priority: number) {
    this.logger.debug('enqueueStoreBlock triggered. height:', height, 'priority:', priority)
    this.emit('enqueueStoreBlock:init', { height, priority })

    // if the block height is above the current height, increment the write pointer.
    if (height > this.blockWritePointer) {
      this.logger.debug('height > this.blockWritePointer, blockWritePointer is now:', height)
      this.blockWritePointer = height
    }

    // enqueue the block
    this.queue.push(
      {
        method: this.storeBlock.bind(this),
        attrs: {
          height,
        },
      },
      priority
    )
  }

  /**
   * @param priority Lower value, the higher its priority to be executed.
   */
  private enqueuePruneBlock(height: number, redundancySize: number, priority: number) {
    this.logger.debug('enqueuePruneBlock triggered. height:', height, 'redundancySize:', redundancySize, 'priority:', priority)
    this.emit('enqueuePruneBlock:init', { height, redundancySize, priority })

    this.queue.push(
      {
        method: this.pruneBlock.bind(this),
        attrs: {
          height,
          redundancySize,
        },
      },
      priority
    )
  }

  private storeBlock(attrs: object): Promise<any> {
    this.logger.debug('storeBlock triggered. attrs:', attrs)
    const height: number = (<any>attrs).height

    this.emit('storeBlock:init', { height })
    return new Promise((resolve, reject) => {
      const node = this.mesh.getFastestNode() // TODO: need to pick a node with least pending requests
      if (!node) {
        this.emit('storeBlock:complete', { isSuccess: false, height })
        return reject(new Error('No valid node found.'))
      }

      node
        .getBlock(height)
        .then((block) => {
          const source = node.endpoint
          this.storage!.setBlock(height, block, source)
            .then((res) => {
              this.logger.debug('setBlock succeeded. For height:', height)
              this.emit('storeBlock:complete', { isSuccess: true, height })
              return resolve()
            })
            .catch((err: any) => {
              this.logger.debug('setBlock failed. For height:', height)
              this.emit('storeBlock:complete', { isSuccess: false, height })
              return reject(err)
            })
        })
        .catch((err: any) => {
          this.logger.debug('getBlock failed. For height:', height)
          this.emit('storeBlock:complete', { isSuccess: false, height })
          return reject(err)
        })
    })
  }

  private pruneBlock(attrs: object): Promise<any> {
    this.logger.debug('pruneBlock triggered. attrs:', attrs)
    const height: number = (<any>attrs).height
    const redundancySize: number = (<any>attrs).redundancySize

    return new Promise((resolve, reject) => {
      this.storage!.pruneBlock(height, redundancySize)
        .then(() => resolve())
        .catch((err: any) => reject(err))
    })
  }
}
