import { EventEmitter } from 'events';
declare class Neo extends EventEmitter {
    private logger;
    constructor(options?: {});
    static readonly VERSION: string;
    readonly VERSION: string;
    getLoggerName(): string;
}
export default Neo;
