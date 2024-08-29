/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { QueryBatch } from "./query-batch";
/**
 * Manages queries as a set
 */
export class QuerySet {
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
                errorListener: errorListener,
                compress: false
            }];
        let filtersToAdd = this.filtersState.addQueries(queries, false, false, false, this);
        for (const filterToAdd of filtersToAdd) {
            this.connection.send([filterToAdd]);
        }
    }
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    retrieveAndSubscribe(query, listener, errorListener, compress) {
        let queries = [{
                query: query,
                listener: listener,
                errorListener: errorListener,
                compress: compress === true
            }];
        let filtersToAdd = this.filtersState.addQueries(queries, true, false, compress === true, this);
        for (const filterToAdd of filtersToAdd) {
            this.connection.send([filterToAdd]);
        }
    }
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    retrieve(query, listener, errorListener, compress) {
        let queries = [{
                query: query,
                listener: listener,
                errorListener: errorListener,
                compress: compress === true
            }];
        let filtersToAdd = this.filtersState.addQueries(queries, true, true, compress === true, this);
        for (const filterToAdd of filtersToAdd) {
            this.connection.send([filterToAdd]);
        }
    }
    /**
     * Unsubscribe from the query.
     * @param query SQL query to be unsubscribed
     */
    unsubscribe(query) {
        let filterToRemove = this.filtersState.removeQueries([query], this);
        if (filterToRemove) {
            this.connection.send([filterToRemove]);
        }
    }
    /**
     * Unsubscribe from all query in the QuerySet.
     */
    unsubscribeAll() {
        let filter = this.filtersState.removeAllQueries(this);
        if (filter) {
            this.connection.send([filter]);
        }
    }
    /**
     * Create QueryBatch instance to join all queries in one request and assemble at the end.
     */
    batch() {
        return new QueryBatch(this, this.connection, this.filtersState);
    }
}
