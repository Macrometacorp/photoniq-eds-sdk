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
    constructor(connection, filtersState) {
        this.connection = connection;
        this.filtersState = filtersState;
    }
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    subscribe(query, listener, errorListener) {
        let queries = [{
                query: query,
                listener: listener,
                errorListener: errorListener
            }];
        let filtersToAdd = this.filtersState.addQueries(queries, false, false, false, this);
        for (const filterToAdd of filtersToAdd) {
            this.connection.send(JSON.stringify(filterToAdd));
        }
    }
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieveAndSubscribe(query, listener, errorListener) {
        let queries = [{
                query: query,
                listener: listener,
                errorListener: errorListener
            }];
        let filtersToAdd = this.filtersState.addQueries(queries, true, true, false, this);
        for (const filterToAdd of filtersToAdd) {
            this.connection.send(JSON.stringify(filterToAdd));
        }
    }
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieve(query, listener, errorListener) {
        let queries = [{
                query: query,
                listener: listener,
                errorListener: errorListener
            }];
        let filtersToAdd = this.filtersState.addQueries(queries, true, true, false, this);
        for (const filterToAdd of filtersToAdd) {
            this.connection.send(JSON.stringify(filterToAdd));
        }
    }
    /**
     * Unsubscribe from the query.
     * @param query SQL query to be unsubscribed
     */
    unsubscribe(query) {
        let filterToRemove = this.filtersState.removeQueries([query], this);
        if (filterToRemove) {
            this.connection.send(JSON.stringify(filterToRemove));
        }
    }
    /**
     * Unsubscribe from all query in the QuerySet.
     */
    unsubscribeAll() {
        let filter = this.filtersState.removeAllQueries(this);
        if (filter) {
            this.connection.send(JSON.stringify(filter));
        }
    }
    /**
     * Create QueryBatch instance to join all queries in one request and assemble at the end.
     */
    batch() {
        return new query_batch_1.QueryBatch(this, this.connection, this.filtersState);
    }
}
exports.QuerySet = QuerySet;
