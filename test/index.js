process.env.NODE_DEBUG = "fix,dbg";
process.title = "DEBUG";

const readline = require("readline"),
	fs = require("fs-extra"),
	server = require("../").Server,
	classes = require("../dist/lib/Classes").Classes;

async function start() {
	srv = await server.setup({ }, true);
	await srv.bind();
	await srv.bind(new classes.Middleware("test", [ "end" ], [ "static" ], async function body(req, res, event) {
			event.server._debug(event.reqcntr, "(TEST.TS) PASSED.");
			return event.pass("passed");
		}
	));  //to test bindings ^
	console.debug("Server started...");
	srv.on("log", console.log);
	srv.on("request", (req, res) => console.debug("(INDEX.JS) REQ:", req.url));
	srv.on("_debug", console.debug);
} //start

start();

//REPL
const rl = readline.createInterface({
	input: process.stdin
});

rl.on("line", line => {
	try {
		console.log(eval(line));
	} catch (err) {
		console.error(err);
	}
});

fs.watch("dist/", {
	recursive: true
}, (evt, name) => {
	console.log("Restarting...");
	fs.removeSync("__Server");
	process.exit(2);
});
