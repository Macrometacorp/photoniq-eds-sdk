/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import _ from 'lodash';
import { Config, EDSEvent, Connection } from "./types";
import { ConnectionManager } from "./connection-manager";

/**
 * Create a new connection innstance.
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @module connection
 */
export function create(config: Config, globalListener: (type: EDSEvent) => void): ConnectionManager {
    let connection = new ConnectionManager(config, globalListener);
    return connection;
}

/**
 * Create a new connection innstance and establish connection to PhotonIQ EDS server.
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @module connection
 */
export function connect(config: Config, globalListener: (type: EDSEvent) => void): ConnectionManager {
    let connection = new ConnectionManager(config, globalListener);
    connection.connect();
    return connection;
}

