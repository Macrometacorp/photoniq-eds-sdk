import {
    Config,
    ConnectionProperties,
    ConnectionStatus,
    FilterState,
    InternalConnection,
    PHOTONIQ_ES, WsSubConfig,
} from "../types";
import { FiltersState } from "../filters-state";
import {parametersToUrl, tryToDecodeData} from "../utils";

export class WsConnection implements InternalConnection {
    
    private readonly STUB_FILTER: string = `{"action":"remove","queries":["SELECT * FROM fake"]}`;
    /**
     * Default timeout of ping-pong requests in seconds 
     */
    private readonly DEFAULT_PING_SECONDS = 29;
    
    private config: Config;
    private subConfig: WsSubConfig;
    private filtersState: FiltersState;
    private openListener?: (type: any) => void;
    private propertiesListener?: (type: any) => void;
    private messageListener?: (query: string, filterState: FilterState, data: any) => void;
    private closeListener?: (type: any) => void;
    private errorListener?: (event: any, server: boolean) => void;
    private ws: WebSocket | undefined;
    private pingIntervalId: number | undefined;
    private properties: ConnectionProperties = {};
    
    constructor(config: Config, subConfig: WsSubConfig, filtersState: FiltersState) {
        this.config = config;
        this.subConfig = subConfig;
        this.filtersState = filtersState;
    }
    
    public connect(): void {
        let self = this;
        let baseUrl = this.subConfig.baseUrl ? this.subConfig.baseUrl : `wss://${this.config.host}/api/es/v1/subscribe`;
        let apiKey = this.subConfig.apiKey ? this.subConfig.apiKey : this.config.apiKey;
        let fabric = this.subConfig.fabric ? this.subConfig.fabric : (this.config.fabric ? this.config.fabric : "_system");
        let customerId = this.subConfig.fabric ? this.subConfig.fabric : this.config.customerId;
        let urlParameters = this.subConfig.urlParameters ? this.subConfig.urlParameters : this.config.urlParameters;

        let url: string = baseUrl + parametersToUrl({...{
                    "type": "collection",
                    "x-customer-id": customerId,
                    "apiKey":apiKey,
                    "fabric": fabric,
                    "filters" : this.STUB_FILTER
                }, ...urlParameters});
        this.ws = new WebSocket(url);

        this.ws.addEventListener('open', function(event) {
            self.openListener?.(event);

            // send current subscribed filters.
            let filters = self.filtersState.activeFilters();
            if (self.getStatus() === ConnectionStatus.Open) {
                for (const filter of filters) {
                    self.ws?.send(JSON.stringify(filter));
                    self.filtersState.activeFilterSent(filter);
                }
            }

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
        if (!self.subConfig.pingSeconds || self.subConfig.pingSeconds > 0) {
            this.pingIntervalId = setInterval(() => {
                if (self.getStatus() === ConnectionStatus.Open) {
                    self.ws?.send("{1}");
                }
            }, (self.subConfig.pingSeconds ?? this.DEFAULT_PING_SECONDS) * 1000);
        }
    }
    
}