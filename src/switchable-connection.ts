/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import {
    Config,
    InternalConnection,
    ConnectionStatus,
    Filter,
    ConnectionProperties,
    EDSEventType,
    EDSEvent,
    Connection,
    EDSEventError,
    EDSEventMessage,
    FilterState
} from "./types";
import { WsConnection } from "./ws/ws-connection";
import { SseConnection } from "./sse/sse-connection";
import { FiltersState } from "./filters-state";
import { QuerySet } from "./query-set";
import { convertInitialData } from "./utils";

export class SwitchableConnection implements Connection {

    private readonly config: Config;
    private readonly filtersState: FiltersState;
    private connection?: InternalConnection;
    /**
     * list of type connections to use in the conection. Order of values means priority of connection.
     * For example, connectionTypes = ["ws", "sse"] means it will initially connect via WebSocket (ws).
     * If unsuccessful, it will try Server-Sent Events (sse), and then loop back to retry WebSocket if needed.
     */
    private connectionTypes = ["ws"];
    /**
     * value `-1` means it has not been connected yet or disconnected manually.
     * other values >= 0 mean the count of reconnections made before the established connection.
     */
    private reconnection = -1;
    
    constructor(config: Config, globalListener: (event: EDSEvent) => void) {
        this.config = config;
        this.filtersState =  new FiltersState(config, globalListener);
    }
    
    /**
     * Connect to Web Socket server
     */
    connect(): void {
        if (this.connection) throw new Error(`Already connected with status: ${this.getStatus()}`);
        
        if (this.config.connectionTypes?.length) {
            this.connectionTypes = this.config.connectionTypes;
        }
        
        if (this.reconnection === -1) this.reconnection = 0;

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
        });

        this.connection.onProperties(function(properties) {
            const edsEvent: EDSEvent = {
                type: EDSEventType.Properties,
                connection: self,
                data: properties
            };
            self.filtersState.handleGlobalListener(edsEvent);

        });

        this.connection.onMessage(function (query: string, filterState: FilterState, data: any) {
            let queryData = data;
            let isInitialData = Array.isArray(queryData);
            if (isInitialData) {
                for (let i = 0; i < queryData.length; i++) {
                    queryData[i] = convertInitialData(queryData[i]);
                }
            } else {
                queryData = [queryData];
            }

            for (const querySetWithFilter of filterState.querySets) {
                if (isInitialData && !querySetWithFilter.initialData) continue;
                let edsEvent: EDSEvent & EDSEventMessage = {
                    type: EDSEventType.Message,
                    connection: self,
                    data: queryData,
                    query: query,
                    count: querySetWithFilter.count,
                    retrieve: isInitialData,
                }
                for (let callback of querySetWithFilter.callbacks) {
                    try {
                        callback(edsEvent);
                    } catch (e) {
                        let msg = `Error while handling data for query: ${query}`;
                        const edsEvent: EDSEvent & EDSEventError = {
                            type: EDSEventType.ClientQueryError,
                            connection: self,
                            data: e,
                            message: msg,
                            query: query
                        };
                        self.filtersState.handleErrorListeners(querySetWithFilter.errorCallbacks, query, edsEvent);
                        self.filtersState.handleGlobalListener(edsEvent);
                    }
                }
            }
        });

        this.connection.onError(function (data: any, server: boolean) {
            if (server) {
                let msg = data.error;
                const queryErrorPrefix: string = "Error parsing SQL query:";
                if (msg.startsWith(queryErrorPrefix)) {
                    let query = msg.substring(queryErrorPrefix.length, msg.indexOf("ERROR")).trim();
                    const edsEvent: EDSEvent & EDSEventError = {
                        type: EDSEventType.ServerQueryError,
                        connection: self,
                        data: undefined,
                        code: data.code,
                        message: msg,
                        query: query
                    };

                    let filterState = self.filtersState.filterForQuery(query);
                    if (filterState) {
                        for (const querySetWithFilter of filterState.querySets) {
                            self.filtersState.handleErrorListeners(querySetWithFilter.errorCallbacks, query, edsEvent);
                        }
                    }
                    self.filtersState.handleGlobalListener(edsEvent);
                } else {
                    const edsEvent: EDSEvent & EDSEventError = {
                        type: EDSEventType.ServerGlobalError,
                        connection: self,
                        data: undefined,
                        code: data.code,
                        message: msg
                    };
                    self.filtersState.handleGlobalListener(edsEvent);
                }
            } else {
                const edsEvent: EDSEvent & EDSEventError = {
                    type: EDSEventType.ClientGlobalError,
                    connection: self,
                    data: data,
                    message: "Client error",
                };
                self.filtersState.handleGlobalListener(edsEvent);
            }
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
    send(filters: Filter[]): void {
        this.connection?.send(filters);
    }
    
    /**
     * Disconnect from web socket
     */
    disconnect(): boolean {
        if (this.reconnection !== -1) {
            this.reconnection = -1;
            this.connection?.disconnect();
            return true;
        }
        return false;
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
    getStatus(): ConnectionStatus {
        if (this.reconnection === -1) {
            return ConnectionStatus.Closed;
        } else if (this.connection) {
            return this.connection.getStatus();
        } else {
            return ConnectionStatus.Connecting;
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