/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
/**
 * @module QueryBatch
 * Joins all querues togather and sends as a batch
 */
export class QueryBatch {
    /** @ignore */
    constructor(querySet, connection, filtersState) {
        this.subscribeQueries = [];
        this.retrieveAndSubscribeQueries = [];
        this.retrieveQueries = [];
        this.unsubscribeQueries = [];
        this.querySet = querySet;
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
        this.subscribeQueries.push({
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: false
        });
        return this;
    }
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    retrieveAndSubscribe(query, listener, errorListener, compress) {
        this.retrieveAndSubscribeQueries.push({
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: compress === true
        });
        return this;
    }
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    retrieve(query, listener, errorListener, compress) {
        this.retrieveQueries.push({
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: compress === true
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
        let filters = this.filtersState.addQueries(this.retrieveQueries, true, true, false, this.querySet);
        let retrieveAndSubscribeFilters = this.filtersState.addQueries(this.retrieveAndSubscribeQueries, true, false, false, this.querySet);
        this.joinFilters(filters, retrieveAndSubscribeFilters);
        let subscribeFilters = this.filtersState.addQueries(this.subscribeQueries, false, false, false, this.querySet);
        this.joinFilters(filters, subscribeFilters);
        for (const filterToAdd of filters) {
            this.connection.send(filterToAdd);
        }
        let unsubscribeFilter = this.filtersState.removeQueries(this.unsubscribeQueries, this.querySet);
        if (unsubscribeFilter) {
            this.connection.send(unsubscribeFilter);
        }
    }
    joinFilters(target, source) {
        for (const sourceFilter of source) {
            let filter = target.find(f => this.filtersState.equalFiltersWithoutQueries(f, sourceFilter));
            if (filter) {
                filter.queries.push(...sourceFilter.queries);
            }
            else {
                target.push(sourceFilter);
            }
        }
    }
}
