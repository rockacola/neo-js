/// <reference types="node" />
import { EventEmitter } from 'events';
import { LoggerOptions } from 'node-log-it';
export interface MemoryStorageOptions {
    loggerOptions?: LoggerOptions;
}
export declare class MemoryStorage extends EventEmitter {
    private _isReady;
    private _blockHeight?;
    private blockCollection;
    private options;
    private logger;
    constructor(options?: MemoryStorageOptions);
    isReady(): boolean;
    getBlockCount(): Promise<number>;
    setBlockCount(blockHeight: number): Promise<void>;
    getBlock(height: number): Promise<object>;
    setBlock(height: number, block: object, source: string): Promise<void>;
    listMissingBlocks(startHeight: number, endHeight: number): Promise<number[]>;
    disconnect(): Promise<void>;
}
