import { EDSEvent } from "../types";

export class EventSource {
    //private xhr: XMLHttpRequest;
    private url: string;
    private headers: HeadersInit;
    private openListener?: (event: any) => void;
    private messageListener?: (event: any) => void;
    private errorListener?: (event: any) => void;
    private closeListener?: (event: any) => void;
    
    constructor(url: string, headers: HeadersInit) {
        this.url = url;
        this.headers = headers;
        /*this.xhr = new XMLHttpRequest();
        
        this.xhr.open('POST', url, true);
        
        for (const key in headers) {
            this.xhr.setRequestHeader(key, headers[key]);
        }
    
        let self = this;
        this.xhr.onreadystatechange = () => {
            if (self.xhr.readyState === 2 || self.xhr.readyState === 3) {
                if (self.xhr.status >=200 && self.xhr.status < 300) {
                    let message = self.xhr.responseText.substring(self.index);
                    self.index = self.xhr.responseText.length;
                    console.log('Message:', message);
                    if (self.messageListener) {
                        self.messageListener(message);
                    }
                } else {
                    console.error('Error:', self.xhr.statusText);
                    if (self.errorListener) {
                        self.errorListener(self.xhr.statusText);
                    }
                }
            }
        };
    
        this.xhr.onerror = () => {
            console.error('Request error:', this.xhr.statusText);
        };*/
        
        
    }
    
    public onopen(listener: (event: any) => void) {
        this.openListener = listener;
    }
    
    public onmessage(listener: (event: any) => void) {
        this.messageListener = listener;
    }
    
    public onerror(listener: (event: any) => void) {
        this.errorListener = listener;
    }
    
    public onclose(listener: (event: any) => void) {
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
                throw new Error('Network response was not ok');
            }
    
            const stream: ReadableStream<Uint8Array> = response.body!;
            
            const reader = stream.getReader();
            let result: ReadableStreamReadResult<Uint8Array>;
            while (!(result = await reader.read()).done) {
                
                let v = new TextDecoder('utf-8').decode(result.value);
                console.log('Response data:', v);
            }
            
            
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
        }
        
    }
}