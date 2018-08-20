import { EventEmitter } from 'events';
import { LoggerOptions } from 'node-log-it';
import { MeshOptions } from './core/mesh';
export interface NeoOptions {
    network?: string;
    endpoints?: object[];
    meshOptions?: MeshOptions;
    loggerOptions?: LoggerOptions;
}
export declare class Neo extends EventEmitter {
    private options;
    private logger;
    private mesh;
    constructor(options?: NeoOptions);
    private getMesh;
    private getNodes;
}
