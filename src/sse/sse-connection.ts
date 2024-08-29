import {
    Config,
    ConnectionProperties,
    ConnectionStatus,
    Filter,
    FilterState,
    InternalConnection,
    PHOTONIQ_ES
} from "../types";
import {EventSource} from "./event-source"
import {ADD, FALSE, FiltersState, TRUE} from "../filters-state";
import {decodeGzip} from "../utils";

export class SseConnection implements InternalConnection {
    private readonly config: Config;
    private readonly filtersState: FiltersState;
    private readonly url: string;
    private readonly headers: HeadersInit;
    private eventSource?: EventSource;
    private status: ConnectionStatus;
    
    private readonly ENCODED_GZ_CONTENT: string = "encoded-gz-content: ";
    private readonly FAILED_TO_PARSE_QUERY: string = "Failed to parse query: ";

    private openListener?: (type: any) => void;
    private propertiesListener?: (type: any) => void;
    private messageListener?: (query: string, filterState: FilterState, data: any) => void;
    private closeListener?: (type: any) => void;
    private errorListener?: (type: any, server: boolean) => void;
    
    constructor(config: Config, filtersState: FiltersState) {
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
    
    send(filters: Filter[]): void {
        if (filters?.length) {
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
     public connect(): void {
         if (this.eventSource) throw Error("SSE connection already opened");

         let filters = this.filtersState.activeFilters();
         this.retrieve(filters);
     }

     private retrieve(filters: Filter[]) {
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
             this.openListener?.("SSE connection opened");
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
             self.handleMessage(message).then(result => {
                 if (result) {
                     self.eventSource?.disconnect();
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

     private subscribe(filters: Filter[]) {

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

     private handleMessage(message: string): Promise<boolean> {
         return this.tryToDecodeData(message).then( data => {
             if (!data.error) {

                 for (let query in data) {
                     let queryData = data[query];
                     let filterState = this.filtersState.filterForQuery(query);
                     if (filterState) {

                         this.filtersState.increment(filterState);

                         this.messageListener?.(query, filterState, queryData);

                         this.filtersState.tryToRemove(filterState, query);
                     }
                 }
                 return true;
             } else {
                 this.errorListener?.(data, true);
                 return false;
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