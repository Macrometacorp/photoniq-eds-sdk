/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { Config, ConnectionStatus, Filter, ConnectionProperties, EDSEvent, Connection } from "./types";
import { QuerySet } from "./query-set";
export declare class SwitchableConnection implements Connection {
    private readonly config;
    private readonly filtersState;
    private connection?;
    private connectionTypes;
    private reconnection;
    constructor(config: Config, globalListener: (event: EDSEvent) => void);
    /**
     * Connect to Web Socket server
     */
    connect(): void;
    /**
     * Send data directly to web socket
     */
    send(filter: Filter): void;
    /**
     * Disconnect from web socket
     */
    disconnect(): void;
    /**
     * Get configuration of the connection
     */
    getConfig(): Config;
    /**
     * Check weather it connected
     */
    status(): ConnectionStatus;
    /**
     * Get connection id
     */
    getId(): string | undefined;
    /**
     * Get property
     */
    getProperty(name: string): string | undefined;
    /**
     * Get all properties
     */
    getProperties(): ConnectionProperties;
    /**
     * Create Query Set
     */
    querySet(): QuerySet;
}
