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
    /**
     * List of type connections to use in the conection. Order of values means priority of connection.
     * For example, connectionTypes = ["ws", "sse"] means it will initially connect via WebSocket (ws).
     * If unsuccessful, it will try Server-Sent Events (sse), and then loop back to retry WebSocket if needed.
     */
    private connectionTypes;
    /**
     * Value `-1` means it has not been connected yet or disconnected manually.
     * Other values >= 0 mean the count of reconnections made before the established connection.
     */
    private reconnection;
    constructor(config: Config, globalListener: (event: EDSEvent) => void);
    /**
     * Connect to Web Socket server
     */
    connect(): void;
    /**
     * Send data directly to web socket
     */
    send(filters: Filter[]): void;
    /**
     * Disconnect from web socket
     */
    disconnect(): boolean;
    /**
     * Get configuration of the connection
     */
    getConfig(): Config;
    /**
     * Check the connection status
     */
    getStatus(): ConnectionStatus;
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
