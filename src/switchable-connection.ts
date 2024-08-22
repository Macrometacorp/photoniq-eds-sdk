/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import {Config, InternalConnection, ConnectionStatus, Filter, ConnectionProperties, EDSEventType, EDSEvent, Connection} from "./types";
import {WsConnection} from "./ws/ws-connection";
import {SseConnection} from "./sse/sse-connection";
import {FiltersState} from "./filters-state";
import { QuerySet } from "./query-set";

export class SwitchableConnection implements Connection {

    private readonly config: Config;
    private readonly filtersState: FiltersState;
    private connection?: InternalConnection;
    private connectionTypes = ["ws"];
    private reconnection = -1;
    
    constructor(config: Config, globalListener: (event: EDSEvent) => void) {
        this.config = config;
        this.filtersState =  new FiltersState(globalListener);
    }
    
    /**
     * Connect to Web Socket server
     */
    connect(): void {
        if (this.connection) throw new Error(`Already connected with status: ${this.status()}`);
        
        if (this.config.connectionTypes?.length) {
            this.connectionTypes = this.config.connectionTypes;
        }
        
        let connectionType = this.connectionTypes[this.reconnection % this.connectionTypes.length];
        switch(connectionType) {
            case "ws":
                this.connection = new WsConnection(this.config, this.filtersState);
                break;
            case "sse":
                this.connection = new SseConnection(this.config, this.filtersState);
                break;
            default:
                throw new Error(`Connection type not supported: ${connectionType}`);
        }
        
        let self = this;
        this.connection.onOpen(function(event) {
            let reconnection = self.reconnection;
            self.reconnection = 0;
            if (reconnection === -1) {
                const edsEvent: EDSEvent = {
                    type: EDSEventType.Open,
                    connection: self,
                    data: event
                };
                self.filtersState.handleGlobalListener(edsEvent);
            }
            
            // send current subscribed filters.
            let filters = self.filtersState.activeFilters();
            for (const filter of filters) {
                self.connection?.send(filter);
            }
        });
        this.connection.onMessage(function (event) {
            // handles on higher level, maybe TODO
        });
        this.connection.onError(function (event) {
            // TODO ???

            /*const edsEvent: EDSEvent & EDSEventError = {
                type: EDSEventType.ClientGlobalError,
                connection: self,
                data: event,
                message: "Client error",
            };
            self.filtersState.handleGlobalListener(edsEvent);*/
        });
        this.connection.onClose(function (event) {
            self.connection = undefined;
            if (self.config.autoReconnect !== false && self.reconnection > -1) {
                let millisToReconnect = Math.pow(2, 6 + self.reconnection++);
                setTimeout(function() {
                    self.connect();
                }, millisToReconnect);
            } else {
                self.reconnection = -1;
                const edsEvent: EDSEvent = {
                    type: EDSEventType.Close,
                    connection: self,
                    data: event
                };
                self.filtersState.handleGlobalListener(edsEvent);
            }
        });
        
        this.connection.connect();
    }
    
    /**
     * Send data directly to web socket
     */
    send(filter: Filter): void {
        this.connection?.send(filter);
    }
    
    /**
     * Disconnect from web socket
     */
    disconnect(): void {
        this.reconnection = -1;
        this.connection?.disconnect();
    }
    
    /**
     * Get configuration of the connection
     */
    public getConfig(): Config {
        return this.config;
    }

    /**
     * Check weather it connected
     */
    status(): ConnectionStatus {
        if (this.connection) {
            return this.connection.status();
        } else {
            return ConnectionStatus.Closed;
        }
    }
    
    /**
     * Get connection id
     */
    public getId(): string | undefined {
        return this.connection?.getId();
    }
    
    /**
     * Get property
     */
    public getProperty(name: string): string | undefined {
        return this.connection?.getProperty(name);
    }

    /**
     * Get all properties
     */
    public getProperties(): ConnectionProperties {
        return this.connection ? this.connection.getProperties() : {};
    }

    /**
     * Create Query Set
     */
    public querySet(): QuerySet {
        return new QuerySet(this, this.filtersState);
    }
}