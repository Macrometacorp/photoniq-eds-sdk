import { Config, ConnectionProperties, ConnectionStatus, Filter, FilterState, InternalConnection } from "../types";
import { FiltersState } from "../filters-state";
export declare class WsConnection implements InternalConnection {
    private readonly STUB_FILTER;
    /**
     * Default timeout of ping-pong requests in seconds
     */
    private readonly DEFAULT_PING_SECONDS;
    private config;
    private filtersState;
    private openListener?;
    private propertiesListener?;
    private messageListener?;
    private closeListener?;
    private errorListener?;
    private ws;
    private pingIntervalId;
    private properties;
    constructor(config: Config, filtersState: FiltersState);
    connect(): void;
    onOpen(listener: (event: any) => void): void;
    onProperties(listener: (event: any) => void): void;
    onMessage(listener: (query: string, filterState: FilterState, data: any) => void): void;
    onClose(listener: (event: any) => void): void;
    onError(listener: (event: any, server: boolean) => void): void;
    send(filters: Filter[]): void;
    disconnect(): boolean;
    getStatus(): ConnectionStatus;
    getId(): string | undefined;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
    private updatePingInterval;
}
