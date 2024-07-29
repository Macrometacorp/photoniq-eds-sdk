/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import {
    Config,
    EDSEvent,
    EDSEventType,
    EDSEventMessage,
    EDSEventError,
    PHOTONIQ_ES,
    InternalConnection,
    Connection,
    ConnectionStatus,
    ConnectionProperties
} from "./types";
import {QuerySet} from "./query-set";
import {SwitchableConnection} from "./switchable-connection"
import { FiltersState, TRUE } from "./filters-state";

/**
 * The main class manages connection and queries.
 */
export class ConnectionManager implements Connection {
    private readonly config: Config;
    private readonly connection: InternalConnection;
    private readonly filtersState: FiltersState;

    constructor(config: Config, globalListener: (event: EDSEvent) => void) {
        this.config = config;
        this.filtersState = new FiltersState(globalListener);
        this.connection = new SwitchableConnection(this.config, this.filtersState);
    }

    /**
     * Connect to Web Socket server
     */
    public connect(): void {
        let self = this;
        this.connection.connect();
        this.connection.onOpen(function (event) {
            const edsEvent: EDSEvent = {
                type: EDSEventType.Open,
                connection: self,
                data: event
            };
            self.filtersState.handleGlobalListener(edsEvent);
        }); 

        this.connection.onMessage(function (data) {
        });

        this.connection.onClose(function (event) {
            const edsEvent: EDSEvent = {
                type: EDSEventType.Close,
                connection: self,
                data: event
            };
            self.filtersState.handleGlobalListener(edsEvent);
        });

        this.connection.onError(function (event) {
            const edsEvent: EDSEvent & EDSEventError = {
                type: EDSEventType.ClientGlobalError,
                connection: self,
                data: event,
                message: "Client error",
            };
            self.filtersState.handleGlobalListener(edsEvent);
        });
    }

    /**
     * Send data directly to web socket
     */
    public send(msg: string): void {
        this.connection.send(msg);
        
    }

    public querySet(): QuerySet {
        return new QuerySet(this, this.filtersState);
    }

    /**
     * Disconnect from web socket
     */
    public disconnect(): void {
        this.connection.disconnect();
    }

    /**
     * Get configuration of the connection
     */
    public getConfig(): Config {
        return this.config;
    }

    /**
     * Get connection id
     */
    public getId(): string | undefined {
        return this.connection.getId();
    }

    /**
     * Check weather it connected
     */
    public status(): ConnectionStatus {
        return this.connection.status();
    }

    public getProperty(name: string): string | undefined {
        return this.connection.getProperty(name);
    }
    public getProperties(): ConnectionProperties {
        return this.connection.getProperties();
    }

}


