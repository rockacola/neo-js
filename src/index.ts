import { EventEmitter } from 'events'
import Logger from 'node-log-it'

class Neo extends EventEmitter {
  private logger: any

  constructor(options = {}) {
    super()

    this.logger = new Logger('Neo')
  }

  static get VERSION(): string {
    return '0.10.0'
  }

  get VERSION(): string {
    return '0.10.1'
  }

  getLoggerName(): string {
    return this.logger.getName()
  }
}

export default Neo
