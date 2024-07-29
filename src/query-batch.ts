/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import { Query, QuerySet } from "./query-set";
import { ConnectionManager } from "./connection-manager";
import {FiltersState} from "./filters-state";
import { Filter } from "./types";

/**
 * @module QueryBatch
 * Joins all querues togather and sends as a batch
 */
export class QueryBatch {
    private readonly querySet: QuerySet;
    private readonly connection: ConnectionManager;
    private readonly filtersState: FiltersState;
    private subscribeQueries: Query[] = [];
    private retrieveAndSubscribeQueries: Query[] = [];
    private retrieveQueries: Query[] = [];
    private unsubscribeQueries: string[] = [];
    
    /** @ignore */
    constructor(querySet: QuerySet,
                connection: ConnectionManager,
                filtersState: FiltersState) {
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
    public subscribe(query: string, listener: any, errorListener: any): QueryBatch {
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
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    public retrieveAndSubscribe(query: string, listener: any, errorListener: any): QueryBatch {
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
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    public retrieve(query: string, listener: any, errorListener: any): QueryBatch {
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
    public unsubscribe(query: string): QueryBatch {
        this.unsubscribeQueries.push(query);
        return this;
    }
    
    /**
     * Assemble list of queries to batch request
     */
    public assemble(): void {
        let filters = this.filtersState.addQueries(this.retrieveQueries, true, true, false, this.querySet);
        let retrieveAndSubscribeFilters = this.filtersState.addQueries(this.retrieveAndSubscribeQueries, true, false, false, this.querySet);
        this.joinFilters(filters, retrieveAndSubscribeFilters);
        let subscribeFilters = this.filtersState.addQueries(this.subscribeQueries, false, false, false, this.querySet);
        this.joinFilters(filters, subscribeFilters);
        for (const filterToAdd of filters) {
            this.connection.send(JSON.stringify(filterToAdd));
        }
        let unsubscribeFilter = this.filtersState.removeQueries(this.unsubscribeQueries, this.querySet);
        if (unsubscribeFilter) {
            this.connection.send(JSON.stringify(unsubscribeFilter));
        }
    }

    private joinFilters(target: Filter[], source: Filter[]) {
        for (const sourceFilter of source) {
            let filter = target.find(f => this.filtersState.equalFiltersWithoutQueries(f, sourceFilter));
            if (filter) {
                filter.queries.push(...sourceFilter.queries);
            } else {
                target.push(sourceFilter);
            }
        }
    }
}