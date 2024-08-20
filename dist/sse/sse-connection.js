import { ConnectionStatus, EDSEventType, PHOTONIQ_ES } from "../types";
import { EventSource } from "./event-source";
import { FALSE, TRUE } from "../filters-state";
import { convertInitialData, tryToDecodeData } from "../utils";
export class SseConnection {
    constructor(config, filtersState) {
        this.opened = false;
        this.config = config;
        this.filtersState = filtersState;
        this.url = `https://${this.config.host}/api/es/sse/v1/subscribe`;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `${this.config.apiKey}`,
            'x-customer-id': `${this.config.customerId}`,
        };
    }
    send(filter) {
        if (filter && this.opened) {
            this.disconnect();
            let filters = this.filtersState.activeFilters();
            this.retrieve(filters);
        }
    }
    /**
     * Connect to SSE server
     */
    connect() {
        var _a;
        // it establishes virtual connection.
        if (this.opened)
            throw Error("SSE connection already opened");
        this.opened = true;
        (_a = this.openListener) === null || _a === void 0 ? void 0 : _a.call(this, "SSE connection opened");
    }
    retrieve(filters) {
        var _a;
        if (!this.opened) {
            this.opened = true;
            (_a = this.openListener) === null || _a === void 0 ? void 0 : _a.call(this, "SSE connection opened");
        }
        let queries = filters
            .filter(f => f.initialData === TRUE)
            .map(f => f.queries)
            .reduce((acc, tags) => acc.concat(tags), []);
        if (!queries.length) {
            this.subscribe(filters);
            return;
        }
        let data = {
            type: "collection",
            fabric: this.config.fabric,
            filters: {
                once: TRUE,
                compress: FALSE,
                initialData: TRUE,
                queries: queries
            }
        };
        let self = this;
        this.eventSource = new EventSource(this.url, this.headers);
        this.eventSource.onError((event) => {
            const edsEvent = {
                type: EDSEventType.ClientGlobalError,
                connection: self,
                data: event
            };
            this.filtersState.handleGlobalListener(edsEvent);
        });
        this.eventSource.onMessage((message) => {
            self.handleMessage(message).then(result => {
                var _a;
                if (result) {
                    (_a = self.eventSource) === null || _a === void 0 ? void 0 : _a.disconnect();
                    self.subscribe(filters);
                }
            });
        });
        this.eventSource.connect(data);
    }
    subscribe(filters) {
        var _a;
        if (!this.opened) {
            this.opened = true;
            (_a = this.openListener) === null || _a === void 0 ? void 0 : _a.call(this, "SSE connection opened");
        }
        let queries = filters
            .filter(f => f.once !== TRUE)
            .map(f => f.queries)
            .reduce((acc, tags) => acc.concat(tags), []);
        if (!queries.length) {
            return;
        }
        let data = {
            type: "collection",
            fabric: this.config.fabric,
            filters: {
                once: FALSE,
                compress: FALSE,
                initialData: FALSE,
                queries: queries
            }
        };
        let self = this;
        this.eventSource = new EventSource(this.url, this.headers);
        this.eventSource.onError((event) => {
            const edsEvent = {
                type: EDSEventType.ClientGlobalError,
                connection: self,
                data: event
            };
            this.filtersState.handleGlobalListener(edsEvent);
        });
        this.eventSource.onMessage((message) => {
            self.handleMessage(message);
        });
        this.eventSource.onClose((event) => {
            var _a;
            if (this.opened) {
                this.opened = false;
                (_a = self.closeListener) === null || _a === void 0 ? void 0 : _a.call(self, event);
            }
        });
        this.eventSource.connect(data);
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
    status() {
        return this.opened ? ConnectionStatus.Open : ConnectionStatus.Closed;
    }
    disconnect() {
        var _a;
        (_a = this.eventSource) === null || _a === void 0 ? void 0 : _a.disconnect();
        this.eventSource = undefined;
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
        return tryToDecodeData(message).then(data => {
            if (!data.error) {
                for (let query in data) {
                    let queryData = data[query];
                    let filterState = this.filtersState.filterForQuery(query);
                    if (filterState) {
                        this.filtersState.increment(filterState);
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
                                connection: this,
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
                                        connection: this,
                                        data: e,
                                        message: msg,
                                        query: query
                                    };
                                    this.filtersState.handleErrorListeners(querySetWithFilter.errorCallbacks, query, edsEvent);
                                    //self.filtersState.handleGlobalListener(edsEvent);
                                }
                            }
                        }
                        let filterToRemove = this.filtersState.tryToRemove(filterState, query);
                    }
                }
                return true;
            }
            else {
                let msg = data.error;
                const queryErrorPrefix = "Error parsing SQL query:";
                if (msg.startsWith(queryErrorPrefix)) {
                    let query = msg.substring(queryErrorPrefix.length, msg.indexOf("ERROR")).trim();
                    const edsEvent = {
                        type: EDSEventType.ServerQueryError,
                        connection: this,
                        data: undefined,
                        code: data.code,
                        message: msg,
                        query: query
                    };
                    let filterState = this.filtersState.filterForQuery(query);
                    if (filterState) {
                        for (const querySetWithFilter of filterState.querySets) {
                            this.filtersState.handleErrorListeners(querySetWithFilter.errorCallbacks, query, edsEvent);
                        }
                    }
                    //self.filtersState.handleGlobalListener(edsEvent);
                }
                else {
                    const edsEvent = {
                        type: EDSEventType.ServerGlobalError,
                        connection: this,
                        data: undefined,
                        code: data.code,
                        message: msg
                    };
                    this.filtersState.handleGlobalListener(edsEvent);
                }
            }
            return false;
        });
    }
}
