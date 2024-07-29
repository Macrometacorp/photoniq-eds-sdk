import { Config, InternalConnection, ConnectionStatus, ConnectionProperties } from "../types";
export declare class SseConnection implements InternalConnection {
    private config;
    private sse?;
    private openListener?;
    private messageListener?;
    private closeListener?;
    private errorListener?;
    constructor(config: Config);
    send(msg: string): void;
    /**
     * Connect to SSE server
     */
    connect(): void;
    onOpen(listener: (event: any) => void): void;
    onMessage(listener: (event: any) => void): void;
    onClose(listener: (event: any) => void): void;
    onError(listener: (event: any) => void): void;
    status(): ConnectionStatus;
    disconnect(): void;
    getId(): string | undefined;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
}
