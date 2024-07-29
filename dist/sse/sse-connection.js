"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SseConnection = void 0;
const types_1 = require("../types");
const event_source_1 = require("./event-source");
class SseConnection {
    constructor(config) {
        this.config = config;
    }
    send(msg) {
    }
    /**
     * Connect to SSE server
     */
    connect() {
        const url = `https://${this.config.host}/api/es/sse/v1/subscribe`;
        let data = {
            "type": "collection",
            "fabric": "_system",
            "filters": {
                "once": "FALSE",
                "compress": "FALSE",
                "initialData": "TRUE",
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
        this.sse = new event_source_1.EventSource(url, {
            'Content-Type': 'application/json',
            'Authorization': `${this.config.apiKey}`,
            'x-customer-id': `${this.config.customerId}`,
        });
        let self = this;
        this.sse.onopen = (event) => {
            console.log('Connection to SSE server opened.', event);
            /*const edsEvent: EDSEvent = {
                type: EDSEventType.Open,
                connection: self,
                data: event
            };
            self.handleGlobalListener(edsEvent);*/
        };
        this.sse.onmessage = (event) => {
            console.log('Received event:', event);
            /*const edsEvent: EDSEvent = {
                type: EDSEventType.Message,
                connection: self,
                data: event
            };
            self.handleGlobalListener(edsEvent);*/
        };
        this.sse.onerror = (event) => {
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
        return types_1.ConnectionStatus.Closed;
    }
    disconnect() {
    }
    getId() {
        return undefined;
    }
}
exports.SseConnection = SseConnection;
