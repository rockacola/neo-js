/// <reference types="node" />
import { EventEmitter } from "events";
import { LoggerOptions } from 'node-log-it';
import { Mesh } from './mesh';
export interface ApiOptions {
    loggerOptions?: LoggerOptions;
}
export declare class Api extends EventEmitter {
    private mesh;
    private storage;
    private options;
    private logger;
    constructor(mesh: Mesh, storage: any, options?: ApiOptions);
    getBlockCount(): Promise<number>;
}
