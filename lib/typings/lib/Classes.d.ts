/// <reference types="node" />
import * as http from "http";
import { EventEmitter } from "events";
export declare module Classes {
    namespace Options {
        interface ServerOptions {
            readonly serveDir?: string;
            readonly index?: RegExp;
            readonly root?: string;
            readonly mwbuilt?: string;
            readonly prbuilt?: string;
            readonly pubuilt?: string;
            readonly mwdir?: string;
            readonly private?: string;
            readonly public?: string;
            readonly noindex?: string;
            readonly nodir?: RegExp;
            readonly builtmpl?: RegExp;
            readonly dir?: string;
            readonly port?: number;
            readonly contentMappings?: {
                [ext: string]: string;
            };
            readonly http?: {
                [idx: string]: any;
            };
            readonly builtins?: boolean;
            allowmw?: boolean;
        }
    }
    namespace Errors {
        const EBADPATH: URIError;
        const EBADROOT: URIError;
    }
    type evt = {
        readonly stop: () => boolean;
        readonly pass: (data?: any) => Promise<boolean>;
        readonly carriage: {
            [idx: string]: any;
        };
        readonly server: Server;
        stp: boolean;
        fncntr: number;
        readonly reqcntr: number;
    };
    /**
     * Middleware class.
     *
     * @author V. H.
     * @date 2019-05-12
     * @export
     * @class Middleware
     */
    class Middleware {
        name: string;
        befores: string[];
        afters: string[];
        _fromFile?: boolean;
        _idx: number;
        _before: number;
        _after: number;
        constructor(name: string, befores: string[], afters: string[], body: (req: any, res: any, event: evt) => Promise<boolean>, _fromFile?: boolean);
        body(req: any, res: any, event: evt): Promise<boolean>;
    }
    /**
     * Starting Class.
     *
     * @author V. H.
     * @date 2019-05-12
     * @export
     * @class Server
     * @extends {require("events").EventEmitter}
     */
    class Server extends EventEmitter {
        readonly opts: Options.ServerOptions;
        readonly httpsrv: http.Server;
        mwrs: Middleware[];
        logs: string;
        _debuglog: string;
        _reqcntr: number;
        readonly data: {
            [idx: string]: any;
        };
        static defaultOpts: Options.ServerOptions;
        constructor(opts?: Options.ServerOptions);
        /**
         * Bind server to a port or middleware to the server
         * @param bb - middleware-to-bind / port-to-listen
         * @param rec - allow order recalculation
         */
        bind(bb?: number | Middleware, rec?: boolean): Promise<http.Server>;
        /**
         * Read middlewares from a directory
         * @param from=path.join(this.opts.serveDir,this.opts.mwdir) - directory
         */
        _loadMW(from?: string): void;
        /**
         * Order middlewares
         */
        private _recalc;
        /**
         * Log stuff
         * @param msg - joined with whitespace
         */
        log(...msg: any[]): this;
        /**
         * Builtin logger
         * @private
         * @param msg - joined with whitespace
         */
        _debug(...msg: any[]): this;
        on(event: "mwloaded", listener: (...args: any[]) => void): this;
        on(event: "request", listener: (...args: any[]) => void): this;
        on(event: "_debug", listener: (...args: any[]) => void): this;
        on(event: "log", listener: (...args: any[]) => void): this;
        once(event: "mwloaded", listener: (...args: any[]) => void): this;
        once(event: "request", listener: (...args: any[]) => void): this;
        once(event: "_debug", listener: (...args: any[]) => void): this;
        once(event: "log", listener: (...args: any[]) => void): this;
    }
}
export default Classes;
