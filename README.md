  
# V-Serv-II  
  
***  
  
## Features  
  
1. Middlewares  
    * Propagating  
    * Builtin / Custom  
2. Content-Type mapping  
3. Path-URL mapping customization  
4. Port customization  
5. Templating/Indexing  
6. Event-Oriented  
  
### (Builtin) Middlewares  
  
1. fix - Fixes incorrect URLs  
2. directory - Serves index or performs directory indexing  
    * .noindex (customisable) - empty to block indexing, fill to block specific files  
    * files starting with '__' (customisable) - blocked from indexing by default  
    * TODOs: .notmpl - no templating, and a special request to fetch raw and bypass translation  
3. static - Serves raw content and compiles templated content  
    * Templated content: .xjs, .htmx, .htmlx, .cssx  
4. end - Applies appropriate headers and ends requests  
5. TODO: secure - Prevents bruteforcing / DoS  
  
> Templated content example.htmx: `Hello $$usr$$!`. Translated during serving, change templating characters through server options.  
  
## Usage  
  
```javascript
const server = require("vale-server-ii").Server,
  classes = require("../dist/lib/Classes").Classes;

async function start() {
  srv = await server.setup({ });  /**@param {Classes.Options.ServerOptions} opts - leave empty fields for default*/
  await srv.bind();  //listen()
  await srv.bind(new classes.Middleware("test", [ "end" ], [ "static" ], async function body(req, res, event) {
      event.server._debug(event.reqcntr, "(TEST.TS) PASSED.");
      return event.pass("passed");
    }
  ));  //bind custom middleware
  console.debug("Server started...");
  srv.on("log", console.log);
  srv.on("request", (req, res) => console.debug("(INDEX.JS) REQ:", req.url));
} //start

start();
```  
  
> Enable builtin middlewares with the `allowmw` option.  
> Also take a look in `Classes` to see how things work  
  