/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { Config, EDSEvent } from "./types";
import { QuerySet } from "./query-set";
/**
 * The main class manages connection and queries.
 */
export declare class SwitchableConnection {
    private config;
    private ws;
    private id;
    private queriesToQuerySetsAndCallbacks;
    private pingIntervalId;
    private globalListener;
    private waitingMessages;
    private STUB_FILTER;
    constructor(config: Config, globalListener: (event: EDSEvent) => void);
    reconnect(): void;
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
    getId(): number | undefined;
    /**
     * Check weather it connected
     */
    isConnected(): boolean;
    private convertInitialData;
    private handleGlobalListener;
    private handleErrorListenerForMap;
    private updatePingInterval;
}
