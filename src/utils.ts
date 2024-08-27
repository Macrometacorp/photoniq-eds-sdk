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
 

/**
 * Fix bug on EDS side when query `SELECT prop1.prop1_1, prop2.prop2_1 FROM Coll`
 * returns data as single string property { "prop1.prop1_1": 111, "prop2.prop2_1": 222 } for initial data
 */
export function convertInitialData(sqlData: any) {
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


export async function tryToDecodeData (data: string): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            resolve(JSON.parse(data));
        } catch (e) {
            try {
                decodeGzip(data).then( decoded => resolve(JSON.parse(decoded)));
            } catch (e2) {
                reject(e2);
            }
        }
    });
}

export async function decodeGzip (encoded:string) {
    const gzipData = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const blob = new Blob([gzipData], { type: "application/octet-stream" });
    const cs = new DecompressionStream("gzip");
    const decompressedStream = blob.stream().pipeThrough(cs);
    const response = await new Response(decompressedStream);
    return await response.text();
  }

