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
import {EventSource} from "./event-source"
import {FALSE, FiltersState, TRUE} from "../filters-state";
import {convertInitialData} from "../utils";

export class SseConnection implements InternalConnection {
    private readonly config: Config;
    private readonly filtersState: FiltersState;
    private readonly url: string;
    private readonly headers: HeadersInit;
    private eventSource?: EventSource;
    private opened: boolean = false;
    
    private openListener?: (type: any) => void;
    private messageListener?: (type: any) => void;
    private closeListener?: (type: any) => void;
    private errorListener?: (type: any) => void;
    
    constructor(config: Config, filtersState: FiltersState) {
        this.config = config;
        this.filtersState = filtersState;
        this.url = `https://${this.config.host}/api/es/sse/v1/subscribe`;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `${this.config.apiKey}`,
            'x-customer-id': `${this.config.customerId}`,
        };
    }
    
    send(filter: Filter): void {
        if (filter && this.opened) {
            this.disconnect();
            let filters = this.filtersState.activeFilters();
            this.retrieve(filters);
        }
    }
    
    /**
     * Connect to SSE server
     */
     public connect(): void {
         // it establishes virtual connection.
         if (this.opened) throw Error("SSE connection already opened");
         this.opened = true;
         this.openListener?.("SSE connection opened");
     }

     private retrieve(filters: Filter[]) {

         if (!this.opened) {
             this.opened = true;
             this.openListener?.("SSE connection opened");
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
         this.eventSource.onError((event: any) => {
             const edsEvent: EDSEvent = {
                 type: EDSEventType.ClientGlobalError,
                 connection: self,
                 data: event
             };
             this.filtersState.handleGlobalListener(edsEvent)
         });
         this.eventSource.onMessage((message) => {
             if (self.handleMessage(message)) {
                 self.eventSource?.disconnect();
                 self.subscribe(filters);
             }
         });
         this.eventSource.connect(data);
     }

     private subscribe(filters: Filter[]) {

         if (!this.opened) {
             this.opened = true;
             this.openListener?.("SSE connection opened");
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
         this.eventSource.onError((event: any) => {
             const edsEvent: EDSEvent = {
                 type: EDSEventType.ClientGlobalError,
                 connection: self,
                 data: event
             };
             this.filtersState.handleGlobalListener(edsEvent)
         });
         this.eventSource.onMessage((message) => {
             self.handleMessage(message);
         });
         this.eventSource.onClose((event: any) => {
             if (this.opened) {
                 this.opened = false;
                 self.closeListener?.(event);
             }
         });
         this.eventSource.connect(data);
     }
     
     public onOpen(listener: (event: any) => void): void {
         this.openListener = listener;
     }
     
     public onMessage(listener: (event: any) => void): void {
         this.messageListener = listener;
     }
     
     public onClose(listener: (event: any) => void): void {
         this.closeListener = listener;
     }
     
     public onError(listener: (event: any) => void): void {
         this.errorListener = listener;
     }
     
     public status(): ConnectionStatus {
         return this.opened ? ConnectionStatus.Open: ConnectionStatus.Closed;
     }
     
     public disconnect(): void {
         this.eventSource?.disconnect();
         this.eventSource = undefined;
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

     private handleMessage(message: string): boolean {
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
                             queryData[i] = convertInitialData(queryData[i]);
                         }
                     } else {
                         queryData = [queryData];
                     }

                     for (const querySetWithFilter of filterState.querySets) {
                         if (isInitialData && !querySetWithFilter.initialData) continue;
                         let edsEvent: EDSEvent & EDSEventMessage = {
                             type: EDSEventType.Message,
                             connection: this,
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
         } else {
             let msg = data.error;
             const queryErrorPrefix: string = "Error parsing SQL query:";
             if (msg.startsWith(queryErrorPrefix)) {
                 let query = msg.substring(queryErrorPrefix.length, msg.indexOf("ERROR")).trim();
                 const edsEvent: EDSEvent & EDSEventError = {
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
             } else {
                 const edsEvent: EDSEvent & EDSEventError = {
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


}