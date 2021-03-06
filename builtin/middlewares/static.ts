﻿import * as fs from "fs-extra";
import * as path from "path";
import { URL } from "url";
import { promisify } from "util";
import * as http from "http";
//@ts-ignore
import Classes from "../../lib/Classes";
const Classes = module.parent.exports.Classes;

const pstat: Function = promisify(fs.stat),
	preadFile: Function = promisify(fs.readFile),
	cache: Map<string, string> = new Map();

module.exports = {
	name: "static",
	afters: [ "fix", "directory" ],
	befores: [ "end" ],
	_fromFile: true,
	body: async function body(req: http.IncomingMessage, res: http.ServerResponse, event: Classes.evt): Promise<boolean> {
		/**
		 * if is index
		 * if is file
		 * if 404
		 */
		
		let uri = new URL(`http://127.0.0.1:${event.server.opts.port}${req.url}`),
			pth: string = uri.pathname.replace(new RegExp('^' + event.server.opts.root, "i"), ''),  //localize url
			targ: string = path.join(event.server.opts.serveDir, event.server.opts.public, pth);  //absolute
		
		event.server._debug(event.reqcntr, "(STATIC.TS) REQ:", uri.href);
		
		if (!res.finished) {
			try {
				if (!uri.pathname.startsWith(event.server.opts.root)) throw Classes.Errors.EBADROOT;
				if (event.carriage._global.patherr) throw Classes.Errors.EBADPATH;
				let stats: fs.Stats = await pstat(targ);
				
				if (stats.isFile()) {
					event.server._debug(event.reqcntr, "(STATIC.TS) VALID");
					res.setHeader("Content-Type", event.server.opts.contentMappings[path.extname(targ)]);
					res.end(await serve(targ, event));
				} else {
					event.fncntr -= 2;
					event.server._debug(event.reqcntr, "(STATIC.TS) ISDIR -> JMP: DIRECTORY.TS");
					return event.pass();
				}
			} catch (err) {  //path invalid - 404
				event.carriage._global.patherr = true;
				event.server._debug(event.reqcntr, "(STATIC.TS) ERR: PATHERR");
			}
		} else {
			event.server._debug(event.reqcntr, "(STATIC.TS) FINISHD");
		}
		
		event.server._debug(event.reqcntr, "(STATIC.TS) PASS");
		return event.pass();
	} //body
};

async function serve(file: string, event: Classes.evt, preproc: boolean = true): Promise<string | Buffer> {
	try {
		let data: string,
			prep: RegExp = /\.((html?|css)x|xjs)$/i;
		
		if (cache.has(file)) {
			data = cache.get(file);
			preadFile(file).then((err: Error, buff: Buffer) => {
				if (!err) cache.set(file, buff.toString());
			});
		} else {
			data = (await preadFile(file)).toString();
			cache.set(file, data);
		}
		
		if (prep.test(file)) {
			data = data.replace(event.server.opts.builtmpl, (m, p) => eval(p));
		}
		
		return data;
	} catch (fatal) {
		event.server.log(fatal);
	}
} //serve
