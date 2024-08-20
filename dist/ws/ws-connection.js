import { ConnectionStatus, EDSEventType, PHOTONIQ_ES } from "../types";
import { convertInitialData } from "../utils";
export class WsConnection {
    constructor(config, filtersState) {
        this.STUB_FILTER = "%7B%22action%22%3A%22remove%22%2C%22queries%22%3A%5B%22SELECT%20%2A%20FROM%20fake%22%5D%7D";
        /**
         * Default timeoput of ping-pong requests in seconds
         */
        this.DEFAULT_PING_SECONDS = 29;
        this.properties = {};
        this.config = config;
        this.filtersState = filtersState;
    }
    connect() {
        let self = this;
        const url = `wss://${this.config.host}/api/es/v1/subscribe?type=collection` +
            `&x-customer-id=${this.config.customerId}` +
            `&apiKey=${this.config.apiKey}` +
            `&fabric=${this.config.fabric}` +
            `&filters=${this.STUB_FILTER}`;
        this.ws = new WebSocket(url);
        this.ws.addEventListener('open', function (event) {
            var _a;
            (_a = self.openListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
            self.updatePingInterval();
        });
        this.ws.addEventListener('message', function (event) {
            var _a;
            let message = self.handleMessage(event);
            if (message) {
                (_a = self.messageListener) === null || _a === void 0 ? void 0 : _a.call(self, message);
            }
            self.updatePingInterval();
        });
        this.ws.addEventListener('close', function (event) {
            var _a;
            (_a = self.closeListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
        });
        this.ws.addEventListener('error', function (event) {
            var _a;
            (_a = self.errorListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
        });
    }
    onOpen(listener) {
        this.openListener = listener;
    }
    onMessage(listener) {
        this.messageListener = listener;
    }
    handleMessage(event) {
        let self = this;
        if (self.properties[PHOTONIQ_ES]) {
            let data = JSON.parse(event.data);
            if (!data.error) {
                for (let query in data) {
                    let queryData = data[query];
                    let filterState = self.filtersState.filterForQuery(query);
                    if (filterState) {
                        self.filtersState.increment(filterState);
                        let isInitialData = Array.isArray(queryData);
                        if (isInitialData) {
                            for (let i = 0; i < queryData.length; i++) {
                                queryData[i] = convertInitialData(queryData[i]);
                            }
                        }
                        else {
                            queryData = [queryData];
                        }
                        for (const querySetWithFilter of filterState.querySets) {
                            if (isInitialData && !querySetWithFilter.initialData)
                                continue;
                            let edsEvent = {
                                type: EDSEventType.Message,
                                connection: self,
                                data: queryData,
                                query: query,
                                count: querySetWithFilter.count,
                                retrieve: isInitialData,
                            };
                            for (let callback of querySetWithFilter.callbacks) {
                                try {
                                    callback(edsEvent);
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
                                    self.filtersState.handleErrorListeners(querySetWithFilter.errorCallbacks, query, edsEvent);
                                    //self.filtersState.handleGlobalListener(edsEvent);
                                }
                            }
                        }
                        let filterToRemove = self.filtersState.tryToRemove(filterState, query);
                        if (filterToRemove) {
                            self.send(filterToRemove);
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
                    let filterState = self.filtersState.filterForQuery(query);
                    if (filterState) {
                        for (const querySetWithFilter of filterState.querySets) {
                            self.filtersState.handleErrorListeners(querySetWithFilter.errorCallbacks, query, edsEvent);
                        }
                    }
                    //self.filtersState.handleGlobalListener(edsEvent);
                }
                else {
                    const edsEvent = {
                        type: EDSEventType.ServerGlobalError,
                        connection: self,
                        data: undefined,
                        code: data.code,
                        message: msg
                    };
                    self.filtersState.handleGlobalListener(edsEvent);
                }
            }
        }
        else {
            // retrieve properties
            const lines = event.data.split("\n");
            for (const line of lines) {
                const keyValue = line.split(":");
                if (keyValue.length == 2) {
                    this.properties[keyValue[0].trim()] = keyValue[1].trim();
                }
            }
        }
    }
    onClose(listener) {
        this.closeListener = listener;
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
        }
    }
    onError(listener) {
        this.errorListener = listener;
    }
    send(filter) {
        var _a;
        if (this.status() === ConnectionStatus.Open) {
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(filter));
        }
    }
    disconnect() {
        var _a;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
    }
    status() {
        var _a;
        switch ((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) {
            case WebSocket.CONNECTING:
                return ConnectionStatus.Connecting;
            case WebSocket.OPEN:
                return ConnectionStatus.Open;
            case WebSocket.CLOSING:
                return ConnectionStatus.Closing;
            default:
                return ConnectionStatus.Closed;
        }
    }
    getId() {
        return this.properties[PHOTONIQ_ES];
    }
    getProperty(name) {
        return this.properties[name];
    }
    getProperties() {
        return this.properties;
    }
    updatePingInterval() {
        var _a;
        if (this.pingIntervalId !== undefined) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = undefined;
        }
        let self = this;
        if (!self.config.pingSeconds || self.config.pingSeconds > 0) {
            this.pingIntervalId = setInterval(() => {
                var _a;
                if (self.status() === ConnectionStatus.Open) {
                    (_a = self.ws) === null || _a === void 0 ? void 0 : _a.send("{1}");
                }
            }, ((_a = self.config.pingSeconds) !== null && _a !== void 0 ? _a : this.DEFAULT_PING_SECONDS) * 1000);
        }
    }
}
