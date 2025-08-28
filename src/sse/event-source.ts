import {ConnectionProperties, ConnectionStatus} from "../types";

export class EventSource {

    private readonly url: string;
    private readonly headers: HeadersInit;
    private properties: ConnectionProperties = {};
    private reader?: ReadableStreamDefaultReader<Uint8Array>;
    private openListener?: (event: any) => void;
    private propertiesListener?: (event: any) => void;
    private messageListener?: (event: any) => void;
    private errorListener?: (event: any) => void;
    private closeListener?: (event: any) => void;
    private status: ConnectionStatus;
    private abortController?: AbortController;
    
    constructor(url: string, headers: HeadersInit) {
        this.url = url;
        this.headers = headers;
        this.status = ConnectionStatus.Closed;
    }
    
    public onOpen(listener: (event: any) => void) {
        this.openListener = listener;
    }

    public onProperties(listener: (event: any) => void) {
        this.propertiesListener = listener;
    }
    
    public onMessage(listener: (event: any) => void) {
        this.messageListener = listener;
    }
    
    public onError(listener: (event: any) => void) {
        this.errorListener = listener;
    }
    
    public onClose(listener: (event: any) => void) {
        this.closeListener = listener;
    }
    
    public async connect(data: any) {
        if (this.status != ConnectionStatus.Closed) {
            return;
        }
        this.status = ConnectionStatus.Connecting;
        let self = this;
        try {
            this.abortController = new AbortController();
            const response = await fetch(this.url, {
                method: 'POST', 
                headers: this.headers,
                body: JSON.stringify(data),
                signal: this.abortController.signal
            });
    
            if (!response.ok) {
                this.errorListener?.({
                    type: 'error',
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    response
                });
                return;
            }
            if (self.status == ConnectionStatus.Closed) {
                return;
            }
            this.status = ConnectionStatus.Open;
            this.openListener?.({ type: 'open', response });

            const stream: ReadableStream<Uint8Array> = response.body!;
            await this.readStream(stream);
            
        } catch (error) {
            if (self.status !== ConnectionStatus.Closed) {
                this.errorListener?.({ type: 'error', error });
            }
        } finally {
            const wasOpen = this.status == ConnectionStatus.Open;
            this.cleanup();
            if (wasOpen) {
                this.closeListener?.({ type: 'close', reason: 'Connection ended' });
            }
        }
    }

    private async readStream(stream: ReadableStream<Uint8Array>) {
        let buffer = "";
        this.reader = stream.getReader();
        try {
            let streamResult: ReadableStreamReadResult<Uint8Array>;
            while (!(streamResult = await this.reader.read()).done && this.status == ConnectionStatus.Open) {
                const result = new TextDecoder('utf-8').decode(streamResult.value);
                buffer += result;

                let endIndex;
                while ((endIndex = buffer.indexOf("\n\n")) > -1) {
                    const message = buffer.substring(0, endIndex);
                    buffer = buffer.substring(endIndex + 2);

                    this.processMessage(message);
                }
            }
        } catch (error) {
            if (this.status == ConnectionStatus.Open) {
                throw error;
            }
        }
    }

    private processMessage(message: string) {
        let propertyChanged = false;

        if (message.startsWith(":")) {
            const lines = message.split("\n");
            for (const line of lines) {
                const keyValue = line.split(":");
                if (keyValue.length >= 3) {
                    const key = keyValue[1].trim();
                    const value = keyValue.slice(2).join(":").trim();
                    this.properties[key] = value;
                    propertyChanged = true;
                }
            }
        } else {
            const colonIndex = message.indexOf(":");
            if (colonIndex > -1) {
                const key = message.substring(0, colonIndex).trim();
                let valueStart = colonIndex + 1;
                if (message[valueStart] === " ") {
                    valueStart++;
                }
                const value = message.substring(valueStart).replace(/\ndata: ?/g, "\n");

                switch (key) {
                    case "data":
                        this.messageListener?.(value);
                        break;
                    case "event":
                        // Handle event type if needed
                        break;
                    case "id":
                        // Handle event ID if needed
                        break;
                    case "retry":
                        // Handle retry interval if needed
                        break;
                    default:
                        console.warn(`Unsupported SSE field: ${key}: ${value}`);
                }
            }
        }

        if (propertyChanged) {
            this.propertiesListener?.(this.properties);
        }
    }

    public disconnect() {
        this.abortController?.abort();
        this.cleanup();
    }

    private cleanup() {
        this.status = ConnectionStatus.Closed;
        if (this.reader) {
            this.reader.cancel().catch(() => {
                // Ignore cancellation errors
            });
            this.reader = undefined;
        }
        this.abortController = undefined;
    }

    public getProperty(name: string): string | undefined {
        return this.properties[name];
    }

    public getProperties(): ConnectionProperties {
        return this.properties;
    }

    public isConnected(): boolean {
        return this.status == ConnectionStatus.Open;
    }
}