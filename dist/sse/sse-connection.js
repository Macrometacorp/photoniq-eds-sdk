import { EDSEventType, ConnectionStatus, PHOTONIQ_ES } from "../types";
import { EventSource } from "./event-source";
import { FALSE, TRUE } from "../filters-state";
export class SseConnection {
    constructor(config, filtersState) {
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
    }
    /**
     * Connect to SSE server
     */
    connect() {
        let filters = this.filtersState.activeFilters();
        this.retrieve(filters);
        /*const url: string = `https://${this.config.host}/api/es/sse/v1/subscribe`;
        let data = {
            "type": "collection",
            "fabric": "_system",
            "filters": {
                "once": "FALSE",
                "compress": "FALSE",
                "initialData":"TRUE",
                "queries": ["select * from box_trim where attendance=4"]
            }
        };
        
        this.sseSubscribe = new EventSource(url, {
            'Content-Type': 'application/json',
            'Authorization': `${this.config.apiKey}`,
            'x-customer-id': `${this.config.customerId}`,
        });*/
        //let self = this;
        //this.sseSubscribe.onOpen = (event: any) => {
        //    console.log('Connection to SSE server opened.', event);
        /*const edsEvent: EDSEvent = {
            type: EDSEventType.Open,
            connection: self,
            data: event
        };
        self.handleGlobalListener(edsEvent);*/
        //};
        //this.sseSubscribe.onMessage((event: any) => {
        //    console.log('Received event:', event);
        /*const edsEvent: EDSEvent = {
            type: EDSEventType.Message,
            connection: self,
            data: event
        };
        self.handleGlobalListener(edsEvent);*/
        //});
        //this.sseSubscribe.onError = (event: any) => {
        //    console.error('Error occurred:', event);
        /*const edsEvent: EDSEvent = {
            type: EDSEventType.ClientGlobalError,
            connection: self,
            data: event
        };
        self.handleGlobalListener(edsEvent);*/
        //};
        //this.sseSubscribe.connect(data);
    }
    retrieve(filters) {
        let queries = filters
            .filter(f => f.initialData === TRUE)
            .map(f => f.queries)
            .reduce((acc, tags) => acc.concat(tags), []);
        if (!queries.length) {
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
            var _a;
            if (self.handleMessage(message)) {
                (_a = self.eventSource) === null || _a === void 0 ? void 0 : _a.disconnect();
                self.subscribe(filters);
            }
        });
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
        return ConnectionStatus.Closed;
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
        let data = JSON.parse(message);
        if (!data.error) {
            for (let query in data) {
                let queryData = data[query];
                let filterState = this.filtersState.filterForQuery(query);
                if (filterState) {
                    this.filtersState.increment(filterState);
                    let isInitialData = Array.isArray(queryData);
                    if (isInitialData) {
                        for (let i = 0; i < queryData.length; i++) {
                            queryData[i] = this.convertInitialData(queryData[i]);
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
