import { Config, ConnectionProperties, ConnectionStatus, Filter, InternalConnection } from "../types";
import { FiltersState } from "../filters-state";
export declare class WsConnection implements InternalConnection {
    private readonly STUB_FILTER;
    /**
     * Default timeoput of ping-pong requests in seconds
     */
    private readonly DEFAULT_PING_SECONDS;
    private config;
    private filtersState;
    private openListener?;
    private messageListener?;
    private closeListener?;
    private errorListener?;
    private ws;
    private pingIntervalId;
    private properties;
    constructor(config: Config, filtersState: FiltersState);
    connect(): void;
    onOpen(listener: (event: any) => void): void;
    onMessage(listener: (event: any) => void): void;
    private handleMessage;
    onClose(listener: (event: any) => void): void;
    onError(listener: (event: any) => void): void;
    send(filter: Filter): void;
    disconnect(): void;
    status(): ConnectionStatus;
    getId(): string | undefined;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
    private updatePingInterval;
}
