/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { ConnectionManager } from "./connection-manager";
import { QueryBatch } from "./query-batch";
import { FiltersState } from "./filters-state";
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
export declare class QuerySet {
    private readonly connection;
    private readonly filtersState;
    /** @ignore */
    constructor(connection: ConnectionManager, filtersState: FiltersState);
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    subscribe(query: string, listener: any, errorListener: any): void;
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieveAndSubscribe(query: string, listener: any, errorListener: any): void;
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieve(query: string, listener: any, errorListener: any): void;
    /**
     * Unsubscribe from the query.
     * @param query SQL query to be unsubscribed
     */
    unsubscribe(query: string): void;
    /**
     * Unsubscribe from all query in the QuerySet.
     */
    unsubscribeAll(): void;
    /**
     * Create QueryBatch instance to join all queries in one request and assemble at the end.
     */
    batch(): QueryBatch;
}
