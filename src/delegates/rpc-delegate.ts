import { rpc } from '@cityofzion/neon-js'

export class RpcDelegate {
  static query(url: string, method: string, params: any[], id: number): Promise<object> {
    const q = new rpc.Query({ method, params, id })
    return q.execute(url)
  }
}
