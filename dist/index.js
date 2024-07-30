"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const connection_1 = require("./connection");
/**
 * Establish connection to PhotonIQ EDS server.
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @module connection
 */
function connect(config, globalListener) {
    let connection = new connection_1.Connection(config, globalListener);
    connection.connect();
    return connection;
}
exports.connect = connect;
