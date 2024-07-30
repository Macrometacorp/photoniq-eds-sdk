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