/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { QuerySet } from "./query-set";
import { FiltersState } from "./filters-state";
import { EDSEvent } from "./types";
import { SwitchableConnection } from "./switchable-connection";
/**
 * @module QueryBatch
 * Joins all querues togather and sends as a batch
 */
export declare class QueryBatch {
    private readonly querySet;
    private readonly connection;
    private readonly filtersState;
    private subscribeQueries;
    private retrieveAndSubscribeQueries;
    private retrieveQueries;
    private unsubscribeQueries;
    /** @ignore */
    constructor(querySet: QuerySet, connection: SwitchableConnection, filtersState: FiltersState);
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    subscribe(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void): QueryBatch;
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    retrieveAndSubscribe(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void, compress?: boolean): QueryBatch;
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     * @param compress compress initial data
     */
    retrieve(query: string, listener: (type: EDSEvent) => void, errorListener?: (type: EDSEvent) => void, compress?: boolean): QueryBatch;
    /**
     * Unsubscribe from the query.
     * @param query SQL query to be unsubscribed
     */
    unsubscribe(query: string): QueryBatch;
    /**
     * Assemble list of queries to batch request
     */
    assemble(): void;
    private joinFilters;
}
