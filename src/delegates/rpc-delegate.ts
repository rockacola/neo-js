import { rpc } from '@cityofzion/neon-js'

const DEFAULT_ID = 0

export class RpcDelegate {
  static getBlock(url: string, height: number, isVerbose: boolean = true): Promise<object> {
    const verboseKey: number = isVerbose ? 1 : 0
    const q = new rpc.Query({ method: 'getblock', params: [height, verboseKey], id: DEFAULT_ID})
    return q.execute(url)
  }
}
