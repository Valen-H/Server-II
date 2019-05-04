import * as fs from "fs-extra";
import { EOL } from "os";
import * as path from "path";
import { URL } from "url";
import { promisify } from "util";
import * as http from "http";
//@ts-ignore
import Classes from "../../lib/Classes";
const Classes = module.parent.exports.Classes;

const pstat: Function = promisify(fs.stat),
	preaddir: Function = promisify(fs.readdir),
	preadFile: Function = promisify(fs.readFile);

var dir: string;  //precache builtin file

module.exports = {
	name: "directory",
	afters: [ "fix" ],
	befores: [ "static", "end" ],
	_fromFile: true,
	body: async function body(req: http.IncomingMessage, res: http.ServerResponse, event: Classes.evt): Promise<boolean> {
		let uri = new URL(`http://127.0.0.1:${event.server.opts.port}${req.url}`),
			pth: string = uri.pathname.replace(new RegExp("^." + event.server.opts.root, "i"), ''),  //localize url
			targ: string = path.join(event.server.opts.serveDir, event.server.opts.public, pth);  //absolute
		
		event.server._debug(event.reqcntr, "(DIRECTORY.TS) REQ:", uri.href);
		
		try {  //path valid?
			if (event.carriage._global.patherr) throw Classes.Errors.EBADPATH;
			let stats: fs.Stats = await pstat(targ);
			
			if (!stats.isFile()) {  //request isDir
				if (!pth.endsWith('/')) {
					uri.pathname += '/';
					event.server._debug(event.reqcntr, "(DIRECTORY.TS) REDIR:", uri.href);
					res.writeHead(302, event.server.opts.http.STATUS_CODES[302], {
						"Location": uri.href
					});
					res.end();
					return await event.stop();
				}
				
				let files: string[] = await preaddir(targ),  //throws
					idx: string = files.find((file: string) => event.server.opts.index.test(file)); //finds index -> blocks indexing
				
				if (idx) {  //has index file
					uri.pathname = path.join(uri.pathname, idx);
					req.url = uri.pathname + uri.search + uri.hash;
					event.server._debug(event.reqcntr, "(DIRECTORY.TS) HASINDEX");
				} else {  //has no index
					files = files.filter((file: string) => !event.server.opts.nodir.test(file)); //filter-out __files
					res.writeHead(200, event.server.opts.http.STATUS_CODES[200], { "Content-Type": "text/html; charset=UTF-8" });  //hardcoded ok
					
					event.server._debug(event.reqcntr, "(DIRECTORY.TS) HASNOINDEX");
					
					try {  //has .noindex?
						let noidx: string = (await preadFile(path.join(targ, event.server.opts.noindex))).toString().trim();
						
						if (noidx) {  //.noindex filled
							let regs: RegExp[] = noidx.split(EOL).filter((file: string) => file).map((file: string): RegExp => new RegExp('^' + file + '$', "i"));
							regs.push(/^\.noindex$/i);
							
							event.server._debug(event.reqcntr, "(DIRECTORY.TS) NOINDEXFILLED");
							
							res.end(await index(event, files.filter((file: string) => regs.some((reg: RegExp) => !reg.test(file))), uri));
						} else {  //.noindex empty
							event.server._debug(event.reqcntr, "(DIRECTORY.TS) NOINDEXEMPT");
							res.end(await index(event, [], uri));
						}
					} catch (err) {  //has no .noindex
						event.server._debug(event.reqcntr, "(DIRECTORY.TS) HASNO_NOINDEX");
						res.end(await index(event, files, uri));
					}
				}
			} else { //isFile
				event.server._debug(event.reqcntr, "(DIRECTORY.TS) ISFILE");
			}
			/**
			 * if contains .noindex - empty for all, filled for each.
			 * if contains index.html -> serve, if contains index.js -> execute before.
			 * if contains __files
			 */
		} catch (err) {  //path invalid - 404
			event.carriage._global.patherr = true;
			event.server._debug(event.reqcntr, "(DIRECTORY.TS) ERR: PATHERR");
		}
		
		event.server._debug(event.reqcntr, "(DIRECTORY.TS) PASS");
		return event.pass();
	} //body
};

async function index(event: Classes.evt, files: string[], uri: URL): Promise<string> {  //serve dir.htm
	dir = dir || ((await preadFile(path.join(event.server.opts.serveDir, event.server.opts.private, event.server.opts.dir))).toString());  //builtins, can be cached
	
	let pth: string = uri.pathname.replace(new RegExp("^." + event.server.opts.root, "i"), '');
	
	try {
		return dir.replace(event.server.opts.builtmpl, (m, p) => eval(p));
	} catch (fatal) {
		event.server.log(fatal);
		return dir;
	}
} //index
