"use strict";

import * as http from "http";
import * as fs from "fs-extra";
import * as path from "path";


export module Classes {
	
	export declare namespace Options {
		
		export interface ServerOptions {
			serveDir?: string; //local root
			index?: RegExp; //index filename
			root?: string; //url / mapped
			mwbuilt?: string; //middleware / builtin
			prbuilt?: string; //private / builtin
			pubuilt?: string; //public / builtin
			mwdir?: string; //local
			private?: string; //local
			public?: string; //local
			noindex?: string; //.noindex name
			nodir?: RegExp; //__files prefix
			builtmpl?: RegExp; //$$code$$ prefix
			dir?: string; //'dir.htm' sub-private / local
			port?: number;
			contentMappings?: {
				[ext: string]: string;
			}; // .htm -> text/html ...
			
			http?: {
				//require('http')
				[idx: string]: any;
			};
			
			builtins?: boolean; //pass mwbuilt to mwdir if empty etc...
			allowmw?: boolean; //read mwrs from folder
		} //ServerOptions
		
	} //Options
	
	export namespace Errors {
		
		export const EBADPATH = new URIError("Bad Path.");
		export const EBADROOT = new URIError("Bad Root.");
		
	} //Errors
	
	export type evt = {
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
		befores: string[];
		afters: string[];
		
		_fromFile: boolean = false;
		_idx: number = -1;
		_before: number = 0;
		_after: number = 0;
		
		
		constructor(name: string, befores: string[] = [ ], afters: string[] = [ ], body: (req, res, event: evt) => Promise<boolean>, _fromFile: boolean = false) {
			this.name = name.toString();
			this.befores = Array.from(befores);
			this.afters = Array.from(afters);
			this.body = body;
			this._fromFile = _fromFile;
		} //ctor
		
		
		//@Override
		async body(req, res, event: evt): Promise<boolean> {
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
	export class Server extends require("events").EventEmitter {
		
		opts: Options.ServerOptions;
		httpsrv: http.Server;
		mwrs: Middleware[] = [ ];
		logs: string = "";
		_debuglog: string = "";
		_reqcntr: number = 0;
		data: {
			[idx: string]: any
		} = { };
		
		static defaultOpts: Options.ServerOptions = {
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
		
		
		constructor(opts: Options.ServerOptions = Server.defaultOpts) {
			super();
			
			this.opts = Object.assign({ }, Server.defaultOpts);
			this.opts = Object.assign(this.opts, opts);
			
			if (this.opts.allowmw) {
				this._loadMW();
				this.emit("mwloaded");
			}
			
			this.httpsrv = this.opts.http.createServer(async (req, res) => {
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
		async bind(bb: number | Middleware = this.opts.port, rec: boolean = true): Promise<http.Server> {
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
			return fs.readdir(from, (err: Error, files: string[]) => {
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
		_recalc(): void {
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
		log(...msg: any[]): this {
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
		
	} //Server
	
} //Classes

export default Classes;
