/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import { Query, QuerySet } from "./query-set";
import {FiltersState} from "./filters-state";
import {EDSEvent, Filter } from "./types";
import { SwitchableConnection } from "./switchable-connection";

/**
 * @module QueryBatch
 * Joins all querues togather and sends as a batch
 */
export class QueryBatch {
    private readonly querySet: QuerySet;
    private readonly connection: SwitchableConnection;
    private readonly filtersState: FiltersState;
    private subscribeQueries: Query[] = [];
    private retrieveAndSubscribeQueries: Query[] = [];
    private retrieveQueries: Query[] = [];
    private unsubscribeQueries: string[] = [];
    
    /** @ignore */
    constructor(querySet: QuerySet,
                connection: SwitchableConnection,
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
    public subscribe(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void): QueryBatch {
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
    public retrieveAndSubscribe(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void, compress?: boolean): QueryBatch {
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
    public retrieve(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void, compress?: boolean): QueryBatch {
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
    public unsubscribe(query: string): QueryBatch {
        this.unsubscribeQueries.push(query);
        return this;
    }
    
    /**
     * Assemble list of queries to batch request
     */
    public assemble(): void {
        let retrieveCompress = this.retrieveQueries.some(q => q.compress);
        let filters = this.filtersState.addQueries(this.retrieveQueries, true, true, retrieveCompress, this.querySet);

        let retrieveAndSubscribeCompress = this.retrieveAndSubscribeQueries.some(q => q.compress);
        let retrieveAndSubscribeFilters = this.filtersState.addQueries(this.retrieveAndSubscribeQueries, true, false, retrieveAndSubscribeCompress, this.querySet);
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