"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const fs = require("fs-extra");
const path = require("path");
var Classes;
(function (Classes) {
    let Errors;
    (function (Errors) {
        Errors.EBADPATH = new URIError("Bad Path.");
        Errors.EBADROOT = new URIError("Bad Root.");
    })(Errors = Classes.Errors || (Classes.Errors = {})); //Errors
    class Middleware {
        constructor(name, befores = [], afters = [], body, _fromFile = false) {
            this._fromFile = false;
            this._idx = -1;
            this._before = 0;
            this._after = 0;
            this.name = name.toString();
            this.befores = Array.from(befores);
            this.afters = Array.from(afters);
            this.body = body;
            this._fromFile = _fromFile;
        } //ctor
        //@Override
        async body(req, res, event) {
            return false;
        } //body
    } //Middleware
    Classes.Middleware = Middleware;
    class Server extends require("events").EventEmitter {
        constructor(opts = Server.defaultOpts) {
            super();
            this.mwrs = [];
            this.logs = "";
            this._debuglog = "";
            this._reqcntr = 0;
            this.data = {};
            this.opts = Object.assign({}, Server.defaultOpts);
            this.opts = Object.assign(this.opts, opts);
            if (this.opts.allowmw) {
                this._loadMW();
                this.emit("mwloaded");
            }
            this.httpsrv = this.opts.http.createServer(async (req, res) => {
                this.emit("request", req, res);
                let event = {
                    stop: function stop() {
                        return event.stp = true;
                    },
                    pass: (async function pass(data, to) {
                        if (event.fncntr >= 0)
                            event.carriage[to || this.mwrs[event.fncntr].name] = data;
                        if (this.mwrs[++event.fncntr] && !event.stp) {
                            await this.mwrs[event.fncntr].body(req, res, event);
                        }
                        return false;
                    }).bind(this),
                    carriage: {
                        _global: {}
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
        async bind(bb = this.opts.port, rec = true) {
            if (bb instanceof Middleware) {
                this.mwrs.push(bb);
                if (rec)
                    this._recalc();
            }
            else {
                return new Promise((res, rej) => {
                    this.httpsrv.listen(bb, () => res(this.httpsrv));
                });
            }
            return this.httpsrv;
        } //bind
        /**
         * Read middlewares from a directory
         * @param from=path.join(this.opts.serveDir,this.opts.mwdir) - directory
         */
        _loadMW(from = path.join(this.opts.serveDir, this.opts.mwdir)) {
            return fs.readdir(from, (err, files) => {
                if (!err) {
                    for (let file of files) {
                        let name = path.join(this.opts.serveDir, this.opts.mwdir, file);
                        delete require.cache[require.resolve(name)];
                        if (file.endsWith(".js"))
                            this.mwrs.push(require(name));
                    }
                    this._recalc();
                }
                else {
                    this.log(err);
                }
            });
        } //_loadMW
        /**
         * Order middlewares
         */
        _recalc() {
            let cntr = 0, repeat = 0;
            for (let mwr of this.mwrs) {
                mwr._idx = cntr++;
            }
            cntr = 0;
            for (let mwr of this.mwrs) {
                let afters = this.mwrs.filter((mw) => mwr.afters.includes(mw.name)), befores = this.mwrs.filter((mw) => mwr.befores.includes(mw.name)), max = -1, min = this.mwrs.length;
                if (afters.length)
                    max = Math.max(...afters.map((aft) => aft._idx));
                if (befores.length)
                    min = Math.min(...befores.map((bef) => bef._idx));
                mwr._before = min;
                mwr._after = max;
                if (mwr._idx < mwr._after) {
                    repeat = 1;
                }
                else if (mwr._idx > mwr._before) {
                    repeat = 2;
                }
            }
            if (repeat === 2) {
                this.mwrs = this.mwrs.sort((a, b) => a._before - b._before);
            }
            else if (repeat === 1) {
                this.mwrs = this.mwrs.sort((a, b) => a._after - b._after);
            }
            for (let mwr of this.mwrs) {
                mwr._idx = cntr++;
            }
            if (repeat)
                this._recalc();
        } //_recalc
        /**
         * Log stuff
         * @param msg - joined with whitespace
         */
        log(...msg) {
            this.logs += msg.join(' ') + '\n';
            this.emit("log", ...msg);
            return this;
        } //log
        /**
         * Builtin logger
         * @private
         * @param msg - joined with whitespace
         */
        _debug(...msg) {
            this._debuglog += msg.join(' ') + "  ---  " + Date() + '\n';
            this.emit("_debug", ...msg);
            return this;
        } //_debug
    } //Server
    Server.defaultOpts = {
        serveDir: path.resolve("__Server"),
        index: /^index\.html?x?$/i,
        root: '/',
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
    Classes.Server = Server;
})(Classes = exports.Classes || (exports.Classes = {})); //Classes
exports.default = Classes;
