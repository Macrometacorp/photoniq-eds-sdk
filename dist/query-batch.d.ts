import { Connection } from "./connection";
import { Query, QuerySet } from "./query-set";
/**
 * @module QueryBatch
 * Joins all querues togather and sends as a batch
 */
export declare class QueryBatch {
    private readonly retrieveList;
    private readonly retrieveAndSubscribeList;
    private readonly subscribeList;
    private readonly unsubscribeList;
    private readonly addCallbackToQueries;
    private readonly removeCallbacksForQuery;
    private readonly queriesToQuerySetsAndCallbacks;
    private readonly querySet;
    private readonly connection;
    private subscribeQueries;
    private retrieveAndSubscribeQueries;
    private retrieveQueries;
    private unsubscribeQueries;
    /** @ignore */
    constructor(retrieveList: (queries: Query[], addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean, queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[], queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet, connection: Connection) => void, retrieveAndSubscribeList: (queries: Query[], addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean, queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[], queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet, connection: Connection) => void, subscribeList: (queries: Query[], addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean, queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[], queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet, connection: Connection) => void, unsubscribeList: (queries: string[], removeCallbacksForQuery: (queries: string[], queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[], queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet, connection: Connection) => void, addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean, queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[], removeCallbacksForQuery: (queries: string[], queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[], queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet, connection: Connection);
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    subscribe(query: string, listener: any, errorListener: any): QueryBatch;
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieveAndSubscribe(query: string, listener: any, errorListener: any): QueryBatch;
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    retrieve(query: string, listener: any, errorListener: any): QueryBatch;
    /**
     * Unsubscribe from the query.
     * @param query SQL query to be unsubscribed
     */
    unsubscribe(query: string): QueryBatch;
    /**
     * Assemble list of queries to batch request
     */
    assemble(): void;
}
