import { Config, EDSEvent } from "./../types";
export declare class SseConnection {
    private config;
    private globalListener;
    private sse?;
    constructor(config: Config, globalListener: (event: EDSEvent) => void);
    reconnect(): void;
    send(msg: string): void;
    /**
     * Connect to SSE server
     */
    connect(): void;
    private handleGlobalListener;
}
