/// <reference types="node" />
import { EventEmitter } from "events";
import { LoggerOptions } from 'node-log-it';
export interface MemoryStorageOptions {
    loggerOptions?: LoggerOptions;
}
export declare class MemoryStorage extends EventEmitter {
    private _isReady;
    private _blockHeight?;
    private options;
    private logger;
    constructor(options?: MemoryStorageOptions);
    isReady(): boolean;
    getBlockCount(): Promise<number>;
    setBlockCount(blockHeight: number): void;
}
