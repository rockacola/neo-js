import { EventEmitter } from 'events'
import { Logger, LoggerOptions } from 'node-log-it'
import { merge } from 'lodash'
import { Mesh } from './mesh'
import { MemoryStorage } from '../storages/memory-storage'
import { MongodbStorage } from '../storages/mongodb-storage'
import C from '../common/constants'

const MODULE_NAME = 'Syncer'
const DEFAULT_OPTIONS: SyncerOptions = {
  loggerOptions: {},
}

export interface SyncerOptions {
  loggerOptions?: LoggerOptions,
}

export class Syncer extends EventEmitter {
  private mesh: Mesh
  private storage?: MemoryStorage | MongodbStorage
  private options: SyncerOptions
  private logger: Logger

  constructor(mesh: Mesh, storage?: MemoryStorage | MongodbStorage, options: SyncerOptions = {}) {
    super()

    // Associate required properties
    this.mesh = mesh
    this.storage = storage

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)
  
    // Event handlers
    //

    this.logger.debug('constructor completes.')
  } 
}
