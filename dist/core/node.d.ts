import { EventEmitter } from "events";
import { LoggerOptions } from 'node-log-it';
export interface NodeOptions {
    loggerOptions?: LoggerOptions;
}
export declare class Node extends EventEmitter {
    private endpoint;
    private options;
    private logger;
    constructor(endpoint: string, options?: NodeOptions);
    getBlock(height: number, isVerbose?: boolean): Promise<object>;
    getBlockCount(): Promise<object>;
    getVersion(): Promise<object>;
}
