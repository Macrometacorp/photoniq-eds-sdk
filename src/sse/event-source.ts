import { ConnectionProperties } from "../types";

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
    private disconnected: boolean = false;
    
    constructor(url: string, headers: HeadersInit) {
        this.url = url;
        this.headers = headers;
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
        try {
            const response = await fetch(this.url, {
                method: 'POST', 
                headers: this.headers,
                body: JSON.stringify(data),
            });
    
            if (!response.ok) {
                this.errorListener?.(response);
            } else {
                this.openListener?.(response);
            }
    
            const stream: ReadableStream<Uint8Array> = response.body!;
            
            let buffer = "";
            this.reader = stream.getReader();
            if (this.disconnected) {
                this.disconnect();
            }
            let streamResult: ReadableStreamReadResult<Uint8Array>;
            while (!(streamResult = await this.reader.read()).done) {
                let result = new TextDecoder('utf-8').decode(streamResult.value);
                buffer += result;
                let endIndex;
                while ((endIndex = buffer.indexOf("\n\n")) > -1 ) {
                    //message complete
                    let propertyChanged = false;
                    let message = buffer.substring(0, endIndex);
                    buffer = buffer.substring(endIndex + 2);

                    if (message.startsWith(":")) {
                        const lines = result.split("\n");
                        for (const line of lines) {
                            const keyValue = line.split(":");
                            if (keyValue.length == 3) {
                                this.properties[keyValue[1].trim()] = keyValue[2].trim();
                                propertyChanged = true;
                            }
                        }
                    } else {
                        let valueIndex = message.indexOf(":");
                        if (valueIndex > -1) {
                            let key = message.substring(0, valueIndex).trim();
                            if (message[valueIndex + 1] === " ") valueIndex++;
                            valueIndex++;
                            let value = message.substring(valueIndex).replace(/\ndata: ?/g, "\n");
                            switch (key) {
                                case "data":
                                    this.messageListener?.(value);
                                    break;
                                default:
                                    console.warn(`Not supported message with type of message ${key}: ${value}`);
                            }
                        }
                    }

                    if (propertyChanged) {
                        this.propertiesListener?.(this.properties);
                    }
                }
            }
            this.closeListener?.("Connection closed");
        } catch (error) {
            this.errorListener?.(error);
        }
    }

    public disconnect() {
        this.disconnected = true;
        this.reader?.cancel();
    }

    public getProperty(name: string): string | undefined {
        return this.properties[name];
    }

    public getProperties(): ConnectionProperties {
        return this.properties;
    }

}