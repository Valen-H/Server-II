"use strict";

import * as http from "http";
import * as fs from "fs-extra";
import * as path from "path";
import { EventEmitter } from "events";


export module Classes {
	
	export declare namespace Options {
		
		export interface ServerOptions {
			readonly serveDir?: string; //local root
			readonly index?: RegExp; //index filename
			readonly root?: string; //url / mapped
			readonly mwbuilt?: string; //middleware / builtin
			readonly prbuilt?: string; //private / builtin
			readonly pubuilt?: string; //public / builtin
			readonly mwdir?: string; //local
			readonly private?: string; //local
			readonly public?: string; //local
			readonly noindex?: string; //.noindex name
			readonly nodir?: RegExp; //__files prefix
			readonly builtmpl?: RegExp; //$$code$$ prefix
			readonly dir?: string; //'dir.htm' sub-private / local
			readonly port?: number;
			readonly contentMappings?: {
				[ext: string]: string;
			}; // .htm -> text/html ...
			
			readonly http?: {
				//require('http')
				[idx: string]: any;
			};
			
			readonly builtins?: boolean; //pass mwbuilt to mwdir if empty etc...
			allowmw?: boolean; //read mwrs from folder
		} //ServerOptions
		
	} //Options
	
	export namespace Errors {
		
		export const EBADPATH: URIError = new URIError("Bad Path.");
		export const EBADROOT: URIError = new URIError("Bad Root.");
		
	} //Errors
	
	export type evt = {
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
	export class Middleware {
		name: string;
		befores: string[] = [ ];
		afters: string[] = [ ];
		
		_fromFile?: boolean = false;
		_idx: number = -1;
		_before: number = 0;
		_after: number = 0;
		
		
		public constructor(name: string, befores: string[] = [ ], afters: string[] = [ ], body: (req: any, res: any, event: evt) => Promise<boolean>, _fromFile: boolean = false) {
			this.name = name.toString();
			this.befores = Array.from(befores);
			this.afters = Array.from(afters);
			this.body = body;
			this._fromFile = _fromFile;
		} //ctor
		
		
		//@Override
		async body(req: any, res: any, event: evt): Promise<boolean> {
			return false;
		} //body
		
	} //Middleware
	
	/**
	 * Starting Class.
	 * 
	 * @author V. H.
	 * @date 2019-05-12
	 * @export
	 * @class Server
	 * @extends {require("events").EventEmitter}
	 */
	export class Server extends EventEmitter {
		
		readonly opts: Options.ServerOptions;
		readonly httpsrv: http.Server;
		mwrs: Middleware[] = [ ];
		logs: string = "";
		_debuglog: string = "";
		_reqcntr: number = 0;
		readonly data: {
			[idx: string]: any
		} = { };
		
		public static defaultOpts: Options.ServerOptions = {
			serveDir: path.resolve("__Server"),
			index: /^index\.html?x?$/i,
			root: '/', //url mapped to serveDir
			mwbuilt: `..${path.sep}builtin${path.sep}middlewares`,
			prbuilt: `..${path.sep}builtin${path.sep}private`,
			pubuilt: `..${path.sep}builtin${path.sep}public`,
			mwdir: "middleware",
			private: "private",
			public: "public",
			noindex: ".noindex",
			nodir: /^_{2}/i,
			builtmpl: /\${2}(.+?)\${2}/sig,
			dir: "dir.htm",
			port: Number(process.env.SRVPORT) || 1234,
			contentMappings: {
				".htm": "text/html; charset=UTF-8",
				".html": "text/html; charset=UTF-8",
				".htx": "text/html; charset=UTF-8",
				".htmlx": "text/html; charset=UTF-8",
				".txt": "text/plain; charset=UTF-8",
				".jpg": "image/jpeg",
				".jpeg": "image/jpeg",
				".svg": "image/svg+xml",
				".png": "image/png",
				".bmp": "image/bmp",
				".ico": "image/x-icon",
				".js": "application/javascript",
				".jsx": "application/javascript",
				".xjs": "application/javascript",
				".xml": "application/xml",
				".css": "text/css",
				".cssx": "text/css"
			},
			http: http,
			builtins: true,
			allowmw: true,
		};
		
		
		public constructor(opts: Options.ServerOptions = Server.defaultOpts) {
			super();
			
			this.opts = Object.assign({ }, Server.defaultOpts);
			this.opts = Object.assign(this.opts, opts);
			
			if (this.opts.allowmw) {
				this._loadMW();
				this.emit("mwloaded");
			}
			
			this.httpsrv = this.opts.http.createServer(async (req: any, res: any) => {
				this.emit("request", req, res);
				
				let event: evt = {
					stop: function stop(): boolean {
						return event.stp = true;
					},
					pass: (async function pass(data?: any, to?: string): Promise<boolean> {
						if (event.fncntr >= 0) event.carriage[to || this.mwrs[event.fncntr].name] = data;
						if (this.mwrs[++event.fncntr] && !event.stp) {
							await this.mwrs[event.fncntr].body(req, res, event);
						}
						
						return false;
					}).bind(this),
					carriage: {
						_global: { }
					},
					server: this,
					stp: false,
					fncntr: -1,
					reqcntr: this._reqcntr++
				};
				
				return await event.pass();
			});
		} //ctor
		
		/**
		 * Bind server to a port or middleware to the server
		 * @param bb - middleware-to-bind / port-to-listen
		 * @param rec - allow order recalculation
		 */
		public async bind(bb: number | Middleware = this.opts.port, rec: boolean = true): Promise<http.Server> {
			if (bb instanceof Middleware) {
				this.mwrs.push(bb);
				if (rec) this._recalc();
			} else {
				return new Promise((res: (value: http.Server) => void, rej): void => {
					this.httpsrv.listen(bb, (): any => res(this.httpsrv));
				});
			}
			
			return this.httpsrv;
		} //bind
		
		/**
		 * Read middlewares from a directory
		 * @param from=path.join(this.opts.serveDir,this.opts.mwdir) - directory
		 */
		_loadMW(from: string = path.join(this.opts.serveDir, this.opts.mwdir)): void {
			return fs.readdir(from, (err: Error, files: string[]): void => {
				if (!err) {
					for (let file of files) {
						let name: string = path.join(this.opts.serveDir, this.opts.mwdir, file);
						delete require.cache[require.resolve(name)];
						if (file.endsWith(".js")) this.mwrs.push(require(name));
					}
					
					this._recalc();
				} else {
					this.log(err);
				}
			});
		} //_loadMW
		
		/** 
		 * Order middlewares
		 */
		private _recalc(): void {
			let cntr: number = 0,
				repeat: number = 0;
			
			for (let mwr of this.mwrs) {
				mwr._idx = cntr++;
			}
			cntr = 0;
			
			for (let mwr of this.mwrs) {
				let afters: Middleware[] = this.mwrs.filter((mw: Middleware): any => mwr.afters.includes(mw.name)),
					befores: Middleware[] = this.mwrs.filter((mw: Middleware): any => mwr.befores.includes(mw.name)),
					max: number = -1,
					min: number = this.mwrs.length;
					
				if (afters.length) max = Math.max(...afters.map((aft: Middleware): number => aft._idx));
				if (befores.length) min = Math.min(...befores.map((bef: Middleware): number => bef._idx));
				
				mwr._before = min;
				mwr._after = max;
				
				if (mwr._idx < mwr._after) {
					repeat = 1;
				} else if (mwr._idx > mwr._before) {
					repeat = 2;
				}
			}
			
			if (repeat === 2) {
				this.mwrs = this.mwrs.sort((a: Middleware, b: Middleware): number => a._before - b._before);
			} else if (repeat === 1) {
				this.mwrs = this.mwrs.sort((a: Middleware, b: Middleware): number => a._after - b._after);
			}
			
			for (let mwr of this.mwrs) {
				mwr._idx = cntr++;
			}
			
			if (repeat) this._recalc();
		} //_recalc
		
		/**
		 * Log stuff
		 * @param msg - joined with whitespace
		 */
		public log(...msg: any[]): this {
			this.logs += msg.join(' ') + '\n';
			this.emit("log", ...msg);
			return this;
		} //log
		
		/**
		 * Builtin logger
		 * @private
		 * @param msg - joined with whitespace
		 */
		_debug(...msg: any[]): this {
			this._debuglog += msg.join(' ') + "  ---  " + Date() + '\n';
			this.emit("_debug", ...msg);
			return this;
		} //_debug

		//mwloaded, request, _debug, log

		//@Override
		public on(event: "mwloaded", listener: (...args: any[]) => void): this;
		//@Override
		public on(event: "request", listener: (...args: any[]) => void): this;
		//@Override
		public on(event: "_debug", listener: (...args: any[]) => void): this;
		//@Override
		public on(event: "log", listener: (...args: any[]) => void): this;
		//@Override
		public on(event: string | symbol, listener: (...args: any[]) => void): this {
			return super.on(event, listener);
		} //on
		//@Override
		public once(event: "mwloaded", listener: (...args: any[]) => void): this;
		//@Override
		public once(event: "request", listener: (...args: any[]) => void): this;
		//@Override
		public once(event: "_debug", listener: (...args: any[]) => void): this;
		//@Override
		public once(event: "log", listener: (...args: any[]) => void): this;
		//@Override
		public once(event: string | symbol, listener: (...args: any[]) => void): this {
			return super.once(event, listener);
		} //once
		
	} //Server
	
} //Classes

export default Classes;
