"use strict";

import Classes from "./Classes";
import * as path from "path";
import * as fs from "fs-extra";
import { promisify } from "util";

export module Server {
	
	const paccess: Function = promisify(fs.access),
		copy: Function = promisify(fs.copy),
		ensureDir: Function = promisify(fs.ensureDir);
	
	export async function setup(opts: Classes.Options.ServerOptions, over: boolean = false): Promise<Classes.Server> {
		let nopts: Classes.Options.ServerOptions = { };
		Object.assign(nopts, opts);
		nopts.allowmw = false;
		let server: Classes.Server = new Classes.Server(nopts);

		await ensureDir(server.opts.serveDir);
		try {
			await Promise.all([paccess(path.join(server.opts.serveDir, server.opts.mwdir), fs.constants.R_OK | fs.constants.W_OK),
				paccess(path.join(server.opts.serveDir, server.opts.public), fs.constants.R_OK | fs.constants.W_OK),
				paccess(path.join(server.opts.serveDir, server.opts.private), fs.constants.R_OK | fs.constants.W_OK)]);
		} catch (err) {
			if (server.opts.builtins) {
				await Promise.all([copy(path.join(__dirname, server.opts.mwbuilt), path.join(server.opts.serveDir, server.opts.mwdir), {
					overwrite: over
				}),
					copy(path.join(__dirname, server.opts.prbuilt), path.join(server.opts.serveDir, server.opts.private), {
					overwrite: over
				}),
					copy(path.join(__dirname, server.opts.pubuilt), path.join(server.opts.serveDir, server.opts.public), {
					overwrite: over
				})]);
			} else {
				await Promise.all([ensureDir(path.join(server.opts.serveDir, server.opts.mwdir)),
					ensureDir(path.join(server.opts.serveDir, server.opts.private)),
					ensureDir(path.join(server.opts.serveDir, server.opts.public))]);
			}
		}

		if (opts.allowmw === undefined || opts.allowmw) {
			server.opts.allowmw = true;
			await server._loadMW();
		}
		
		return server;
	} //setup
	
} //Server

export default Server;
export { Classes };
