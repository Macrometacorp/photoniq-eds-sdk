/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { SwitchableConnection } from "./switchable-connection";
/**
 * Create a new `Connection` instance.
 *
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @return `Connection` instance.
 * @module connection
 */
export function create(config, globalListener) {
    return new SwitchableConnection(config, globalListener);
}
/**
 * Create a new `Connection` instance and establish connection to PhotonIQ EDS.
 *
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @return `Connection` instance.
 * @module connection
 */
export function connect(config, globalListener) {
    let connection = new SwitchableConnection(config, globalListener);
    connection.connect();
    return connection;
}
