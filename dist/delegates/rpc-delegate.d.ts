export declare class RpcDelegate {
    static getBlock(url: string, height: number, isVerbose?: boolean): Promise<object>;
    static getBlockCount(url: string): Promise<object>;
    static getVersion(url: string): Promise<object>;
}
