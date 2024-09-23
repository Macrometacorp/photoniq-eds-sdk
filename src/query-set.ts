/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import { EDSEvent } from "./types";
import { QueryBatch } from "./query-batch";
import { FiltersState } from "./filters-state";
import { SwitchableConnection } from "./switchable-connection";

/**
 * @module QuerySet
 *
 * Manages queries as a set
 */

/** @ignore */
export type Query = {
    query: string;
    listener: (type: EDSEvent) => void;
    errorListener?: (type: EDSEvent) => void;
    compress: boolean
};

/**
 * Manages queries as a set
 */
export class QuerySet {
    private readonly connection: SwitchableConnection;
    private readonly filtersState: FiltersState;

    /** @ignore */
    constructor(connection: SwitchableConnection, filtersState: FiltersState) {
        this.connection = connection;
        this.filtersState = filtersState;
    }
    
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    public subscribe(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void): void {
        let queries = [{
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: false
        }];
        this.filtersState.addQueries(queries, false, false, false, this);
        this.connection.flush();
    }
    
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    public retrieveAndSubscribe(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void, compress?: boolean): void {
        let queries = [{
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: compress === true
        }];
        this.filtersState.addQueries(queries, true, false, compress === true, this);
        this.connection.flush();
    }
    
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    public retrieve(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void, compress?: boolean): void {
        let queries = [{
            query: query,
            listener: listener,
            errorListener: errorListener,
            compress: compress === true
        }];
        this.filtersState.addQueries(queries, true, true, compress === true, this);
        this.connection.flush();
    }
    
    /**
     * Unsubscribe from the query. 
     * @param query SQL query to be unsubscribed
     */
    public unsubscribe(query: string): void {
        this.filtersState.removeQueries([query], this);
        this.connection.flush();
    }
    
    /**
     * Unsubscribe from all query in the QuerySet.
     */
    public unsubscribeAll(): void {
        this.filtersState.removeAllQueries(this);
        this.connection.flush();
    }
    
    /**
     * Create QueryBatch instance to join all queries in one request and assemble at the end. 
     */
    public batch(): QueryBatch {
        return new QueryBatch(this, this.connection, this.filtersState);
    }
    
}