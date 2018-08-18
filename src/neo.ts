import { EventEmitter } from 'events'
import Logger from 'node-log-it'

class Neo extends EventEmitter {
  private logger: any

  constructor(options = {}) {
    super()

    this.logger = new Logger('Neo')
  }
}

export default Neo
