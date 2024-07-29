"use strict";
/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const types_1 = require("./types");
const query_set_1 = require("./query-set");
const switchable_connection_1 = require("./switchable-connection");
const filters_state_1 = require("./filters-state");
/**
 * The main class manages connection and queries.
 */
class ConnectionManager {
    constructor(config, globalListener) {
        this.queriesToQuerySetsAndCallbacks = new Map();
        this.config = config;
        this.globalListener = globalListener;
        this.filtersState = new filters_state_1.FiltersState();
        this.connection = new switchable_connection_1.SwitchableConnection(this.config, this.filtersState);
    }
    /**
     * Connect to Web Socket server
     */
    connect() {
        let self = this;
        this.connection.connect();
        this.connection.onOpen(function (event) {
            const edsEvent = {
                type: types_1.EDSEventType.Open,
                connection: self,
                data: event
            };
            self.handleGlobalListener(edsEvent);
        });
        this.connection.onMessage(function (data) {
            if (!data.error) {
                for (let query in data) {
                    let filterState = self.filtersState.filterForQuery(query);
                    if (filterState) {
                        for (const querySetWithFilter of filterState.querySets) {
                            let edsEvent = {
                                type: types_1.EDSEventType.Message,
                                connection: self,
                                data: data[query],
                                query: query,
                                count: querySetWithFilter.count,
                                retrieve: querySetWithFilter.initialData && querySetWithFilter.count === 0,
                            };
                            for (let callback of querySetWithFilter.callbacks) {
                                try {
                                    callback(edsEvent);
                                }
                                catch (e) {
                                    let msg = `Error while handling data for query: ${query}`;
                                    const edsEvent = {
                                        type: types_1.EDSEventType.ClientQueryError,
                                        connection: self,
                                        data: e,
                                        message: msg,
                                        query: query
                                    };
                                    self.handleErrorListeners(querySetWithFilter.errorCallbacks, query, edsEvent);
                                    self.handleGlobalListener(edsEvent);
                                }
                            }
                        }
                    }
                    /*let querySetsAndCallbacksOnce = self.queriesToQuerySetsAndCallbacks.get(query);
                    if (querySetsAndCallbacksOnce) {
                        let dataForQuery = data[query];
                        querySetsAndCallbacksOnce.count += 1;
                        for (const [qs, callbacks] of querySetsAndCallbacksOnce.qsCb) {
                            for (let callback of callbacks) {
                                //console.log(`Execute callback for query: ${query}`)
                                try {
                                    let edsEvent: EDSEvent & EDSEventMessage = {
                                        type: EDSEventType.Message,
                                        connection: self,
                                        data: dataForQuery,
                                        query: query,
                                        count: querySetsAndCallbacksOnce.count,
                                        retrieve: querySetsAndCallbacksOnce.initial,
                                    }
                                    callback(edsEvent);
                                    self.handleGlobalListener(edsEvent);
                                } catch (e) {
                                    let msg = `Error while handling data for query: ${query}`;
                                    const edsEvent: EDSEvent & EDSEventError = {
                                        type: EDSEventType.ClientQueryError,
                                        connection: self,
                                        data: e,
                                        message: msg,
                                        query: query
                                    };
                                    self.handleErrorListenerForMap(querySetsAndCallbacksOnce, query, edsEvent);
                                    self.handleGlobalListener(edsEvent);
                                }
                            }
                        }
                        if (querySetsAndCallbacksOnce.once) {
                            self.queriesToQuerySetsAndCallbacks.delete(query);
                            //console.log(`Once query deleted from queriesToQuerySetsAndCallbacks: ${query}`);
                        }
                    }*/
                }
            }
            else {
                let msg = data.error;
                const queryErrorPrefix = "Error parsing SQL query:";
                if (msg.startsWith(queryErrorPrefix)) {
                    let query = msg.substring(queryErrorPrefix.length, msg.indexOf("ERROR")).trim();
                    const edsEvent = {
                        type: types_1.EDSEventType.ServerQueryError,
                        connection: self,
                        data: undefined,
                        code: data.code,
                        message: msg,
                        query: query
                    };
                    let querySetsAndCallbacksOnce = self.queriesToQuerySetsAndCallbacks.get(query);
                    if (querySetsAndCallbacksOnce) {
                        self.handleErrorListenerForMap(querySetsAndCallbacksOnce, query, edsEvent);
                    }
                    self.handleGlobalListener(edsEvent);
                }
                else {
                    const edsEvent = {
                        type: types_1.EDSEventType.ServerGlobalError,
                        connection: self,
                        data: undefined,
                        code: data.code,
                        message: msg
                    };
                    self.handleGlobalListener(edsEvent);
                }
            }
        });
        this.connection.onClose(function (event) {
            const edsEvent = {
                type: types_1.EDSEventType.Close,
                connection: self,
                data: event
            };
            self.handleGlobalListener(edsEvent);
        });
        this.connection.onError(function (event) {
            const edsEvent = {
                type: types_1.EDSEventType.ClientGlobalError,
                connection: self,
                data: event,
                message: "Client error",
            };
            self.handleGlobalListener(edsEvent);
        });
    }
    /**
     * Send data directly to web socket
     */
    send(msg) {
        this.connection.send(msg);
    }
    querySet() {
        return new query_set_1.QuerySet(this, this.filtersState);
    }
    /**
     * Disconnect from web socket
     */
    disconnect() {
        this.connection.disconnect();
    }
    /**
     * Get configuration of the connection
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get connection id
     */
    getId() {
        return this.connection.getId();
    }
    /**
     * Check weather it connected
     */
    status() {
        if (this.connection) {
            return this.connection.status();
        }
        else {
            return types_1.ConnectionStatus.Closed;
        }
    }
    handleGlobalListener(edsEvent) {
        var _a;
        try {
            (_a = this.globalListener) === null || _a === void 0 ? void 0 : _a.call(this, edsEvent);
        }
        catch (e) {
            console.warn(`Error while handling global error listener`, e);
        }
    }
    handleErrorListenerForMap(querySetsAndCallbacksOnce, query, edsEvent) {
        for (const [qs, callbacks] of querySetsAndCallbacksOnce.qsErrCb) {
            for (let callback of callbacks) {
                try {
                    callback(edsEvent);
                }
                catch (e) {
                    console.warn(`Error while handling error listener for query: ${query}`, e);
                }
            }
        }
    }
    handleErrorListeners(errorCallbacks, query, edsEvent) {
        for (let callback of errorCallbacks) {
            try {
                callback(edsEvent);
            }
            catch (e) {
                console.warn(`Error while handling error listener for query: ${query}`, e);
            }
        }
    }
}
exports.ConnectionManager = ConnectionManager;
