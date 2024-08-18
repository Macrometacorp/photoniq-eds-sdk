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
    compress: boolean;
};
/**
 * Manages queries as a set
 */
export declare class QuerySet {
    private readonly connection;
    private readonly filtersState;
    /** @ignore */
    constructor(connection: SwitchableConnection, filtersState: FiltersState);
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    subscribe(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void): void;
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    retrieveAndSubscribe(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void, compress?: boolean): void;
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    retrieve(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void, compress?: boolean): void;
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
