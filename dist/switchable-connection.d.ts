import { Config, InternalConnection, ConnectionStatus, ConnectionProperties } from "./types";
import { FiltersState } from "./filters-state";
export declare class SwitchableConnection implements InternalConnection {
    private readonly config;
    private readonly filtersState;
    private openListener?;
    private messageListener?;
    private closeListener?;
    private errorListener?;
    private connection?;
    private connectionTypes;
    private reconnection;
    constructor(config: Config, filtersState: FiltersState);
    connect(): void;
    send(msg: string): void;
    disconnect(): void;
    status(): ConnectionStatus;
    onOpen(listener: (event: any) => void): void;
    onMessage(listener: (event: any) => void): void;
    onClose(listener: (event: any) => void): void;
    onError(listener: (event: any) => void): void;
    getId(): string | undefined;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
}
