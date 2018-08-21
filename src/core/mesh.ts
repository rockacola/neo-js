import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge, filter } from 'lodash'
import { Chance } from 'chance'
import { Node } from "./node"

const chance = new Chance()
const MODULE_NAME = 'Mesh'
const DEFAULT_OPTIONS: MeshOptions = {
  loggerOptions: {},
}

export interface MeshOptions {
  loggerOptions?: LoggerOptions,
}

export class Mesh extends EventEmitter {
  public nodes: Node[] // Ensure there's at least 1 item in the array
  private options: MeshOptions
  private logger: Logger

  constructor(nodes: Node[], options: MeshOptions = {}) {
    super()

    // Associate required properties
    this.nodes = nodes
    if (this.nodes.length === 0) {
      throw new Error('Mesh must have 1 or more nodes.')
    }

    // Associate optional properties
    this.options = merge({}, DEFAULT_OPTIONS, options)

    // Bootstrapping
    this.logger = new Logger(MODULE_NAME, this.options.loggerOptions)

    this.logger.debug('constructor completes.')
  }

  // getFastestNode(): Node {
  // }

  // getHighestNode(): Node {
  // }

  /**
   * @param activeOnly Toggle to only pick node that is determined to be active.
   */
  getRandomNode(activeOnly = true): Node | undefined {
    this.logger.debug('getRandomNode triggered.')

    const nodePool = activeOnly ? this.listActiveNodes() : this.nodes
    if (nodePool.length === 0) {
      return undefined
    }

    const randomIndex = chance.natural({ min: 0, max: nodePool.length-1 })
    return nodePool[randomIndex]
  }

  private listActiveNodes(): Node[] {
    return filter(this.nodes, { isActive: true })
  }
}
