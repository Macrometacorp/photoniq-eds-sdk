/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import { Config, Filter } from "./types";
import { ConnectionManager } from "./connection-manager";
import { QueryBatch } from "./query-batch";
import { FiltersState, TRUE } from "./filters-state";

/**
 * @module QuerySet
 *
 * Manages queries as a set
 */

/** @ignore */
export type Query = {
    query: string;
    listener: any;
    errorListener: any;
};

/**
 * Manages queries as a set
 */
export class QuerySet {
    private readonly connection: ConnectionManager;
    private readonly filtersState: FiltersState;

    /** @ignore */
    constructor(connection: ConnectionManager, filtersState: FiltersState) {
        this.connection = connection;
        this.filtersState = filtersState;
    }
    
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    public subscribe(query: string, listener: any, errorListener: any): void {
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
    public retrieveAndSubscribe(query: string, listener: any, errorListener: any): void {
        let queries = [{
            query: query,
            listener: listener,
            errorListener: errorListener
        }];
        let filtersToAdd = this.filtersState.addQueries(queries, true, false, false, this);
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
    public retrieve(query: string, listener: any, errorListener: any): void {
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
    public unsubscribe(query: string): void {
        let filterToRemove = this.filtersState.removeQueries([query], this);
        if (filterToRemove) {
            this.connection.send(JSON.stringify(filterToRemove));
        }
    }
    
    /**
     * Unsubscribe from all query in the QuerySet.
     */
    public unsubscribeAll(): void {
        let filter = this.filtersState.removeAllQueries(this);
        if (filter) {
            this.connection.send(JSON.stringify(filter));
        }
    }
    
    /**
     * Create QueryBatch instance to join all queries in one request and assemble at the end. 
     */
    public batch(): QueryBatch {
        return new QueryBatch(this, this.connection, this.filtersState);
    }
    
}