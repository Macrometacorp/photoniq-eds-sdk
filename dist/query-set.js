"use strict";
/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuerySet = void 0;
const query_batch_1 = require("./query-batch");
/**
 * Manages queries as a set
 */
class QuerySet {
    /** @ignore */
    constructor(connection, queriesToQuerySetsAndCallbacks) {
        this.connection = connection;
        this.queriesToQuerySetsAndCallbacks = queriesToQuerySetsAndCallbacks;
    }
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    subscribe(query, listener, errorListener) {
        this.subscribeList([{
                query: query,
                listener: listener,
                errorListener: errorListener
            }], this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    subscribeList(queries, addCallbackToQueries, queriesToQuerySetsAndCallbacks, querySet, connection) {
        let queriesToBeAdded = [];
        for (const query of queries) {
            let toAdd = addCallbackToQueries([query.query], query.listener, query.errorListener, false, false, queriesToQuerySetsAndCallbacks, querySet);
            queriesToBeAdded.push(...toAdd);
        }
        if (queriesToBeAdded.length) {
            const msg = JSON.stringify({
                "action": "add",
                "queries": queriesToBeAdded
            });
            connection.send(msg);
        }
    }
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieveAndSubscribe(query, listener, errorListener) {
        this.retrieveAndSubscribeList([{
                query: query,
                listener: listener,
                errorListener: errorListener
            }], this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    retrieveAndSubscribeList(queries, addCallbackToQueries, queriesToQuerySetsAndCallbacks, querySet, connection) {
        let queriesToBeAdded = [];
        for (const query of queries) {
            let toAdd = addCallbackToQueries([query.query], query.listener, query.errorListener, false, true, queriesToQuerySetsAndCallbacks, querySet);
            queriesToBeAdded.push(...toAdd);
        }
        if (queriesToBeAdded.length) {
            const msg = JSON.stringify({
                "action": "add",
                "initialData": "TRUE",
                "queries": queriesToBeAdded
            });
            connection.send(msg);
        }
    }
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieve(query, listener, errorListener) {
        this.retrieveList([{
                query: query,
                listener: listener,
                errorListener: errorListener
            }], this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    retrieveList(queries, addCallbackToQueries, queriesToQuerySetsAndCallbacks, querySet, connection) {
        let queriesToBeAdded = [];
        for (const query of queries) {
            let toAdd = addCallbackToQueries([query.query], query.listener, query.errorListener, true, true, queriesToQuerySetsAndCallbacks, querySet);
            queriesToBeAdded.push(...toAdd);
        }
        if (queriesToBeAdded.length) {
            const msg = JSON.stringify({
                "action": "add",
                "once": "TRUE",
                "initialData": "TRUE",
                "queries": queriesToBeAdded
            });
            connection.send(msg);
        }
    }
    /**
     * Unsubscribe from the query.
     * @param query SQL query to be unsubscribed
     */
    unsubscribe(query) {
        this.unsubscribeList([query], this.removeCallbacksForQuery, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    unsubscribeList(queries, removeCallbacksForQuery, queriesToQuerySetsAndCallbacks, querySet, connection) {
        let queriesToBeRemoved = removeCallbacksForQuery(queries, queriesToQuerySetsAndCallbacks, querySet);
        if (queriesToBeRemoved.length) {
            const msg = JSON.stringify({
                "action": "remove",
                "queries": queriesToBeRemoved
            });
            connection.send(msg);
        }
    }
    /**
     * Unsubscribe from all query in the QuerySet.
     */
    unsubscribeAll() {
        let queries = Array.from(this.queriesToQuerySetsAndCallbacks.keys());
        this.unsubscribeList(queries, this.removeCallbacksForQuery, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    /**
     * Create QueryBatch instance to join all queries in one request and assemble at the end.
     */
    batch() {
        return new query_batch_1.QueryBatch(this.retrieveList, this.retrieveAndSubscribeList, this.subscribeList, this.unsubscribeList, this.addCallbackToQueries, this.removeCallbacksForQuery, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    /**
     * Add query and callback to map which uses for incoming messages in onMessage function
     *
     * @param queries - list of queries to be listened
     * @param callback - callback function with the next arguments: `query`, `data`
     * @param errorCallback - error callback function
     * @param once - once retrieve data for the query
     * @param initial - retrieve initial data for the query
     * @param queriesToQuerySetsAndCallbacks
     * @param querySet
     * @returns list of queries were added. Not all queries are new. Some of them can be reused.
     *
     */
    addCallbackToQueries(queries, callback, errorCallback, once, initial, queriesToQuerySetsAndCallbacks, querySet) {
        let queriesToBeAdded = [];
        for (let query of queries) {
            let querySetsAndCallbacksOnce = queriesToQuerySetsAndCallbacks.get(query);
            if (!querySetsAndCallbacksOnce) {
                querySetsAndCallbacksOnce = { qsCb: new Map(), qsErrCb: new Map(), once: false, initial: false, count: 0 };
            }
            else if (querySetsAndCallbacksOnce.once !== once) {
                //console.log(`Query already exists in queriesToQuerySetsAndCallbacks: ${query}`);
                return queriesToBeAdded;
            }
            let newQuery = querySetsAndCallbacksOnce.qsCb.size === 0 || querySetsAndCallbacksOnce.once !== once;
            if (newQuery) {
                querySetsAndCallbacksOnce.once = once;
                querySetsAndCallbacksOnce.count = 0;
                querySetsAndCallbacksOnce.initial = initial;
                queriesToBeAdded.push(query);
                //console.log(`Added query in queriesToQuerySetsAndCallbacks: ${query}`);
            }
            let callbacks = querySetsAndCallbacksOnce.qsCb.get(querySet);
            callbacks !== null && callbacks !== void 0 ? callbacks : (callbacks = []);
            callbacks.push(callback);
            querySetsAndCallbacksOnce.qsCb.set(querySet, callbacks);
            if (errorCallback) {
                let errorCallbacks = querySetsAndCallbacksOnce.qsErrCb.get(querySet);
                errorCallbacks !== null && errorCallbacks !== void 0 ? errorCallbacks : (errorCallbacks = []);
                errorCallbacks.push(errorCallback);
                querySetsAndCallbacksOnce.qsErrCb.set(querySet, errorCallbacks);
            }
            queriesToQuerySetsAndCallbacks.set(query, querySetsAndCallbacksOnce);
        }
        return queriesToBeAdded;
    }
    removeCallbacksForQuery(queries, queriesToQuerySetsAndCallbacks, querySet) {
        let queriesToBeRemoved = [];
        for (let query of queries) {
            let querySetsAndCallbacksOnce = queriesToQuerySetsAndCallbacks.get(query);
            if (querySetsAndCallbacksOnce) {
                querySetsAndCallbacksOnce.qsCb.delete(querySet);
                querySetsAndCallbacksOnce.qsErrCb.delete(querySet);
                if (querySetsAndCallbacksOnce.qsCb.size === 0) {
                    queriesToQuerySetsAndCallbacks.delete(query);
                    //console.log(`Deleted query from queriesToQuerySetsAndCallbacks: ${query}`);
                    queriesToBeRemoved.push(query);
                }
            }
        }
        return queriesToBeRemoved;
    }
}
exports.QuerySet = QuerySet;
