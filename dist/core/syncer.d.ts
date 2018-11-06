/// <reference types="node" />
import { EventEmitter } from 'events';
import { LoggerOptions } from 'node-log-it';
import { Mesh } from './mesh';
import { MemoryStorage } from '../storages/memory-storage';
import { MongodbStorage } from '../storages/mongodb-storage';
export interface SyncerOptions {
    minHeight?: number;
    maxHeight?: number;
    blockRedundancy?: number;
    startOnInit?: boolean;
    toSyncIncremental?: boolean;
    toSyncForMissingBlocks?: boolean;
    toPruneRedundantBlocks?: boolean;
    workerCount?: number;
    enqueueBlockIntervalMs?: number;
    verifyBlocksIntervalMs?: number;
    maxQueueLength?: number;
    retryEnqueueDelayMs?: number;
    standardEnqueueBlockPriority?: number;
    retryEnqueueBlockPriority?: number;
    missingEnqueueStoreBlockPriority?: number;
    enqueuePruneBlockPriority?: number;
    maxPruneChunkSize?: number;
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
    private enqueueStoreBlockIntervalId?;
    private blockVerificationIntervalId?;
    constructor(mesh: Mesh, storage?: MemoryStorage | MongodbStorage, options?: SyncerOptions);
    isRunning(): boolean;
    start(): void;
    stop(): void;
    private storeBlockCompleteHandler;
    private validateOptionalParameters;
    private getPriorityQueue;
    private initStoreBlock;
    private doEnqueueStoreBlock;
    private isReachedMaxHeight;
    private isReachedHighestBlock;
    private isReachedMaxQueueLength;
    private setBlockWritePointer;
    private initBlockVerification;
    private doBlockVerification;
    private increaseBlockWritePointer;
    private enqueueStoreBlock;
    private enqueuePruneBlock;
    private storeBlock;
    private pruneBlock;
}
