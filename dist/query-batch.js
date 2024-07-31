"use strict";
/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBatch = void 0;
/**
 * @module QueryBatch
 * Joins all querues togather and sends as a batch
 */
class QueryBatch {
    /** @ignore */
    constructor(retrieveList, retrieveAndSubscribeList, subscribeList, unsubscribeList, addCallbackToQueries, removeCallbacksForQuery, queriesToQuerySetsAndCallbacks, querySet, connection) {
        this.subscribeQueries = [];
        this.retrieveAndSubscribeQueries = [];
        this.retrieveQueries = [];
        this.unsubscribeQueries = [];
        this.retrieveList = retrieveList;
        this.retrieveAndSubscribeList = retrieveAndSubscribeList;
        this.subscribeList = subscribeList;
        this.unsubscribeList = unsubscribeList;
        this.addCallbackToQueries = addCallbackToQueries;
        this.removeCallbacksForQuery = removeCallbacksForQuery;
        this.queriesToQuerySetsAndCallbacks = queriesToQuerySetsAndCallbacks;
        this.querySet = querySet;
        this.connection = connection;
    }
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    subscribe(query, listener, errorListener) {
        this.subscribeQueries.push({
            query: query,
            listener: listener,
            errorListener: errorListener
        });
        return this;
    }
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieveAndSubscribe(query, listener, errorListener) {
        this.retrieveAndSubscribeQueries.push({
            query: query,
            listener: listener,
            errorListener: errorListener
        });
        return this;
    }
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieve(query, listener, errorListener) {
        this.retrieveQueries.push({
            query: query,
            listener: listener,
            errorListener: errorListener
        });
        return this;
    }
    /**
     * Unsubscribe from the query.
     * @param query SQL query to be unsubscribed
     */
    unsubscribe(query) {
        this.unsubscribeQueries.push(query);
        return this;
    }
    /**
     * Assemble list of queries to batch request
     */
    assemble() {
        this.retrieveList(this.retrieveQueries, this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this.querySet, this.connection);
        this.retrieveAndSubscribeList(this.retrieveAndSubscribeQueries, this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this.querySet, this.connection);
        this.subscribeList(this.subscribeQueries, this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this.querySet, this.connection);
        this.unsubscribeList(this.unsubscribeQueries, this.removeCallbacksForQuery, this.queriesToQuerySetsAndCallbacks, this.querySet, this.connection);
    }
}
exports.QueryBatch = QueryBatch;
