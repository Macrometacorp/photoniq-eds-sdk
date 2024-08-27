var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ConnectionStatus, PHOTONIQ_ES } from "../types";
import { EventSource } from "./event-source";
import { ADD, FALSE, TRUE } from "../filters-state";
import { decodeGzip } from "../utils";
export class SseConnection {
    constructor(config, filtersState) {
        this.ENCODED_GZ_CONTENT = "encoded-gz-content: ";
        this.FAILED_TO_PARSE_QUERY = "Failed to parse query: ";
        this.config = config;
        this.filtersState = filtersState;
        this.url = `https://${this.config.host}/api/es/sse/v1/subscribe`;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `${this.config.apiKey}`,
            'x-customer-id': `${this.config.customerId}`,
        };
        this.status = ConnectionStatus.Closed;
    }
    send(filter) {
        if (filter) {
            if (this.eventSource) {
                this.eventSource.disconnect();
                this.eventSource = undefined;
            }
            this.connect();
        }
    }
    /**
     * Connect to SSE server
     */
    connect() {
        if (this.eventSource)
            throw Error("SSE connection already opened");
        let filters = this.filtersState.activeFilters();
        this.retrieve(filters);
    }
    retrieve(filters) {
        var _a;
        let queries = filters
            .filter(f => f.initialData === TRUE)
            .map(f => f.queries)
            .reduce((acc, tags) => acc.concat(tags), []);
        if (!queries.length) {
            this.subscribe(filters);
            return;
        }
        let comress = filters
            .filter(f => f.initialData === TRUE)
            .some(f => f.compress);
        let data = {
            type: "collection",
            fabric: this.config.fabric,
            filters: {
                once: TRUE,
                compress: comress ? TRUE : FALSE,
                initialData: TRUE,
                queries: queries
            }
        };
        let self = this;
        if (!this.eventSource) {
            (_a = this.openListener) === null || _a === void 0 ? void 0 : _a.call(this, "SSE connection opened");
        }
        this.eventSource = new EventSource(this.url, this.headers);
        this.eventSource.onOpen((event) => {
            var _a;
            if (self.status === ConnectionStatus.Connecting) {
                self.status = ConnectionStatus.Open;
                (_a = self.openListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
            }
        });
        this.eventSource.onProperties((event) => {
            var _a;
            (_a = self.propertiesListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
        });
        this.eventSource.onError((event) => {
            var _a;
            (_a = self.errorListener) === null || _a === void 0 ? void 0 : _a.call(self, event, false);
        });
        this.eventSource.onMessage((message) => {
            self.handleMessage(message).then(result => {
                var _a;
                if (result) {
                    (_a = self.eventSource) === null || _a === void 0 ? void 0 : _a.disconnect();
                    self.eventSource = undefined;
                    self.subscribe(filters);
                }
            });
        });
        if (this.status === ConnectionStatus.Closed) {
            this.status = ConnectionStatus.Connecting;
        }
        this.eventSource.connect(data);
    }
    subscribe(filters) {
        let queries = filters
            .filter(f => f.once !== TRUE)
            .map(f => f.queries)
            .reduce((acc, tags) => acc.concat(tags), []);
        if (!queries.length) {
            return;
        }
        let comress = filters
            .filter(f => f.once !== TRUE)
            .some(f => f.compress);
        let data = {
            type: "collection",
            fabric: this.config.fabric,
            filters: {
                action: ADD,
                filterType: "SQL",
                once: FALSE,
                compress: comress ? TRUE : FALSE,
                initialData: FALSE,
                queries: queries
            }
        };
        let self = this;
        this.eventSource = new EventSource(this.url, this.headers);
        this.eventSource.onOpen((event) => {
            var _a;
            if (self.status === ConnectionStatus.Connecting) {
                self.status = ConnectionStatus.Open;
                (_a = self.openListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
            }
        });
        this.eventSource.onError((event) => {
            var _a;
            (_a = self.errorListener) === null || _a === void 0 ? void 0 : _a.call(self, event, false);
        });
        this.eventSource.onProperties((event) => {
            var _a;
            (_a = self.propertiesListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
        });
        this.eventSource.onMessage((message) => {
            self.handleMessage(message);
        });
        this.eventSource.onClose((event) => {
            var _a;
            if (this.status === ConnectionStatus.Closing) {
                this.status = ConnectionStatus.Closed;
                (_a = self.closeListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
            }
        });
        if (this.status === ConnectionStatus.Closed) {
            this.status = ConnectionStatus.Connecting;
        }
        this.eventSource.connect(data);
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
    }
    onError(listener) {
        this.errorListener = listener;
    }
    getStatus() {
        return this.status;
    }
    disconnect() {
        var _a;
        if (this.eventSource) {
            this.status = ConnectionStatus.Closing;
            (_a = this.eventSource) === null || _a === void 0 ? void 0 : _a.disconnect();
            this.eventSource = undefined;
            return true;
        }
        return false;
    }
    getId() {
        return this.getProperty(PHOTONIQ_ES);
    }
    getProperty(name) {
        var _a;
        return (_a = this.eventSource) === null || _a === void 0 ? void 0 : _a.getProperty(name);
    }
    getProperties() {
        return this.eventSource ? this.eventSource.getProperties() : {};
    }
    handleMessage(message) {
        return this.tryToDecodeData(message).then(data => {
            var _a, _b;
            if (!data.error) {
                for (let query in data) {
                    let queryData = data[query];
                    let filterState = this.filtersState.filterForQuery(query);
                    if (filterState) {
                        this.filtersState.increment(filterState);
                        (_a = this.messageListener) === null || _a === void 0 ? void 0 : _a.call(this, query, filterState, queryData);
                        this.filtersState.tryToRemove(filterState, query);
                    }
                }
                return true;
            }
            else {
                (_b = this.errorListener) === null || _b === void 0 ? void 0 : _b.call(this, data, true);
                return false;
            }
        });
    }
    tryToDecodeData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (data.startsWith(this.ENCODED_GZ_CONTENT)) {
                    try {
                        decodeGzip(data.substring(this.ENCODED_GZ_CONTENT.length)).then(decoded => resolve(JSON.parse(decoded)));
                    }
                    catch (e) {
                        reject(e);
                    }
                }
                else if (data.startsWith(this.FAILED_TO_PARSE_QUERY)) {
                    resolve({
                        error: data,
                        code: 400
                    });
                }
                else {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }
}
