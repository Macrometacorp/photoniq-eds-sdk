import { Config, Connection } from "./connection";
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
export class QuerySet {
    private connection: Connection;
    private queriesToQuerySetsAndCallbacks: Map<any,any>;

    /** @ignore */
    constructor(connection: Connection, queriesToQuerySetsAndCallbacks: Map<any,any>) {
        this.connection = connection;
        this.queriesToQuerySetsAndCallbacks = queriesToQuerySetsAndCallbacks;
    }
    
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    public subscribe(query: string, listener: any, errorListener: any): void {
        this.subscribeList([{
            query: query,
            listener: listener,
            errorListener: errorListener
        }], this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    
    private subscribeList(queries: Query[],
        addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
            queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
            queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection): void {
        let queriesToBeAdded: string[] = [];
        for (const query of queries) {
            let toAdd: string[] = addCallbackToQueries([query.query], query.listener, query.errorListener, false, false,
            queriesToQuerySetsAndCallbacks, querySet);
            queriesToBeAdded.push(...toAdd);
        }
        if (queriesToBeAdded.length) {
            const msg = JSON.stringify({
                "action": "add",
                "queries": queriesToBeAdded
            });
            connection.send(msg);      
        }
    }
    
    /**
     * Subscribe to query. Returns result when update happens by the query
     * @param query SQL query to be subscribed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    public retrieveAndSubscribe(query: string, listener: any, errorListener: any): void {
        this.retrieveAndSubscribeList([{
            query: query,
            listener: listener,
            errorListener: errorListener
        }], this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    
    private retrieveAndSubscribeList(queries: Query[],
        addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
            queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
            queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection): void {
        let queriesToBeAdded: string[] = [];
        for (const query of queries) {
            let toAdd: string[] = addCallbackToQueries([query.query], query.listener, query.errorListener, false, true,
                queriesToQuerySetsAndCallbacks, querySet);
            queriesToBeAdded.push(...toAdd);
        }
        if (queriesToBeAdded.length) {
            const msg = JSON.stringify({
                "action": "add",
                "initialData": "TRUE",
                "queries": queriesToBeAdded
            });
            connection.send(msg);
        }
    }
    
    /**
     * Retrieve query. Returns result as usual DB call.
     * @param query SQL query to be executed
     * @param listener callback function which returns result as an instance of Connection.EDSEventMessage
     * @param errorListener callback function which returns error result as an instance of EDSEventError
     */
    public retrieve(query: string, listener: any, errorListener: any): void {
        this.retrieveList([{
            query: query,
            listener: listener,
            errorListener: errorListener
        }], this.addCallbackToQueries, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    
    private retrieveList(queries: Query[],
        addCallbackToQueries: (queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
            queriesToQuerySetsAndCallbacks: Map<any, any>, querySet: QuerySet) => string[],
            queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection): void {
        let queriesToBeAdded: string[] = [];
        for (const query of queries) {
            let toAdd: string[] = addCallbackToQueries([query.query], query.listener, query.errorListener, true, true,
                queriesToQuerySetsAndCallbacks, querySet);
            queriesToBeAdded.push(...toAdd);
        }
        if (queriesToBeAdded.length) {
            const msg = JSON.stringify({
                "action": "add",
                "once": "TRUE",
                "initialData": "TRUE",
                "queries": queriesToBeAdded
            });
            connection.send(msg);
        }
    }
    
    /**
     * Unsubscribe from the query. 
     * @param query SQL query to be unsubscribed
     */
    public unsubscribe(query: string): void {
        this.unsubscribeList([query], this.removeCallbacksForQuery, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    
    private unsubscribeList(queries: string[], removeCallbacksForQuery: (
        queries: string[], queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) => string[],
        queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet, connection: Connection): void {
        let queriesToBeRemoved = removeCallbacksForQuery(queries, queriesToQuerySetsAndCallbacks, querySet);
        if (queriesToBeRemoved.length) {
            const msg = JSON.stringify({
                "action": "remove",
                "queries": queriesToBeRemoved
            });
            connection.send(msg);
        }
    }
    
    /**
     * Unsubscribe from all query in the QuerySet.
     */
    public unsubscribeAll(): void {
        let queries: string[] = Array.from(this.queriesToQuerySetsAndCallbacks.keys());
        this.unsubscribeList(queries, this.removeCallbacksForQuery, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    
    /**
     * Create QueryBatch instance to join all queries in one request and assemble at the end. 
     */
    public batch(): QueryBatch {
        return new QueryBatch(this.retrieveList, this.retrieveAndSubscribeList, this.subscribeList, this.unsubscribeList,
            this.addCallbackToQueries, this.removeCallbacksForQuery, this.queriesToQuerySetsAndCallbacks, this, this.connection);
    }
    
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
    private addCallbackToQueries(queries: string[], callback: any, errorCallback: any, once: boolean, initial: boolean,
        queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) {
        let queriesToBeAdded = [];
        for (let query of queries) {
            let querySetsAndCallbacksOnce = queriesToQuerySetsAndCallbacks.get(query);
            if (!querySetsAndCallbacksOnce) {
                querySetsAndCallbacksOnce = { qsCb: new Map(), qsErrCb: new Map(), once: false, initial: false, count: 0 };
            } else if (querySetsAndCallbacksOnce.once !== once) {
                //console.log(`Query already exists in queriesToQuerySetsAndCallbacks: ${query}`);
                return queriesToBeAdded;
            }
            let newQuery = querySetsAndCallbacksOnce.qsCb.size === 0 || querySetsAndCallbacksOnce.once !== once;
            if (newQuery) {
                querySetsAndCallbacksOnce.once = once;
                querySetsAndCallbacksOnce.count = 0;
                querySetsAndCallbacksOnce.initial = initial;
                queriesToBeAdded.push(query);
                //console.log(`Added query in queriesToQuerySetsAndCallbacks: ${query}`);
            }

            let callbacks = querySetsAndCallbacksOnce.qsCb.get(querySet);
            callbacks ??= [];
            callbacks.push(callback)
            querySetsAndCallbacksOnce.qsCb.set(querySet, callbacks);
            
            if (errorCallback) {
                let errorCallbacks = querySetsAndCallbacksOnce.qsErrCb.get(querySet);
                errorCallbacks ??= [];
                errorCallbacks.push(errorCallback)
                querySetsAndCallbacksOnce.qsErrCb.set(querySet, errorCallbacks);
            }
            
            queriesToQuerySetsAndCallbacks.set(query, querySetsAndCallbacksOnce);
        }
        return queriesToBeAdded;
    }
    
    private removeCallbacksForQuery(queries: string[], queriesToQuerySetsAndCallbacks: Map<any,any>, querySet: QuerySet) {
        let queriesToBeRemoved = [];
        for (let query of queries) {
            let querySetsAndCallbacksOnce = queriesToQuerySetsAndCallbacks.get(query);
            if (querySetsAndCallbacksOnce) {
                querySetsAndCallbacksOnce.qsCb.delete(querySet);
                querySetsAndCallbacksOnce.qsErrCb.delete(querySet);
                if (querySetsAndCallbacksOnce.qsCb.size === 0) {
                    queriesToQuerySetsAndCallbacks.delete(query);
                    //console.log(`Deleted query from queriesToQuerySetsAndCallbacks: ${query}`);
                    queriesToBeRemoved.push(query);
                }
            }
        }
        return queriesToBeRemoved;
    }
    
}