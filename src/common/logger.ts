import * as loglevel from 'loglevel'
import { assign } from 'lodash'

interface Options {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent',
  displayTimestamp?: boolean,
  displayName?: boolean,
  displayLevel?: boolean,
  timestampFormat?: string,
}

class Logger {
  private name: string
  private options: Options
  private logger: loglevel.Logger

  constructor(name: string, options: Options = {}) {
    this.name = name

    // Associate optional properties
    this.options = {
      level: 'warn',
      displayTimestamp: true,
      displayName: true,
      displayLevel: true,
      timestampFormat: 'hh:mm:ss.SSS'
    }
    assign(this.options, options)

    // Bootstrapping
    this.logger = loglevel.getLogger(this.name)
    if (this.options.level) {
      this.logger.setLevel(this.options.level)
    }
  }

  getName(): string {
    return this.name
  }
}

export default Logger
