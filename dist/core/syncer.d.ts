/// <reference types="node" />
import { EventEmitter } from 'events';
import { LoggerOptions } from 'node-log-it';
import { Mesh } from './mesh';
import { MemoryStorage } from '../storages/memory-storage';
import { MongodbStorage } from '../storages/mongodb-storage';
export interface SyncerOptions {
    startOnInit?: boolean;
    workerCount?: number;
    doEnqueueBlockIntervalMs?: number;
    verifyBlocksIntervalMs?: number;
    maxQueueLength?: number;
    reQueueDelayMs?: number;
    standardEnqueueBlockPriority?: number;
    retryEnqueueBlockPriority?: number;
    verifyEnqueueBlockPriority?: number;
    loggerOptions?: LoggerOptions;
}
export declare class Syncer extends EventEmitter {
    private _isRunning;
    private queue;
    private blockWritePointer;
    private mesh;
    private storage?;
    private options;
    private logger;
    private enqueueBlockIntervalId;
    private blockVerificationIntervalId;
    constructor(mesh: Mesh, storage?: MemoryStorage | MongodbStorage, options?: SyncerOptions);
    isRunning(): boolean;
    start(): void;
    stop(): void;
    private storeBlockCompleteHandler;
    private getPriorityQueue;
    private initEnqueueBlock;
    private doEnqueueBlock;
    private setBlockWritePointer;
    private initBlockVerification;
    private doBlockVerification;
    private increaseBlockWritePointer;
    private enqueueBlock;
    private storeBlock;
}
