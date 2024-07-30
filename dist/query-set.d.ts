/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { Connection } from "./connection";
import { QueryBatch } from "./query-batch";
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
    private connection;
    private queriesToQuerySetsAndCallbacks;
    /** @ignore */
    constructor(connection: Connection, queriesToQuerySetsAndCallbacks: Map<any, any>);
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    subscribe(query: string, listener: any, errorListener: any): void;
    private subscribeList;
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieveAndSubscribe(query: string, listener: any, errorListener: any): void;
    private retrieveAndSubscribeList;
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieve(query: string, listener: any, errorListener: any): void;
    private retrieveList;
    /**
     * Unsubscribe from the query.
     * @param query SQL query to be unsubscribed
     */
    unsubscribe(query: string): void;
    private unsubscribeList;
    /**
     * Unsubscribe from all query in the QuerySet.
     */
    unsubscribeAll(): void;
    /**
     * Create QueryBatch instance to join all queries in one request and assemble at the end.
     */
    batch(): QueryBatch;
    /**
     * Add query and callback to map which uses for incoming messages in onMessage function
     *
     * @param queries - list of queries to be listened
     * @param callback - callback function with the next arguments: `query`, `data`
     * @param errorCallback - error callback function
     * @param once - once retrieve data for the query
     * @param initial - retrieve initial data for the query
     * @param queriesToQuerySetsAndCallbacks
     * @param querySet
     * @returns list of queries were added. Not all queries are new. Some of them can be reused.
     *
     */
    private addCallbackToQueries;
    private removeCallbacksForQuery;
}
