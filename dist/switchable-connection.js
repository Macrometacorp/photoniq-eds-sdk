"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwitchableConnection = void 0;
const types_1 = require("./types");
const ws_connection_1 = require("./ws/ws-connection");
const sse_connection_1 = require("./sse/sse-connection");
class SwitchableConnection {
    constructor(config, filtersState) {
        this.connectionTypes = ["ws" /*, "sse"*/];
        this.reconnection = 0;
        this.config = config;
        this.filtersState = filtersState;
    }
    connect() {
        if (this.connection)
            throw new Error(`Already connected with status: ${this.status()}`);
        // move primary connection to first position of connectionTypes array
        if (this.config.primaryConnection) {
            let index = this.connectionTypes.indexOf(this.config.primaryConnection);
            if (index === -1)
                throw new Error(`Wrong connection type set as primaryConnection: ${this.config.primaryConnection}`);
            const [primaryConnection] = this.connectionTypes.splice(index, 1);
            this.connectionTypes.unshift(primaryConnection);
        }
        let connectionType = this.connectionTypes[this.reconnection % this.connectionTypes.length];
        switch (connectionType) {
            case "ws":
                this.connection = new ws_connection_1.WsConnection(this.config, this.filtersState);
                break;
            case "sse":
                this.connection = new sse_connection_1.SseConnection(this.config);
                break;
            default:
                throw new Error(`Connection type not supported: ${connectionType}`);
        }
        let self = this;
        this.connection.onOpen(function (event) {
            var _a, _b;
            self.reconnection = 0;
            (_a = self.openListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
            // send current subscribed filters.
            let filters = self.filtersState.activeFilters();
            for (const filter of filters) {
                (_b = self.connection) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify(filter));
            }
        });
        this.connection.onMessage(function (event) {
            var _a;
            (_a = self.messageListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
        });
        this.connection.onError(function (event) {
            var _a;
            (_a = self.errorListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
        });
        this.connection.onClose(function (event) {
            var _a;
            self.connection = undefined;
            if (self.reconnection > -1) {
                let millisToReconnect = Math.pow(2, 6 + self.reconnection++);
                setTimeout(function () {
                    self.connect();
                }, millisToReconnect);
            }
            else {
                self.reconnection = 0;
                (_a = self.closeListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
            }
        });
        this.connection.connect();
    }
    send(msg) {
        var _a;
        /*let filter: Filter = JSON.parse(msg);
        this.filtersState.addFilter(filter);*/
        (_a = this.connection) === null || _a === void 0 ? void 0 : _a.send(msg);
    }
    disconnect() {
        var _a;
        this.reconnection = -1;
        (_a = this.connection) === null || _a === void 0 ? void 0 : _a.disconnect();
    }
    status() {
        if (this.connection) {
            return this.connection.status();
        }
        else {
            return types_1.ConnectionStatus.Closed;
        }
    }
    onOpen(listener) {
        this.openListener = listener;
    }
    onMessage(listener) {
        this.messageListener = listener;
    }
    onClose(listener) {
        this.closeListener = listener;
    }
    onError(listener) {
        this.errorListener = listener;
    }
    getId() {
        var _a;
        return (_a = this.connection) === null || _a === void 0 ? void 0 : _a.getId();
    }
}
exports.SwitchableConnection = SwitchableConnection;
