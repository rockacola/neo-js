import { EventEmitter } from 'events'

class Neo extends EventEmitter {
  constructor(options = {}) {
    super();
  }

  static get VERSION(): string {
    return '0.10.0'
  }

  get VERSION(): string {
    return '0.10.1'
  }
}

export default Neo
