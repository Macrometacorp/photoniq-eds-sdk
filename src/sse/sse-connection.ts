import {
    Config,
    EDSEvent,
    EDSEventType,
    InternalConnection,
    ConnectionStatus,
    EDSEventMessage,
    EDSEventError,
    PHOTONIQ_ES,
    ConnectionProperties
} from "../types";
import { EventSource } from "./event-source"

export class SseConnection implements InternalConnection {
    private config: Config;
    private sse?: EventSource;
    
    private openListener?: (type: any) => void;
    private messageListener?: (type: any) => void;
    private closeListener?: (type: any) => void;
    private errorListener?: (type: any) => void;
    
    constructor(config: Config) {
        this.config = config;
    }
    
    
    send(msg: string): void {
        
    }
    
    /**
     * Connect to SSE server
     */
     public connect(): void {
         const url: string = `https://${this.config.host}/api/es/sse/v1/subscribe`;
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
         
         
         /*const ctrl = new AbortController();
         fetchEventSource(url, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `${this.config.apiKey}`,
                 'x-customer-id': `${this.config.customerId}`,
             },
             body: JSON.stringify(data),
             signal: ctrl.signal,
             onmessage(ev) {
                 console.log(ev.data);
             }
         });*/
         
         
         this.sse = new EventSource(url, {
             'Content-Type': 'application/json',
             'Authorization': `${this.config.apiKey}`,
             'x-customer-id': `${this.config.customerId}`,
         });
         
         let self = this;
         this.sse.onopen = (event: any) => {
             console.log('Connection to SSE server opened.', event);
             /*const edsEvent: EDSEvent = {
                 type: EDSEventType.Open,
                 connection: self,
                 data: event
             };
             self.handleGlobalListener(edsEvent);*/
         };
     
         this.sse.onmessage = (event: any) => {
             console.log('Received event:', event);
             /*const edsEvent: EDSEvent = {
                 type: EDSEventType.Message,
                 connection: self,
                 data: event
             };
             self.handleGlobalListener(edsEvent);*/
         };
     
         this.sse.onerror = (event: any) => {
             console.error('Error occurred:', event);
             /*const edsEvent: EDSEvent = {
                 type: EDSEventType.ClientGlobalError,
                 connection: self,
                 data: event
             };
             self.handleGlobalListener(edsEvent);*/
         };
         
         
         
         
         this.sse.connect(data);
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
         return ConnectionStatus.Closed;
     }
     
     public disconnect(): void {
         
     }
     
     public getId(): string | undefined {
        return undefined;
     }

     public getProperty(name: string): string | undefined {
         return undefined;
     }

     public getProperties(): ConnectionProperties {
         return {};
     }
}