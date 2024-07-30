"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = exports.EDSEventType = void 0;
const query_set_1 = require("./query-set");
const PHOTONIQ_ES = "x-photoniq-es";
/**
 * List of event types generated by EDS driver
*/
var EDSEventType;
(function (EDSEventType) {
    EDSEventType["Open"] = "open";
    EDSEventType["Close"] = "close";
    EDSEventType["ConnectionId"] = "connection-id";
    EDSEventType["ServerQueryError"] = "server-query-error";
    EDSEventType["ServerGlobalError"] = "server-global-error";
    EDSEventType["ClientQueryError"] = "client-query-error";
    EDSEventType["ClientGlobalError"] = "client-global-error";
    EDSEventType["Message"] = "message";
})(EDSEventType || (exports.EDSEventType = EDSEventType = {}));
/**
 * The main class manages connection and queries.
 */
class Connection {
    constructor(config, globalListener) {
        this.queriesToQuerySetsAndCallbacks = new Map();
        this.waitingMessages = [];
        this.config = config;
        this.globalListener = globalListener;
    }
    /**
     * Connect to web socket
     */
    connect() {
        const url = `wss://${this.config.host}/api/es/v1/subscribe?type=collection` +
            `&x-customer-id=${this.config.customerId}` +
            `&apiKey=${this.config.apiKey}` +
            `&fabric=${this.config.fabric}` +
            `&filters=%7B%22action%22%3A%22remove%22%2C%22queries%22%3A%5B%22SELECT%20%2A%20FROM%20fake%22%5D%7D`;
        this.ws = new WebSocket(url);
        let self = this;
        this.ws.addEventListener('open', function (event) {
            var _a;
            for (let msg of self.waitingMessages) {
                (_a = self.ws) === null || _a === void 0 ? void 0 : _a.send(msg);
            }
            self.waitingMessages = [];
            const edsEvent = {
                type: EDSEventType.Open,
                connection: self,
                data: event
            };
            self.handleGlobalListener(edsEvent);
            self.updatePingInterval();
        });
        this.ws.addEventListener('message', function (event) {
            let msg = event.data;
            if (self.id) {
                let data = JSON.parse(msg);
                if (!data.error) {
                    for (let query in data) {
                        let querySetsAndCallbacksOnce = self.queriesToQuerySetsAndCallbacks.get(query);
                        if (querySetsAndCallbacksOnce) {
                            let dataForQuery = data[query];
                            if (querySetsAndCallbacksOnce.initial && querySetsAndCallbacksOnce.count === 0) {
                                for (let i = 0; i < dataForQuery.length; i++) {
                                    dataForQuery[i] = self.convertInitialData(dataForQuery[i]);
                                }
                            }
                            else {
                                dataForQuery = [dataForQuery];
                            }
                            querySetsAndCallbacksOnce.count += 1;
                            for (const [qs, callbacks] of querySetsAndCallbacksOnce.qsCb) {
                                for (let callback of callbacks) {
                                    //console.log(`Execute callback for query: ${query}`)
                                    try {
                                        let edsEvent = {
                                            type: EDSEventType.Message,
                                            connection: self,
                                            data: dataForQuery,
                                            query: query,
                                            count: querySetsAndCallbacksOnce.count,
                                            retrieve: querySetsAndCallbacksOnce.initial,
                                        };
                                        callback(edsEvent);
                                        self.handleGlobalListener(edsEvent);
                                    }
                                    catch (e) {
                                        let msg = `Error while handling data for query: ${query}`;
                                        const edsEvent = {
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
                                const msg = JSON.stringify({
                                    "action": "remove",
                                    "queries": [query]
                                });
                                self.send(msg);
                                //console.log(`Once query deleted from queriesToQuerySetsAndCallbacks: ${query}`);
                            }
                        }
                    }
                }
                else {
                    let msg = data.error;
                    const queryErrorPrefix = "Error parsing SQL query:";
                    if (msg.startsWith(queryErrorPrefix)) {
                        let query = msg.substring(queryErrorPrefix.length, msg.indexOf("ERROR")).trim();
                        const edsEvent = {
                            type: EDSEventType.ServerQueryError,
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
                            type: EDSEventType.ServerGlobalError,
                            connection: self,
                            data: undefined,
                            code: data.code,
                            message: msg
                        };
                        self.handleGlobalListener(edsEvent);
                    }
                }
            }
            else {
                // retrieve connection id
                const i = msg.indexOf(PHOTONIQ_ES);
                if (i > -1) {
                    const start = i + PHOTONIQ_ES.length + 1;
                    const end = msg.indexOf("\n", start);
                    self.id = parseInt(msg.substring(start, end).trim());
                    const edsEvent = {
                        type: EDSEventType.ConnectionId,
                        connection: self,
                        data: self.id
                    };
                    self.handleGlobalListener(edsEvent);
                }
            }
        });
        this.ws.addEventListener('close', function (event) {
            if (self.pingIntervalId) {
                clearInterval(self.pingIntervalId);
            }
            const edsEvent = {
                type: EDSEventType.Close,
                connection: self,
                data: event
            };
            self.handleGlobalListener(edsEvent);
        });
        this.ws.addEventListener('error', function (event) {
            const edsEvent = {
                type: EDSEventType.ClientGlobalError,
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
        var _a;
        if (this.isConnected()) {
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(msg);
            this.updatePingInterval();
        }
        else {
            this.waitingMessages.push(msg);
        }
    }
    querySet() {
        return new query_set_1.QuerySet(this, this.queriesToQuerySetsAndCallbacks);
    }
    /**
     * Disconnect from web socket
     */
    disconnect() {
        var _a;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
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
        return this.id;
    }
    /**
     * Check weather it connected
     */
    isConnected() {
        var _a;
        return ((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN;
    }
    convertInitialData(sqlData) {
        for (let sqlParameter in sqlData) {
            let path = sqlParameter.split('.');
            if (path.length <= 1) {
                continue;
            }
            let value = sqlData;
            for (let i = 0; i < path.length; i++) {
                if (value[path[i]] === undefined) {
                    value[path[i]] = {};
                }
                // if not last
                if (i < path.length - 1) {
                    value = value[path[i]];
                }
            }
            value[path[path.length - 1]] = sqlData[sqlParameter];
            delete sqlData[sqlParameter];
        }
        return sqlData;
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
    updatePingInterval() {
        var _a;
        if (this.pingIntervalId !== undefined) {
            clearInterval(this.pingIntervalId);
        }
        let self = this;
        this.pingIntervalId = setInterval(() => {
            var _a;
            (_a = self.ws) === null || _a === void 0 ? void 0 : _a.send("{1}");
        }, (_a = self.config.pingSeconds) !== null && _a !== void 0 ? _a : 29 * 1000);
    }
}
exports.Connection = Connection;