import * as fs from "fs-extra";
import * as path from "path";
import { URL } from "url";
import { promisify } from "util";
import * as http from "http";
//@ts-ignore
import Classes from "../../lib/Classes";
const Classes = module.parent.exports.Classes;

const paccess = promisify(fs.access),
	//@ts-ignore
	pdir = promisify(function readdir(name: string, callback: (err: Error, files: string[]) => any) { return fs.readdir(name, { withFileTypes: true, encoding: "utf8" }, callback); });

module.exports = {
	name: "fix",
	afters: [ ],
	befores: [ "directory", "static", "end" ],
	priorities: [ ".htmx", ".htmlx", ".html", ".htm", ".xjs", ".js", ".cssx", ".css" ].reverse(),
	_fromFile: true,
	body: async function body(req: http.IncomingMessage, res: http.ServerResponse, event: Classes.evt): Promise<boolean> {
		let uri = new URL(`http://127.0.0.1:${event.server.opts.port}${req.url}`),
			pth: string = uri.pathname.replace(new RegExp('^' + event.server.opts.root, "i"), ''),  //localize url
			targ: string = path.join(event.server.opts.serveDir, event.server.opts.public, pth);  //absolute
		
		event.server._debug(event.reqcntr, "(FIX.TS) REQ:", uri.href, pth, targ);
		
		try {  //path valid?
			if (!uri.pathname.startsWith(event.server.opts.root)) throw Classes.Errors.EBADROOT;
			if (event.carriage._global.patherr) throw Classes.Errors.EBADPATH;
			await paccess(targ);  //checks both dir and file
			event.server._debug(event.reqcntr, "(FIX.TS) VALID");
		} catch (err) {
			try {  //parent dir exists?
				if (!uri.pathname.startsWith(event.server.opts.root)) throw Classes.Errors.EBADROOT;
				if (event.carriage._global.patherr) throw Classes.Errors.EBADPATH;
				//@ts-ignore
				let files: fs.Dirent[] = await pdir(path.dirname(targ)),
					reg: RegExp = new RegExp('^' + path.basename(pth), "i"),  //queried filename, recommended: requests without ext
					//@ts-ignore
					pfiles: fs.Dirent[] = files.filter((file: fs.Dirent): boolean => reg.test(file.name)).sort((a: fs.Dirent, b: fs.Dirent): number => {
						let s: [string, string] = [ "", "" ];
						if ((s[0] = path.basename(a.name, path.extname(a.name))) !== (s[1] = path.basename(b.name, path.extname(b.name)))) return s[0].length - s[1].length;
						if (a.isDirectory()) return -1;
						if (b.isDirectory()) return 1;
						return module.exports.priorities.indexOf(path.extname(b.name)) - module.exports.priorities.indexOf(path.extname(a.name));
					});  // ok > ok.txt > okay.txt
					
				if (pfiles[0]) {  //fix found
					uri.pathname = path.join(path.dirname(req.url), pfiles[0].name);
					req.url = uri.pathname + uri.search + uri.hash;
					event.server._debug(event.reqcntr, "(FIX.TS) SERVE:", req.url);
				} else {
					event.server._debug(event.reqcntr, "(FIX.TS) NOFIX");
				}
			} catch (err) {  //superpath invalid - 404
				event.carriage._global.patherr = true;
				event.server._debug(event.reqcntr, "(FIX.TS) ERR: PATHERR");
			}
		}
		
		event.server._debug(event.reqcntr, "(FIX.TS) PASS");
		return event.pass();
	} //body
};
