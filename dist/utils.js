/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
/**
 * @module Utils
 *
 *
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Fix bug on EDS side when query `SELECT prop1.prop1_1, prop2.prop2_1 FROM Coll`
 * returns data as single string property { "prop1.prop1_1": 111, "prop2.prop2_1": 222 } for initial data
 */
export function convertInitialData(sqlData) {
    for (let sqlParameter in sqlData) {
        let path = sqlParameter.split('.');
        if (path.length <= 1) {
            continue;
        }
        let value = sqlData;
        for (let i = 0; i < path.length; i++) {
            if (value[path[i]] === undefined) {
                value[path[i]] = {};
            }
            // if not last
            if (i < path.length - 1) {
                value = value[path[i]];
            }
        }
        value[path[path.length - 1]] = sqlData[sqlParameter];
        delete sqlData[sqlParameter];
    }
    return sqlData;
}
export function tryToDecodeData(data) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            try {
                resolve(JSON.parse(data));
            }
            catch (e) {
                try {
                    decodeGzip(data).then(decoded => resolve(JSON.parse(decoded)));
                }
                catch (e2) {
                    reject(e2);
                }
            }
        });
    });
}
function decodeGzip(encoded) {
    return __awaiter(this, void 0, void 0, function* () {
        const gzipData = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const blob = new Blob([gzipData], { type: "application/octet-stream" });
        const cs = new DecompressionStream("gzip");
        const decompressedStream = blob.stream().pipeThrough(cs);
        const response = yield new Response(decompressedStream);
        return yield response.text();
    });
}
