import { Config, InternalConnection, ConnectionStatus, ConnectionProperties } from "../types";
import { FiltersState } from "../filters-state";
export declare class SseConnection implements InternalConnection {
    private readonly config;
    private readonly filtersState;
    private readonly url;
    private readonly headers;
    private eventSource?;
    private openListener?;
    private messageListener?;
    private closeListener?;
    private errorListener?;
    constructor(config: Config, filtersState: FiltersState);
    send(msg: string): void;
    /**
     * Connect to SSE server
     */
    connect(): void;
    private retrieve;
    private subscribe;
    onOpen(listener: (event: any) => void): void;
    onMessage(listener: (event: any) => void): void;
    onClose(listener: (event: any) => void): void;
    onError(listener: (event: any) => void): void;
    status(): ConnectionStatus;
    disconnect(): void;
    getId(): string | undefined;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
    private handleMessage;
    private convertInitialData;
}
