import {Config, InternalConnection, ConnectionStatus, Filter, ConnectionProperties} from "./types";
import {WsConnection} from "./ws/ws-connection";
import {SseConnection} from "./sse/sse-connection";
import {FiltersState} from "./filters-state";

export class SwitchableConnection implements InternalConnection {

    private readonly config: Config;
    private readonly filtersState: FiltersState;
    private openListener?: (type: any) => void;
    private messageListener?: (type: any) => void;
    private closeListener?: (type: any) => void;
    private errorListener?: (type: any) => void;
    private connection?: InternalConnection;
    private connectionTypes = ["ws"];
    private reconnection = -1;
    
    constructor(config: Config, filtersState: FiltersState) {
        this.config = config;
        this.filtersState = filtersState;
    }
    
    connect(): void {
        if (this.connection) throw new Error(`Already connected with status: ${this.status()}`);
        
        if (this.config.connectionTypes?.length) {
            this.connectionTypes = this.config.connectionTypes;
        }
        
        let connectionType = this.connectionTypes[this.reconnection % this.connectionTypes.length];
        switch(connectionType) {
            case "ws":
                this.connection = new WsConnection(this.config, this.filtersState);
                break;
            case "sse":
                this.connection = new SseConnection(this.config, this.filtersState);
                break;
            default:
                throw new Error(`Connection type not supported: ${connectionType}`);
        }
        
        let self = this;
        this.connection.onOpen(function(event) {
            let reconnection = self.reconnection;
            self.reconnection = 0;
            if (reconnection === -1) {
                self.openListener?.(event);
            }
            
            // send current subscribed filters.
            let filters = self.filtersState.activeFilters();
            for (const filter of filters) {
                self.connection?.send(JSON.stringify(filter));
            }
        });
        this.connection.onMessage(function (event) {
            self.messageListener?.(event);
        });
        this.connection.onError(function (event) {
            self.errorListener?.(event);
        });
        this.connection.onClose(function (event) {
            self.connection = undefined;
            if (self.reconnection > -1) {
                let millisToReconnect = Math.pow(2, 6 + self.reconnection++);
                setTimeout(function() {
                    self.connect();
                }, millisToReconnect);
            } else {
                self.reconnection = 0;
                self.closeListener?.(event);
            }
        });
        
        this.connection.connect();
    }
    
    send(msg: string): void {
        this.connection?.send(msg);
    }
    
    disconnect(): void {
        this.reconnection = -1;
        this.connection?.disconnect();
    }
    
    status(): ConnectionStatus {
        if (this.connection) {
            return this.connection.status();
        } else {
            return ConnectionStatus.Closed;
        }
    }
    
    onOpen(listener: (event: any) => void): void {
        this.openListener = listener;
    }
    
    onMessage(listener: (event: any) => void): void {
        this.messageListener = listener;
    }
    
    onClose(listener: (event: any) => void): void {
        this.closeListener = listener;
    }
    
    onError(listener: (event: any) => void): void {
        this.errorListener = listener;
    }
    
    public getId(): string | undefined {
        return this.connection?.getId();
    }
    
    public getProperty(name: string): string | undefined {
        return this.connection?.getProperty(name);
    }
    public getProperties(): ConnectionProperties {
        return this.connection ? this.connection.getProperties() : {};
    }
}