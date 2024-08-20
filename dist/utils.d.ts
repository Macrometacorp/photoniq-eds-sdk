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
export declare function convertInitialData(sqlData: any): any;
export declare function decodeGzip(encoded: string): Promise<string>;
