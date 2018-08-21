import { EventEmitter } from "events"
import { Logger, LoggerOptions } from 'node-log-it'
import { merge, filter, minBy, maxBy } from 'lodash'
import { Chance } from 'chance'
import { Node } from "./node"

const chance = new Chance()
const MODULE_NAME = 'Mesh'
const DEFAULT_OPTIONS: MeshOptions = {
  startBenchmarkOnInit: true,
  benchmarkIntervalMs: 2000,
  loggerOptions: {},
}

export interface MeshOptions {
  startBenchmarkOnInit?: boolean,
  benchmarkIntervalMs?: number,
  loggerOptions?: LoggerOptions,
}

export class Mesh extends EventEmitter {
  public nodes: Node[] // Ensure there's at least 1 item in the array
  private benchmarkIntervalId?: NodeJS.Timer
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
    if (this.options.startBenchmarkOnInit) {
      this.startBenchmark()
    }
  
    this.logger.debug('constructor completes.')
  }

  startBenchmark() {
    this.logger.debug('startBenchmark triggered.')

    // Go through and ping all unknown nodes
    const unknownNodes = filter(this.nodes, (n: Node) => (n.isActive === undefined))
    this.logger.debug('unknownNodes.length:', unknownNodes.length)
    unknownNodes.forEach((n) => {
      this.logger.debug('oink')
      return n.getBlockCount()
    })

    // Start timer
    this.benchmarkIntervalId = setInterval(() => this.performBenchmark(), <number> this.options.benchmarkIntervalMs)
  }

  stopBenchmark() {
    this.logger.debug('stopBenchmark triggered.')
    if (this.benchmarkIntervalId) {
      clearInterval(this.benchmarkIntervalId)
    }
  }

  private performBenchmark() {
    this.logger.debug('performBenchmark triggered.')

    // pick and ping a random node
    const node = this.getRandomNode()
    if (node) {
      node.getBlockCount()
    }
  }

  getFastestNode(activeOnly = true): Node | undefined {
    this.logger.debug('getFastestNode triggered.')

    let nodePool = activeOnly ? this.listActiveNodes() : this.nodes
    if (nodePool.length === 0) {
      return undefined
    }

    nodePool = filter(nodePool, (n: Node) => (n.latency !== undefined))
    if (nodePool.length === 0) {
      return undefined
    }

    return minBy(nodePool, 'latency')
  }

  getHighestNode(activeOnly = true): Node | undefined {
    this.logger.debug('getHighestNode triggered.')

    let nodePool = activeOnly ? this.listActiveNodes() : this.nodes
    if (nodePool.length === 0) {
      return undefined
    }

    nodePool = filter(nodePool, (n: Node) => (n.blockHeight !== undefined))
    if (nodePool.length === 0) {
      return undefined
    }

    return maxBy(nodePool, 'blockHeight')
  }

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
