/// <reference types="node" />
import * as http from "http";
export declare module Classes {
    namespace Options {
        interface ServerOptions {
            serveDir?: string;
            index?: RegExp;
            root?: string;
            mwbuilt?: string;
            prbuilt?: string;
            pubuilt?: string;
            mwdir?: string;
            private?: string;
            public?: string;
            noindex?: string;
            nodir?: RegExp;
            builtmpl?: RegExp;
            dir?: string;
            port?: number;
            contentMappings?: {
                [ext: string]: string;
            };
            http: {
                [idx: string]: any;
            };
            builtins?: boolean;
            allowmw?: boolean;
        }
    }
    namespace Errors {
        const EBADPATH: URIError;
    }
    type evt = {
        stop: () => boolean;
        pass: (data?: any) => Promise<boolean>;
        carriage: {
            [idx: string]: any;
        };
        server: Server;
        stp: boolean;
        fncntr: number;
        reqcntr: number;
    };
    class Middleware {
        name: string;
        befores: string[];
        afters: string[];
        _fromFile: boolean;
        _idx: number;
        _before: number;
        _after: number;
        constructor(name: string, befores: string[], afters: string[], body: (req: any, res: any, event: evt) => Promise<boolean>, _fromFile?: boolean);
        body(req: any, res: any, event: evt): Promise<boolean>;
    }
    const Server_base: any;
    class Server extends Server_base {
        opts: Options.ServerOptions;
        httpsrv: http.Server;
        mwrs: Middleware[];
        logs: string;
        _debuglog: string;
        _reqcntr: number;
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
        _recalc(): void;
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
    }
}
export default Classes;
