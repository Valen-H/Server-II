import Classes from "./Classes";
export declare module Server {
    /**
     * A wrapper for setting up the Server.
     *
     * @author V. H.
     * @date 2019-05-12
     * @export
     * @param {Classes.Options.ServerOptions} opts
     * @param {boolean} [over=false]
     * @returns {Promise<Classes.Server>}
     */
    function setup(opts: Classes.Options.ServerOptions, over?: boolean): Promise<Classes.Server>;
}
export default Server;
export { Classes };
