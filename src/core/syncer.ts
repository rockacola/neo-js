import { EventEmitter } from 'events'
import { priorityQueue } from 'async'
import { Logger, LoggerOptions } from 'node-log-it'
import { merge, map, difference } from 'lodash'
import { Mesh } from './mesh'
import { MemoryStorage } from '../storages/memory-storage'
import { MongodbStorage } from '../storages/mongodb-storage'
// import C from '../common/constants'

const MODULE_NAME = 'Syncer'
const DEFAULT_OPTIONS: SyncerOptions = {
  minHeight: 1,
  maxHeight:  undefined,
  startOnInit: true,
  workerCount: 30,
  doEnqueueBlockIntervalMs: 2000,
  verifyBlocksIntervalMs: 1 * 60 * 1000,
  maxQueueLength: 10000,
  reQueueDelayMs: 2000,
  standardEnqueueBlockPriority: 5,
  retryEnqueueBlockPriority: 3,
  verifyEnqueueBlockPriority: 1,
  loggerOptions: {},
}

export interface SyncerOptions {
  minHeight?: number,
  maxHeight?: number,
  startOnInit?: boolean,
  workerCount?: number,
  doEnqueueBlockIntervalMs?: number,
  verifyBlocksIntervalMs?: number,
  maxQueueLength?: number,
  reQueueDelayMs?: number,
  standardEnqueueBlockPriority?: number,
  retryEnqueueBlockPriority?: number,
  verifyEnqueueBlockPriority?: number,
  loggerOptions?: LoggerOptions,
}

export class Syncer extends EventEmitter {
  private _isRunning = false
  private queue: any
  private blockWritePointer: number = 0
  private mesh: Mesh
  private storage?: MemoryStorage | MongodbStorage
  private options: SyncerOptions
  private logger: Logger
  private enqueueBlockIntervalId?: NodeJS.Timer
  private blockVerificationIntervalId?: NodeJS.Timer

  constructor(mesh: Mesh, storage?: MemoryStorage | MongodbStorage, options: SyncerOptions = {}) {
    super()

    // Associate required properties
    this.mesh = mesh
    this.storage = storage

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

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

    this.initEnqueueBlock()
    this.initBlockVerification()
    // TODO: this.initAssetVerification()
  }

  stop() {
    if (!this._isRunning) {
      this.logger.info('Syncer is not running at the moment.')
      return
    }

    this.logger.info('Stop syncer.')
    this._isRunning = false
    this.emit('stop')

    clearInterval(this.enqueueBlockIntervalId!)
    clearInterval(this.blockVerificationIntervalId!)
  }

  private storeBlockCompleteHandler(payload: any) {
    if (payload.isSuccess === false) {
      this.logger.debug('storeBlockCompleteHandler !isSuccess triggered.')
      setTimeout(() => { // Re-queue the method when failed after an injected delay
        this.enqueueBlock(payload.height, this.options.retryEnqueueBlockPriority!)
      }, this.options.reQueueDelayMs!)
    }
  }

  private getPriorityQueue(): any {
    /**
     * @param {object} task
     * @param {string} task.method
     * @param {object} task.attrs
     * @param {function} callback
     */
    return priorityQueue((task: object, callback: Function) => {
      const method: Function = (<any> task).method
      const attrs: Object = (<any> task).attrs
      this.logger.debug('new worker for queue.')

      method(attrs)
        .then(() => {
          callback()
          this.logger.debug('queued method run completed.')
          this.emit('syncer:run:complete', { isSuccess: true, task })
        })
        .catch((err: Error) => {
          this.logger.warn(`Task execution error. attrs: [${attrs}]. Continue...`)
          // this.logger.info('Error:', err)
          callback()
          this.emit('syncer:run:complete', { isSuccess: false, task })
        })
    }, this.options.workerCount!)
  }

  private initEnqueueBlock() {
    this.logger.debug('initEnqueueBlock triggered.')
    this.setBlockWritePointer()
      .then(() => {
        this.enqueueBlockIntervalId = setInterval(() => { // Enqueue blocks for download
          this.doEnqueueBlock()
        }, this.options.doEnqueueBlockIntervalMs!)
      })
      .catch((err) => {
        this.logger.warn('storage.getBlockCount() failed. Error:', err.message)
      })
  }

  private doEnqueueBlock() {
    this.logger.debug('doEnqueueBlock triggered.')

    if (this.options.maxHeight && this.blockWritePointer >= this.options.maxHeight) {
      this.logger.info(`BlockWritePointer is greater or equal to designated maxHeight [${this.options.maxHeight}]. There will be no enqueue block beyond this point.`)
      return
    }

    const node = this.mesh.getHighestNode()
    if (node) { // TODO: better way to validate a node
      // TODO: undefined param handler
      while ((!this.options.maxHeight || this.blockWritePointer < this.options.maxHeight)
        && (this.blockWritePointer! < node.blockHeight!)
        && (this.queue.length() < this.options.maxQueueLength!)) {
        this.increaseBlockWritePointer()
        this.enqueueBlock(this.blockWritePointer!, this.options.standardEnqueueBlockPriority!)
      }
    } else {
      this.logger.error('Unable to find a valid node.')
    }
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
        .catch((err) => {
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
    const startHeight = this.options.minHeight!
    const endHeight = (this.options.maxHeight && this.blockWritePointer > this.options.maxHeight) ? this.options.maxHeight : this.blockWritePointer

    this.storage!.analyzeBlocks(startHeight, endHeight)
      .then((res: object[]) => {
        let all: number[] = []
        for (let i = startHeight; i <= endHeight; i++) {
          all.push(i);
        }
        
        const available: number[] = map(res, (item: any) => item._id)
        this.logger.info('Blocks available count:', available.length)

        const missing = difference(all, available)
        this.logger.info('Blocks missing count:', missing.length)

        // Enqueue missing block heights
        missing.forEach((height: number) => {
          this.enqueueBlock(height, this.options.verifyEnqueueBlockPriority!)
        })
      })
  }

  private increaseBlockWritePointer() {
    this.logger.debug('increaseBlockWritePointer triggered.')
    this.blockWritePointer += 1
  }

  /**
   * @param priority Lower value, the higher its priority to be executed.
   */
  private enqueueBlock(height: number, priority: number) {
    this.logger.debug('enqueueBlock triggered. height:', height, 'priority:', priority)
    this.emit('enqueueBlock:init', { height, priority })

    // if the block height is above the current height, increment the write pointer.
    if (height > this.blockWritePointer) {
      this.logger.debug('height > this.blockWritePointer, blockWritePointer is now:', height)
      this.blockWritePointer = height
    }

    // enqueue the block
    this.queue.push({
      method: this.storeBlock.bind(this),
      attrs: {
        height,
      },
    }, priority)
  }

  private storeBlock(attrs: object) {
    this.logger.debug('storeBlock triggered. attrs:', attrs)
    const height: number = (<any> attrs).height

    this.emit('storeBlock:init', { height })
    return new Promise((resolve, reject) => {
      const node = this.mesh.getFastestNode() // TODO: need to pick a node with least pending requests
      if (!node) {
        this.emit('storeBlock:complete', { isSuccess: false, height })
        return reject(new Error('No valid node found.'))
      }

      node.getBlock(height)
        .then((block) => {
          const source = node.endpoint
          this.storage!.setBlock(height, block, source)
            .then((res) => {
              this.logger.debug('setBlock succeeded. For height:', height)
              this.emit('storeBlock:complete', { isSuccess: true, height })
              return resolve()
            })
            .catch((err) => {
              this.logger.debug('setBlock failed. For height:', height)
              this.emit('storeBlock:complete', { isSuccess: false, height })
              return reject(err)
            })
        })
        .catch((err) => {
          this.logger.debug('getBlock failed. For height:', height)
          this.emit('storeBlock:complete', { isSuccess: false, height })
          return reject(err)
        })
    })
  }
}
