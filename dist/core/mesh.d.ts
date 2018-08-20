import { EventEmitter } from "events";
import { LoggerOptions } from 'node-log-it';
import { Node } from "./node";
export interface MeshOptions {
    loggerOptions?: LoggerOptions;
}
export declare class Mesh extends EventEmitter {
    private nodes;
    private options;
    private logger;
    constructor(nodes: Node[], options?: MeshOptions);
}
