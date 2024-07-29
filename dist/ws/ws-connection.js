"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsConnection = void 0;
const types_1 = require("../types");
class WsConnection {
    constructor(config, filterState) {
        this.STUB_FILTER = "%7B%22action%22%3A%22remove%22%2C%22queries%22%3A%5B%22SELECT%20%2A%20FROM%20fake%22%5D%7D";
        /**
         * Default timeoput of ping-pong requests in seconds
         */
        this.DEFAULT_PING_SECONDS = 29;
        this.waitingMessages = [];
        this.config = config;
        this.filterState = filterState;
    }
    connect() {
        let self = this;
        let filter;
        if (this.waitingMessages.length) {
            filter = encodeURIComponent(this.waitingMessages.shift());
        }
        else {
            filter = this.STUB_FILTER;
        }
        const url = `wss://${this.config.host}/api/es/v1/subscribe?type=collection` +
            `&x-customer-id=${this.config.customerId}` +
            `&apiKey=${this.config.apiKey}` +
            `&fabric=${this.config.fabric}` +
            `&filters=${filter}`;
        this.ws = new WebSocket(url);
        this.ws.addEventListener('open', function (event) {
            var _a, _b;
            for (const message of self.waitingMessages) {
                (_a = self.ws) === null || _a === void 0 ? void 0 : _a.send(message);
            }
            self.waitingMessages = [];
            (_b = self.openListener) === null || _b === void 0 ? void 0 : _b.call(self, event);
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
        if (self.id) {
            let data = JSON.parse(event.data);
            if (!data.error) {
                for (let query in data) {
                    let queryData = data[query];
                    let filterToRemove = self.filterState.tryToRemove(query);
                    if (filterToRemove) {
                        self.send(JSON.stringify(filterToRemove));
                    }
                    let isInitialData = Array.isArray(queryData);
                    if (isInitialData) {
                        for (let i = 0; i < queryData.length; i++) {
                            queryData[i] = self.convertInitialData(queryData[i]);
                        }
                    }
                    else {
                        queryData = [queryData];
                    }
                }
            }
            return data;
        }
        else {
            // retrieve connection id
            let msg = event.data;
            const i = msg.indexOf(types_1.PHOTONIQ_ES);
            if (i > -1) {
                const start = i + types_1.PHOTONIQ_ES.length + 1;
                const end = msg.indexOf("\n", start);
                self.id = msg.substring(start, end).trim();
            }
            return undefined;
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
    send(msg) {
        var _a;
        if (this.status() === types_1.ConnectionStatus.Open) {
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(msg);
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
                return types_1.ConnectionStatus.Connecting;
            case WebSocket.OPEN:
                return types_1.ConnectionStatus.Open;
            case WebSocket.CLOSING:
                return types_1.ConnectionStatus.Closing;
            default:
                return types_1.ConnectionStatus.Closed;
        }
    }
    getId() {
        return this.id;
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
                self.send("{1}");
            }, ((_a = self.config.pingSeconds) !== null && _a !== void 0 ? _a : this.DEFAULT_PING_SECONDS) * 1000);
        }
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
}
exports.WsConnection = WsConnection;
