import { Config, ConnectionProperties, ConnectionStatus, Filter, FilterState, InternalConnection } from "../types";
import { FiltersState } from "../filters-state";
export declare class SseConnection implements InternalConnection {
    private readonly config;
    private readonly filtersState;
    private readonly url;
    private readonly headers;
    private eventSource?;
    private status;
    private readonly ENCODED_GZ_CONTENT;
    private readonly FAILED_TO_PARSE_QUERY;
    private openListener?;
    private propertiesListener?;
    private messageListener?;
    private closeListener?;
    private errorListener?;
    constructor(config: Config, filtersState: FiltersState);
    send(filter: Filter): void;
    /**
     * Connect to SSE server
     */
    connect(): void;
    private retrieve;
    private subscribe;
    onOpen(listener: (event: any) => void): void;
    onProperties(listener: (event: any) => void): void;
    onMessage(listener: (query: string, filterState: FilterState, data: any) => void): void;
    onClose(listener: (event: any) => void): void;
    onError(listener: (event: any, server: boolean) => void): void;
    getStatus(): ConnectionStatus;
    disconnect(): boolean;
    getId(): string | undefined;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
    private handleMessage;
    private tryToDecodeData;
}
