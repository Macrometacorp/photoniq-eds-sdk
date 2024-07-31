/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import { Connection } from "./connection";
import { Query, QuerySet } from "./query-set";

/**
 * @module QueryBatch
 * Joins all querues togather and sends as a batch
 */
export class QueryBatch {

    private readonly retrieveList: (queries: Query[],
        addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
            queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
            queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection) => void;
    private readonly retrieveAndSubscribeList: (queries: Query[],
        addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
            queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
            queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection) => void;
    private readonly subscribeList: (queries: Query[],
        addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
            queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
            queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection) => void;
    private readonly unsubscribeList: (queries: string[], removeCallbacksForQuery: (
            queries: string[], queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) => string[],
            queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection) => void;
    private readonly addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
        queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) => string[];
    private readonly removeCallbacksForQuery: (
        queries: string[], queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) => string[]  ;  
    private readonly queriesToQuerySetsAndCallbacks: Map<any,any>;
    private readonly querySet: QuerySet;
    private readonly connection: Connection;
    private subscribeQueries: Query[] = [];
    private retrieveAndSubscribeQueries: Query[] = [];
    private retrieveQueries: Query[] = [];
    private unsubscribeQueries: string[] = [];
    
    /** @ignore */
    constructor(retrieveList: (queries: Query[],
                    addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
                        queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
                    queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection) => void,
                retrieveAndSubscribeList: (queries: Query[],
                    addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
                        queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
                    queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection) => void,
                subscribeList: (queries: Query[],
                    addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
                        queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
                    queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection) => void,
                unsubscribeList: (queries: string[],
                    removeCallbacksForQuery: (queries: string[], queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) => string[],
                    queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection) => void,
                addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
                    queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) => string[],
                removeCallbacksForQuery: (queries: string[], queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) => string[],  
                queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet,
                connection: Connection) {
        this.retrieveList = retrieveList;
        this.retrieveAndSubscribeList = retrieveAndSubscribeList;
        this.subscribeList = subscribeList;
        this.unsubscribeList = unsubscribeList;
        this.addCallbackToQueries = addCallbackToQueries;
        this.removeCallbacksForQuery = removeCallbacksForQuery;
        this.queriesToQuerySetsAndCallbacks = queriesToQuerySetsAndCallbacks;
        this.querySet = querySet;
        this.connection = connection;
    }
    
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
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
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
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
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
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
        this.retrieveList(this.retrieveQueries, this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this.querySet, this.connection);
        this.retrieveAndSubscribeList(this.retrieveAndSubscribeQueries, this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this.querySet, this.connection);
        this.subscribeList(this.subscribeQueries, this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this.querySet, this.connection);
        this.unsubscribeList(this.unsubscribeQueries, this.removeCallbacksForQuery, this.queriesToQuerySetsAndCallbacks, this.querySet, this.connection);
    }
}


