var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class EventSource {
    constructor(url, headers) {
        this.properties = {};
        this.url = url;
        this.headers = headers;
    }
    onOpen(listener) {
        this.openListener = listener;
    }
    onMessage(listener) {
        this.messageListener = listener;
    }
    onError(listener) {
        this.errorListener = listener;
    }
    onClose(listener) {
        this.closeListener = listener;
    }
    connect(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const response = yield fetch(this.url, {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify(data),
                });
                if (!response.ok) {
                    (_a = this.errorListener) === null || _a === void 0 ? void 0 : _a.call(this, response);
                }
                else {
                    (_b = this.openListener) === null || _b === void 0 ? void 0 : _b.call(this, response);
                }
                const stream = response.body;
                let buffer = "";
                this.reader = stream.getReader();
                let streamResult;
                while (!(streamResult = yield this.reader.read()).done) {
                    let result = new TextDecoder('utf-8').decode(streamResult.value);
                    buffer += result;
                    let endIndex = buffer.indexOf("\n\n");
                    if (endIndex > -1) {
                        //message complete
                        let message = buffer.substring(0, endIndex);
                        buffer = buffer.substring(endIndex + 2);
                        if (message.startsWith(":")) {
                            const lines = result.split("\n");
                            for (const line of lines) {
                                const keyValue = line.split(":");
                                if (keyValue.length == 3) {
                                    this.properties[keyValue[1].trim()] = keyValue[2].trim();
                                }
                            }
                        }
                        else {
                            let valueIndex = message.indexOf(":");
                            if (valueIndex > -1) {
                                let key = message.substring(0, valueIndex).trim();
                                if (message[valueIndex + 1] === " ")
                                    valueIndex++;
                                valueIndex++;
                                let value = message.substring(valueIndex).replace(/\ndata: ?/g, "\n");
                                switch (key) {
                                    case "data":
                                        (_c = this.messageListener) === null || _c === void 0 ? void 0 : _c.call(this, value);
                                        break;
                                    default:
                                        console.warn(`Not supported message with type of message ${key}: ${value}`);
                                }
                            }
                        }
                    }
                }
                (_d = this.closeListener) === null || _d === void 0 ? void 0 : _d.call(this, "Connection closed");
            }
            catch (error) {
                (_e = this.errorListener) === null || _e === void 0 ? void 0 : _e.call(this, error);
            }
        });
    }
    disconnect() {
        var _a;
        (_a = this.reader) === null || _a === void 0 ? void 0 : _a.cancel();
    }
    getProperty(name) {
        return this.properties[name];
    }
    getProperties() {
        return this.properties;
    }
}
