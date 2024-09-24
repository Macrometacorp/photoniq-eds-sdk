/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import { Query, QuerySet } from "./query-set";
import { FiltersState } from "./filters-state";
import { EDSEvent, QueryOptions } from "./types";
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
     * @param errorListenerOrOptions callback function which returns error result as an instance of EDSEventError or set query's options
     * @param options query optons if `errorListenerOrOptions` argument used as `errorListener`
     */
    public subscribe(
        query: string,
        listener: (type: EDSEvent) => void,
        errorListenerOrOptions?: (type: EDSEvent) => void | QueryOptions,
        options?: QueryOptions): QueryBatch {
        return this.handleSubscription(query, listener, false, false, errorListenerOrOptions, options);
    }
    
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListenerOrOptions callback function which returns error result as an instance of EDSEventError or set query's options
     * @param options query optons if `errorListenerOrOptions` argument used as `errorListener`
     */
    public retrieveAndSubscribe(
        query: string,
        listener: (type: EDSEvent) => void,
        errorListenerOrOptions?: (type: EDSEvent) => void | QueryOptions,
        options?: QueryOptions): QueryBatch {
        return this.handleSubscription(query, listener, true, false, errorListenerOrOptions, options);
    }
    
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListenerOrOptions callback function which returns error result as an instance of EDSEventError or set query's options
     * @param options query optons if `errorListenerOrOptions` argument used as `errorListener`
     */
    public retrieve(
        query: string,
        listener: (type: EDSEvent) => void,
        errorListenerOrOptions?: (type: EDSEvent) => void | QueryOptions,
        options?: QueryOptions): QueryBatch {
        return this.handleSubscription(query, listener, true, true, errorListenerOrOptions, options);
    }

    private handleSubscription(
        query: string,
        listener: (type: EDSEvent) => void,
        initialData: boolean,
        once: boolean,
        errorListenerOrOptions?: (type: EDSEvent) => void | QueryOptions,
        options?: QueryOptions): QueryBatch {
        let queryObj: Query = {
            query: query,
            listener: listener,
        };

        // Emulate method overloading
        if (typeof errorListenerOrOptions === 'function') {
            queryObj.errorListener = errorListenerOrOptions;
        } else if (typeof errorListenerOrOptions === 'object' && errorListenerOrOptions !== null) {
            options = errorListenerOrOptions;
        }

        this.filtersState.addQueries([queryObj], initialData, once, options?.compress === true, this.querySet);
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