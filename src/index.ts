import _ from 'lodash';
import { Config, Connection } from "./connection";


/**
 * Establish connection to PhotonIQ EDS server.
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @module connection
 */
export function connect(config: Config, globalListener: any): Connection {
    let connection = new Connection(config, globalListener);
    connection.connect();
    return connection;
}
