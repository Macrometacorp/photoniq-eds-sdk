export declare class EventSource {
    private url;
    private headers;
    private openListener?;
    private messageListener?;
    private errorListener?;
    private closeListener?;
    constructor(url: string, headers: HeadersInit);
    onopen(listener: (event: any) => void): void;
    onmessage(listener: (event: any) => void): void;
    onerror(listener: (event: any) => void): void;
    onclose(listener: (event: any) => void): void;
    connect(data: any): Promise<void>;
}
