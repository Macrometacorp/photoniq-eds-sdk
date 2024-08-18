import { ConnectionProperties } from "../types";
export declare class EventSource {
    private url;
    private headers;
    private properties;
    private reader?;
    private openListener?;
    private messageListener?;
    private errorListener?;
    private closeListener?;
    constructor(url: string, headers: HeadersInit);
    onOpen(listener: (event: any) => void): void;
    onMessage(listener: (event: any) => void): void;
    onError(listener: (event: any) => void): void;
    onClose(listener: (event: any) => void): void;
    connect(data: any): Promise<void>;
    disconnect(): void;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
}