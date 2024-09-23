import {
    Config,
    ConnectionProperties,
    ConnectionStatus,
    Filter,
    FilterState,
    InternalConnection,
    PHOTONIQ_ES,
} from "../types";
import { FiltersState } from "../filters-state";
import { tryToDecodeData } from "../utils";

export class WsConnection implements InternalConnection {
    
    private readonly STUB_FILTER: string = "%7B%22action%22%3A%22remove%22%2C%22queries%22%3A%5B%22SELECT%20%2A%20FROM%20fake%22%5D%7D";
    /**
     * Default timeout of ping-pong requests in seconds 
     */
    private readonly DEFAULT_PING_SECONDS = 29;
    
    private config: Config;
    private filtersState: FiltersState;
    private openListener?: (type: any) => void;
    private propertiesListener?: (type: any) => void;
    private messageListener?: (query: string, filterState: FilterState, data: any) => void;
    private closeListener?: (type: any) => void;
    private errorListener?: (event: any, server: boolean) => void;
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

            // send current subscribed filters.
            let filters = self.filtersState.activeFilters();
            self.send(filters);

            self.updatePingInterval();
        });

        this.ws.addEventListener('message', function(event) {
            if (self.properties[PHOTONIQ_ES]) {
                tryToDecodeData(event.data).then( data => {
                    if (!data.error) {
                        for (let query in data) {
                            let queryData = data[query];
                            let filterState = self.filtersState.filterForQuery(query);
                            if (filterState) {
                                self.filtersState.increment(filterState);
                                self.messageListener?.(query, filterState, queryData);
                                self.filtersState.tryToRemove(filterState, query);
                                self.flush();
                            }
                        }
                    } else {
                        self.errorListener?.(data, true);
                    }
                });
            } else {
                // retrieve properties
                const lines = event.data.split("\n");
                for (const line of lines) {
                    const keyValue = line.split(":");
                    if (keyValue.length == 2) {
                        self.properties[keyValue[0].trim()] = keyValue[1].trim();
                    }
                }
                self.propertiesListener?.(self.properties);
            }

            self.updatePingInterval();
        });

        this.ws.addEventListener('close', function(event) {
            self.closeListener?.(event);
        });

        this.ws.addEventListener('error', function(event) {
            self.errorListener?.(event, false);
        });
    }

    public onOpen(listener: (event: any) => void): void {
        this.openListener = listener;
    }
    
    public onProperties(listener: (event: any) => void): void {
        this.propertiesListener = listener;
    }

    public onMessage(listener: (query: string, filterState: FilterState, data: any) => void): void {
        this.messageListener = listener;
    }

    public onClose(listener: (event: any) => void): void {
        this.closeListener = listener;
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
        }
    }
    
    public onError(listener: (event: any, server: boolean) => void): void {
        this.errorListener = listener;
    }

    public send(filters: Filter[]): void {
        if (this.getStatus() === ConnectionStatus.Open) {
            for (const filter of filters) {
                this.ws?.send(JSON.stringify(filter));
            }
        }
    }

    flush(): void {
        if (this.getStatus() === ConnectionStatus.Open) {
            let removeFilter = this.filtersState.removeFilter();
            if (removeFilter) {
                this.ws?.send(JSON.stringify(removeFilter));
                this.filtersState.removeFilterSent();
            }
            let activeNotSentFilters = this.filtersState.activeNotSentFilters();
            for (const filter of activeNotSentFilters) {
                this.ws?.send(JSON.stringify(filter));
                this.filtersState.activeFilterSent(filter);
            }
        }
    }
     
    public disconnect(): boolean {
        if (this.ws) {
            this.ws.close();
            return true;
        }
        return false;
    }
     
    public getStatus(): ConnectionStatus {
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
                if (self.getStatus() === ConnectionStatus.Open) {
                    self.ws?.send("{1}");
                }
            }, (self.config.pingSeconds ?? this.DEFAULT_PING_SECONDS) * 1000);
        }
    }
    
}