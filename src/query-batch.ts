/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import { Query, QuerySet } from "./query-set";
import { FiltersState } from "./filters-state";
import { EDSEvent, Filter } from "./types";
import { SwitchableConnection } from "./switchable-connection";

/**
 * @module QueryBatch
 * Joins all querues togather and sends as a batch
 */
export class QueryBatch {
    private readonly querySet: QuerySet;
    private readonly connection: SwitchableConnection;
    private readonly filtersState: FiltersState;
    
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
        let queries = [{
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: false
        }];
        this.filtersState.addQueries(queries, false, false, false, this.querySet);
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
        let queries = [{
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: compress === true
        }];
        this.filtersState.addQueries(queries, true, false, compress === true, this.querySet);
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
        let queries = [{
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: compress === true
        }];
        this.filtersState.addQueries(queries, true, true, compress === true, this.querySet);
        return this;
    }
    
    /**
     * Unsubscribe from the query. 
     * @param query SQL query to be unsubscribed
     */
    public unsubscribe(query: string): QueryBatch {
        this.filtersState.removeQueries([query], this.querySet);
        return this;
    }
    
    /**
     * Assemble list of queries to batch request
     */
    public assemble(): void {
        this.connection.flush();
    }
}