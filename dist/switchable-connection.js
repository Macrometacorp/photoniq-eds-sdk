/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { ConnectionStatus, EDSEventType } from "./types";
import { WsConnection } from "./ws/ws-connection";
import { SseConnection } from "./sse/sse-connection";
import { FiltersState } from "./filters-state";
import { QuerySet } from "./query-set";
export class SwitchableConnection {
    constructor(config, globalListener) {
        this.connectionTypes = ["ws"];
        this.reconnection = -1;
        this.config = config;
        this.filtersState = new FiltersState(globalListener);
    }
    /**
     * Connect to Web Socket server
     */
    connect() {
        var _a;
        console.log("switchable conn");
        if (this.connection)
            throw new Error(`Already connected with status: ${this.status()}`);
        if ((_a = this.config.connectionTypes) === null || _a === void 0 ? void 0 : _a.length) {
            this.connectionTypes = this.config.connectionTypes;
        }
        let connectionType = this.connectionTypes[this.reconnection % this.connectionTypes.length];
        switch (connectionType) {
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
        this.connection.onOpen(function (event) {
            var _a;
            let reconnection = self.reconnection;
            self.reconnection = 0;
            if (reconnection === -1) {
                const edsEvent = {
                    type: EDSEventType.Open,
                    connection: self,
                    data: event
                };
                self.filtersState.handleGlobalListener(edsEvent);
            }
            // send current subscribed filters.
            let filters = self.filtersState.activeFilters();
            for (const filter of filters) {
                (_a = self.connection) === null || _a === void 0 ? void 0 : _a.send(filter);
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
            if (self.reconnection > -1) {
                let millisToReconnect = Math.pow(2, 6 + self.reconnection++);
                console.log("connect es");
                setTimeout(function () {
                    self.connect();
                }, millisToReconnect);
            }
            else {
                self.reconnection = 0;
                const edsEvent = {
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
    send(filter) {
        var _a;
        (_a = this.connection) === null || _a === void 0 ? void 0 : _a.send(filter);
    }
    /**
     * Disconnect from web socket
     */
    disconnect() {
        var _a;
        this.reconnection = -1;
        (_a = this.connection) === null || _a === void 0 ? void 0 : _a.disconnect();
    }
    /**
     * Get configuration of the connection
     */
    getConfig() {
        return this.config;
    }
    /**
     * Check weather it connected
     */
    status() {
        if (this.connection) {
            return this.connection.status();
        }
        else {
            return ConnectionStatus.Closed;
        }
    }
    /**
     * Get connection id
     */
    getId() {
        var _a;
        return (_a = this.connection) === null || _a === void 0 ? void 0 : _a.getId();
    }
    /**
     * Get property
     */
    getProperty(name) {
        var _a;
        return (_a = this.connection) === null || _a === void 0 ? void 0 : _a.getProperty(name);
    }
    /**
     * Get all properties
     */
    getProperties() {
        return this.connection ? this.connection.getProperties() : {};
    }
    /**
     * Create Query Set
     */
    querySet() {
        return new QuerySet(this, this.filtersState);
    }
}
