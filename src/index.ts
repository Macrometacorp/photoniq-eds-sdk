/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import _ from 'lodash';
import { Config, Connection, EDSEvent } from "./connection";


/**
 * Establish connection to PhotonIQ EDS server.
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @module connection
 */
export function connect(config: Config, globalListener: (type: EDSEvent) => void): Connection {
    let connection = new Connection(config, globalListener);
    connection.connect();
    return connection;
}
