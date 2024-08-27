import { ConnectionStatus, PHOTONIQ_ES, } from "../types";
import { tryToDecodeData } from "../utils";
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
            // send current subscribed filters.
            let filters = self.filtersState.activeFilters();
            for (const filter of filters) {
                self.send(filter);
            }
            self.updatePingInterval();
        });
        this.ws.addEventListener('message', function (event) {
            var _a;
            if (self.properties[PHOTONIQ_ES]) {
                tryToDecodeData(event.data).then(data => {
                    var _a, _b;
                    if (!data.error) {
                        for (let query in data) {
                            let queryData = data[query];
                            let filterState = self.filtersState.filterForQuery(query);
                            if (filterState) {
                                self.filtersState.increment(filterState);
                                (_a = self.messageListener) === null || _a === void 0 ? void 0 : _a.call(self, query, filterState, queryData);
                                let filterToRemove = self.filtersState.tryToRemove(filterState, query);
                                if (filterToRemove) {
                                    self.send(filterToRemove);
                                }
                            }
                        }
                    }
                    else {
                        (_b = self.errorListener) === null || _b === void 0 ? void 0 : _b.call(self, data, true);
                    }
                });
            }
            else {
                // retrieve properties
                const lines = event.data.split("\n");
                for (const line of lines) {
                    const keyValue = line.split(":");
                    if (keyValue.length == 2) {
                        self.properties[keyValue[0].trim()] = keyValue[1].trim();
                    }
                }
                (_a = self.propertiesListener) === null || _a === void 0 ? void 0 : _a.call(self, self.properties);
            }
            self.updatePingInterval();
        });
        this.ws.addEventListener('close', function (event) {
            var _a;
            (_a = self.closeListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
        });
        this.ws.addEventListener('error', function (event) {
            var _a;
            (_a = self.errorListener) === null || _a === void 0 ? void 0 : _a.call(self, event, false);
        });
    }
    onOpen(listener) {
        this.openListener = listener;
    }
    onProperties(listener) {
        this.propertiesListener = listener;
    }
    onMessage(listener) {
        this.messageListener = listener;
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
        if (this.getStatus() === ConnectionStatus.Open) {
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(filter));
        }
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
            return true;
        }
        return false;
    }
    getStatus() {
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
                if (self.getStatus() === ConnectionStatus.Open) {
                    (_a = self.ws) === null || _a === void 0 ? void 0 : _a.send("{1}");
                }
            }, ((_a = self.config.pingSeconds) !== null && _a !== void 0 ? _a : this.DEFAULT_PING_SECONDS) * 1000);
        }
    }
}
