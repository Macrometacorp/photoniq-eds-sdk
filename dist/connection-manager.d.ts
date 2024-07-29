/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { Config, EDSEvent, Connection, ConnectionStatus, ConnectionProperties } from "./types";
import { QuerySet } from "./query-set";
/**
 * The main class manages connection and queries.
 */
export declare class ConnectionManager implements Connection {
    private readonly config;
    private readonly connection;
    private readonly filtersState;
    constructor(config: Config, globalListener: (event: EDSEvent) => void);
    /**
     * Connect to Web Socket server
     */
    connect(): void;
    /**
     * Send data directly to web socket
     */
    send(msg: string): void;
    querySet(): QuerySet;
    /**
     * Disconnect from web socket
     */
    disconnect(): void;
    /**
     * Get configuration of the connection
     */
    getConfig(): Config;
    /**
     * Get connection id
     */
    getId(): string | undefined;
    /**
     * Check weather it connected
     */
    status(): ConnectionStatus;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
}
