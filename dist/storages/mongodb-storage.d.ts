/// <reference types="node" />
import { EventEmitter } from "events";
import { LoggerOptions } from 'node-log-it';
export interface MongodbStorageOptions {
    loggerOptions?: LoggerOptions;
}
export declare class MongodbStorage extends EventEmitter {
    private _isReady;
    private options;
    private logger;
    constructor(options?: MongodbStorageOptions);
    isReady(): boolean;
    getBlockCount(): Promise<number>;
    setBlockCount(blockHeight: number): void;
}
