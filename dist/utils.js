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
