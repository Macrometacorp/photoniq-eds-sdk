"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSource = void 0;
class EventSource {
    constructor(url, headers) {
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
    onopen(listener) {
        this.openListener = listener;
    }
    onmessage(listener) {
        this.messageListener = listener;
    }
    onerror(listener) {
        this.errorListener = listener;
    }
    onclose(listener) {
        this.closeListener = listener;
    }
    connect(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(this.url, {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify(data),
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const stream = response.body;
                const reader = stream.getReader();
                let result;
                while (!(result = yield reader.read()).done) {
                    let v = new TextDecoder('utf-8').decode(result.value);
                    console.log('Response data:', v);
                }
            }
            catch (error) {
                console.error('There was a problem with the fetch operation:', error);
            }
        });
    }
}
exports.EventSource = EventSource;
