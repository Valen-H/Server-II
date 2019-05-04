import * as http from "http";
import Classes from "../../lib/Classes";

module.exports = {
	name: "end",
	afters: [ "fix", "directory", "static" ],
	befores: [ ],
	_fromFile: true,
	body: async function body(req: http.IncomingMessage, res: http.ServerResponse, event: Classes.evt): Promise<boolean> {
		if (!res.headersSent) {
			res.setHeader("Server", "Vale_Server-II");
			res.setHeader("Tk", 'N');
		} else {
			res.addTrailers({ "Tk": 'N'});
			res.addTrailers({ "Server": "Vale_Server-II"});
		}
		
		if (!res.finished) {
			res.writeHead(404, event.server.opts.http.STATUS_CODES[404]);
			event.server._debug(event.reqcntr, "(END.TS) 404");
		}
		
		event.server._debug(event.reqcntr, "(END.TS) END");
		res.end();
		return await event.stop();
	} //body
};
