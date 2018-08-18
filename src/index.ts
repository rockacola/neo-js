import { EventEmitter } from 'events'
import Logger from 'node-log-it'
import { version } from '../package.json'

class Neo extends EventEmitter {
  private logger: any

  constructor(options = {}) {
    super()

    this.logger = new Logger('Neo')
  }

  static get VERSION(): string {
    return version
  }

  get VERSION(): string {
    return version
  }

  getLoggerName(): string {
    return this.logger.getName()
  }
}

export default Neo
