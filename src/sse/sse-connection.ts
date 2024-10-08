import {
    Config,
    ConnectionProperties,
    ConnectionStatus,
    Filter,
    FilterState,
    InternalConnection,
    PHOTONIQ_ES, SseSubConfig
} from "../types";
import {EventSource} from "./event-source"
import {ADD, FALSE, FiltersState, TRUE} from "../filters-state";
import {decodeGzip, parametersToUrl} from "../utils";

export class SseConnection implements InternalConnection {
    private readonly config: Config;
    private subConfig: SseSubConfig;
    private readonly filtersState: FiltersState;
    private readonly url: string;
    private readonly fabric: string;
    private readonly headers: HeadersInit;
    private eventSource?: EventSource;
    private status: ConnectionStatus;
    private retrievingInitialData: boolean;
    private retrieveTimeout: number | undefined;
    /**
     * When initial data retrieved long time and flush timeout passed needs to check flag to retrieve data again.
     */
    private retrieveInitialDataAgain: boolean;
    
    private readonly ENCODED_GZ_CONTENT: string = "encoded-gz-content: ";
    private readonly FAILED_TO_PARSE_QUERY: string = "Failed to parse query: ";
    private readonly DEFAULT_FLUSH_TIMEOUT_MS: number = 20;

    private openListener?: (type: any) => void;
    private propertiesListener?: (type: any) => void;
    private messageListener?: (query: string, filterState: FilterState, data: any) => void;
    private closeListener?: (type: any) => void;
    private errorListener?: (type: any, server: boolean) => void;
    
    constructor(config: Config, subConfig: SseSubConfig, filtersState: FiltersState) {
        this.config = config;
        this.subConfig = subConfig;
        this.filtersState = filtersState;
        let baseUrl = this.subConfig.baseUrl ? this.subConfig.baseUrl : `https://${this.config.host}/api/es/sse/v1/subscribe`;
        let urlParameters = subConfig.urlParameters ? subConfig.urlParameters : config.urlParameters;
        this.url = baseUrl + parametersToUrl(urlParameters);
        let apiKey = this.subConfig.apiKey ? this.subConfig.apiKey : this.config.apiKey;
        this.fabric = this.subConfig.fabric ? this.subConfig.fabric : (this.config.fabric ? this.config.fabric : "_system");
        let customerId = this.subConfig.fabric ? this.subConfig.fabric : this.config.customerId;
        this.retrievingInitialData = false;
        this.retrieveInitialDataAgain = false;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `${apiKey}`,
            'x-customer-id': `${customerId}`,
        };
        this.status = ConnectionStatus.Closed;
    }

    public flush(): void {
        let self = this;
        if (!this.retrieveTimeout) {
            this.retrieveTimeout = setTimeout(function() {
                self.retrieveTimeout = undefined;
                if (!self.retrievingInitialData) {
                    self.flushNow();
                } else {
                    self.retrieveInitialDataAgain = true;
                }
            }, this.subConfig?.flushTimeoutMs !== undefined ? this.subConfig.flushTimeoutMs : this.DEFAULT_FLUSH_TIMEOUT_MS );
        }
    }

    private flushNow() {
        let activeNotSentFilters = this.filtersState.activeNotSentFilters();
        if (activeNotSentFilters.length > 0) {
            let activeFilters = this.filtersState.activeFilters();
            let initialDataNotSentQueries = activeNotSentFilters
                .filter(f => f.initialData === TRUE)
                .map(f => f.queries)
                .reduce((acc, tags) => acc.concat(tags), []);
            this.filtersState.activeFiltersSent(activeNotSentFilters);
            if (initialDataNotSentQueries.length) {
                let compress = activeNotSentFilters
                    .filter(f => f.initialData === TRUE)
                    .some(f => f.compress);
                this.retrievingInitialData = true;
                this.retrieve(initialDataNotSentQueries, compress, () => {
                    this.retrievingInitialData  = false;
                    if (this.retrieveInitialDataAgain) {
                        this.retrieveInitialDataAgain = false;
                        this.flushNow();
                    } else {
                        this.subscribe(activeFilters);
                    }
                });
            } else {
                this.subscribe(activeFilters);
            }
        }
    }

    /**
     * Connect to SSE server
     */
     public connect(): void {
         if (this.eventSource) throw Error("SSE connection already opened");
         this.flush();
     }

     private retrieve(queries: string[], compress: boolean, callback: () => void) {
         let data = {
             type: "collection",
             fabric: this.fabric,
             filters: {
                 once: TRUE,
                 compress: compress ? TRUE : FALSE,
                 initialData: TRUE,
                 queries: queries
             }
         };
         let self = this;
         if (!this.eventSource) {
             this.openListener?.("SSE connection opened");
         } else {
             this.eventSource.disconnect();
         }
         this.eventSource = new EventSource(this.url, this.headers);
         this.eventSource.onOpen((event) => {
             if (self.status === ConnectionStatus.Connecting) {
                 self.status = ConnectionStatus.Open;
                 self.openListener?.(event);
             }
         });
         this.eventSource.onProperties((event) => {
             self.propertiesListener?.(event);
         });
         this.eventSource.onError((event: any) => {
             self.errorListener?.(event, false);
         });
         this.eventSource.onMessage((message) => {
             self.handleMessage(message).then(data => {
                 if (data) {
                     try {
                         for (let query in data) {
                             let index = queries.indexOf(query);
                             if (index > -1) {
                                 queries.splice(index, 1);
                             }
                         }
                         if (!queries.length) {
                             self.eventSource?.disconnect();
                             self.eventSource = undefined;
                             callback();
                         }
                     } catch (e) {
                         self.errorListener?.(e, false);
                     }
                 }
             });
         });
         if (this.status === ConnectionStatus.Closed) {
             this.status = ConnectionStatus.Connecting;
         }
         this.eventSource.connect(data);
     }

     private subscribe(filters: Filter[]) {
         let queries = filters
             .filter(f => f.once !== TRUE)
             .map(f => f.queries)
             .reduce((acc, tags) => acc.concat(tags), []);
         if (!queries.length) {
             return;
         }
         if (!this.eventSource) {
             this.openListener?.("SSE connection opened");
         } else {
             this.eventSource.disconnect();
         }
         let compress = filters
             .filter(f => f.once !== TRUE)
             .some(f => f.compress);
         let data = {
             type: "collection",
             fabric: this.fabric,
             filters: {
                 once: FALSE,
                 compress: compress ? TRUE : FALSE,
                 initialData: FALSE,
                 queries: queries
             }
         };
         let self = this;
         this.eventSource = new EventSource(this.url, this.headers);
         this.eventSource.onOpen((event) => {
             if (self.status === ConnectionStatus.Connecting) {
                 self.status = ConnectionStatus.Open;
                 self.openListener?.(event);
             }
         });
         this.eventSource.onError((event: any) => {
             self.errorListener?.(event, false);
             self.closeListener?.(event);
         });
         this.eventSource.onProperties((event) => {
             self.propertiesListener?.(event);
         });
         this.eventSource.onMessage((message) => {
             self.handleMessage(message);
         });
         this.eventSource.onClose((event: any) => {
             if (this.status === ConnectionStatus.Closing) {
                 this.status = ConnectionStatus.Closed;
                 self.closeListener?.(event);
             }
         });
         if (this.status === ConnectionStatus.Closed) {
             this.status = ConnectionStatus.Connecting;
         }
         this.eventSource.connect(data);
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
     }
     
     public onError(listener: (event: any, server: boolean) => void): void {
         this.errorListener = listener;
     }
     
     public getStatus(): ConnectionStatus {
         return this.status;
     }
     
     public disconnect(): boolean {
         this.retrieveTimeout = undefined;
         if (this.eventSource) {
             this.status = ConnectionStatus.Closing;
             this.eventSource?.disconnect();
             this.eventSource = undefined;
             return true;
         }
         return false;
     }
     
     public getId(): string | undefined {
        return this.getProperty(PHOTONIQ_ES);
     }

     public getProperty(name: string): string | undefined {
         return this.eventSource?.getProperty(name);
     }

     public getProperties(): ConnectionProperties {
         return this.eventSource ? this.eventSource.getProperties() : {};
     }

     private handleMessage(message: string): Promise<any> {
         return this.tryToDecodeData(message).then( data => {
             if (!data.error) {
                 for (let query in data) {
                     let queryData = data[query];
                     let filterState = this.filtersState.filterForQuery(query);
                     if (filterState) {
                         this.filtersState.increment(filterState);
                         this.messageListener?.(query, filterState, queryData);
                         let filterToRemove = this.filtersState.tryToRemove(filterState, query);
                         if (filterToRemove) {
                             this.flush();
                         }
                     }
                 }
                 return data;
             } else {
                 this.errorListener?.(data, true);
                 return undefined;
             }
         });
     }

     private async tryToDecodeData (data: string): Promise<any> {
         return new Promise((resolve, reject) => {

             if (data.startsWith(this.ENCODED_GZ_CONTENT)) {
                 try {
                     decodeGzip(data.substring(this.ENCODED_GZ_CONTENT.length)).then( decoded => resolve(JSON.parse(decoded)));
                 } catch (e) {
                     reject(e);
                 }
             } else if (data.startsWith(this.FAILED_TO_PARSE_QUERY)) {
                 resolve({
                     error: data,
                     code: 400
                 })
             } else {
                 try {
                     resolve(JSON.parse(data));
                 } catch (e) {
                     reject(e);
                 }
             }
         });
     }

}