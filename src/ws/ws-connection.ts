import {
    Config,
    ConnectionProperties,
    ConnectionStatus,
    EDSEvent,
    EDSEventError,
    EDSEventMessage,
    EDSEventType,
    Filter,
    InternalConnection,
    PHOTONIQ_ES
} from "../types";
import {FiltersState} from "../filters-state";

export class WsConnection implements InternalConnection {
    
    private readonly STUB_FILTER: string = "%7B%22action%22%3A%22remove%22%2C%22queries%22%3A%5B%22SELECT%20%2A%20FROM%20fake%22%5D%7D";
    /**
     * Default timeoput of ping-pong requests in seconds 
     */
    private readonly DEFAULT_PING_SECONDS = 29;
    
    private config: Config;
    private filtersState: FiltersState;
    private openListener?: (type: any) => void;
    private messageListener?: (type: any) => void;
    private closeListener?: (type: any) => void;
    private errorListener?: (type: any) => void;
    private ws: WebSocket | undefined;
    private pingIntervalId: number | undefined;
    private properties: ConnectionProperties = {};
    
    constructor(config: Config, filtersState: FiltersState) {
        this.config = config;
        this.filtersState = filtersState;
    }
    
    public connect(): void {
        let self = this;
        const url: string = `wss://${this.config.host}/api/es/v1/subscribe?type=collection` +
            `&x-customer-id=${this.config.customerId}` +
            `&apiKey=${this.config.apiKey}` +
            `&fabric=${this.config.fabric}` +
            `&filters=${this.STUB_FILTER}`;
        this.ws = new WebSocket(url);
        this.ws.addEventListener('open', function(event) {
            self.openListener?.(event);
            self.updatePingInterval();
        });
        this.ws.addEventListener('message', function(event) {
            let message = self.handleMessage(event);
            if (message) {
                self.messageListener?.(message);
            }
            self.updatePingInterval();
        });
        this.ws.addEventListener('close', function(event) {
            self.closeListener?.(event); 
        });
        this.ws.addEventListener('error', function(event) {
            self.errorListener?.(event); 
        });
    }
    
    public onOpen(listener: (event: any) => void): void {
        this.openListener = listener;
    }
    
    public onMessage(listener: (event: any) => void): void {
        this.messageListener = listener;
    }
    
    private handleMessage(event: any): any {
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
                                queryData[i] = self.convertInitialData(queryData[i]);
                            }
                        } else {
                            queryData = [queryData];
                        }

                        for (const querySetWithFilter of filterState.querySets) {
                            if (isInitialData && !querySetWithFilter.initialData) continue;
                            let edsEvent: EDSEvent & EDSEventMessage = {
                                type: EDSEventType.Message,
                                connection: self,
                                data: queryData,
                                query: query,
                                count: querySetWithFilter.count,
                                retrieve: isInitialData,
                            }
                            for (let callback of querySetWithFilter.callbacks) {
                                try {
                                    callback(edsEvent);
                                } catch (e) {
                                    let msg = `Error while handling data for query: ${query}`;
                                    const edsEvent: EDSEvent & EDSEventError = {
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
            } else {
                let msg = data.error;
                const queryErrorPrefix: string = "Error parsing SQL query:";
                if (msg.startsWith(queryErrorPrefix)) {
                    let query = msg.substring(queryErrorPrefix.length, msg.indexOf("ERROR")).trim();
                    const edsEvent: EDSEvent & EDSEventError = {
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
                } else {
                    const edsEvent: EDSEvent & EDSEventError = {
                        type: EDSEventType.ServerGlobalError,
                        connection: self,
                        data: undefined,
                        code: data.code,
                        message: msg
                    };
                    self.filtersState.handleGlobalListener(edsEvent);
                }
            }
        } else {
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
    
    public onClose(listener: (event: any) => void): void {
        this.closeListener = listener;
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
        }
    }
    
    public onError(listener: (event: any) => void): void {
        this.errorListener = listener;
    }
    
    public send(filter: Filter): void {
        if (this.status() === ConnectionStatus.Open) {
            this.ws?.send(JSON.stringify(filter));
        }
    }
     
    public disconnect(): void {
        this.ws?.close();
    }
     
    public status(): ConnectionStatus {
        switch (this.ws?.readyState) {
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
    
    public getId(): string | undefined {
        return this.properties[PHOTONIQ_ES];
    }

    public getProperty(name: string): string | undefined {
        return this.properties[name];
    }

    public getProperties(): ConnectionProperties {
        return this.properties;
    }

    private updatePingInterval() {
        if (this.pingIntervalId !== undefined) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = undefined;
        }
        let self = this;
        if (!self.config.pingSeconds || self.config.pingSeconds > 0) {
            this.pingIntervalId = setInterval(() => {
                if (self.status() === ConnectionStatus.Open) {
                    self.ws?.send("{1}");
                }
            }, (self.config.pingSeconds ?? this.DEFAULT_PING_SECONDS) * 1000);
        }
    }
    
    private convertInitialData(sqlData: any) {
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