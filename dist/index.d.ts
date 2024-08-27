/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { Config, EDSEvent, Connection } from "./types";
/**
 * Create a new `Connection` instance.
 *
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @return `Connection` instance.
 * @module connection
 */
export declare function create(config: Config, globalListener: (type: EDSEvent) => void): Connection;
/**
 * Create a new `Connection` instance and establish connection to PhotonIQ EDS.
 *
 * @param config configuration for the connection
 * @param globalListener listen all `EDSEvent` events.
 * @return `Connection` instance.
 * @module connection
 */
export declare function connect(config: Config, globalListener: (type: EDSEvent) => void): Connection;
