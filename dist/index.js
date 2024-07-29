"use strict";
/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const connection_manager_1 = require("./connection-manager");
/**
 * Establish connection to PhotonIQ EDS server.
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @module connection
 */
function connect(config, globalListener) {
    let connection = new connection_manager_1.ConnectionManager(config, globalListener);
    connection.connect();
    return connection;
}
exports.connect = connect;
