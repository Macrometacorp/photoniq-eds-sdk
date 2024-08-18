/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
export const FALSE = "FALSE";
export const TRUE = "TRUE";
export const ADD = "add";
export const REMOVE = "remove";
export class FiltersState {
    constructor(globalListener) {
        this.queries = new Map();
        this.globalListener = globalListener;
    }
    calculateFilter(action, query, filterState) {
        const initialData = filterState.querySets.some(qs => qs.initialData && qs.count === 0) ? TRUE : undefined;
        const once = filterState.querySets.every(qs => qs.once) ? TRUE : undefined;
        const compress = filterState.querySets.some(qs => qs.compress) ? TRUE : undefined;
        return {
            action: action,
            queries: [query],
            initialData: initialData,
            once: once,
            compress: compress
        };
    }
    increment(filterState) {
        // increment count for each query set
        for (const qs of filterState.querySets) {
            qs.count++;
        }
    }
    tryToRemove(filterState, query) {
        if (filterState.querySets.every(qs => qs.once)) {
            this.queries.delete(query);
            return {
                action: REMOVE,
                queries: [query]
            };
        }
        return undefined;
    }
    equalFiltersWithoutQueries(a, b) {
        return a.action === b.action &&
            a.compress === b.compress &&
            a.initialData === b.initialData &&
            a.once === b.once;
    }
    addQueries(queries, initialData, once, compress, querySet) {
        let filtersToAdd = [];
        for (const query of queries) {
            let filterState = this.queries.get(query.query);
            if (filterState) {
                let filterBefore = this.calculateFilter(ADD, query.query, filterState);
                let querySetWithFilter = filterState.querySets.find(qs => qs.querySet === querySet);
                if (querySetWithFilter) {
                    querySetWithFilter.initialData = initialData;
                    querySetWithFilter.once = once;
                    querySetWithFilter.compress = compress;
                    if (initialData) {
                        querySetWithFilter.count = 0;
                    }
                    if (querySetWithFilter.callbacks.indexOf(query.listener) == -1) {
                        querySetWithFilter.callbacks.push(query.listener);
                    }
                    if (querySetWithFilter.errorCallbacks.indexOf(query.errorListener) == -1) {
                        querySetWithFilter.errorCallbacks.push(query.errorListener);
                    }
                }
                else {
                    let callbacks = [];
                    if (query.listener) {
                        callbacks.push(query.listener);
                    }
                    let errorCallbacks = [];
                    if (query.errorListener) {
                        errorCallbacks.push(query.errorListener);
                    }
                    filterState.querySets.push({
                        querySet: querySet,
                        initialData: initialData,
                        compress: compress,
                        once: once,
                        count: 0,
                        callbacks: query.listener ? [query.listener] : [],
                        errorCallbacks: query.errorListener ? [query.errorListener] : [],
                    });
                }
                let filterAfter = this.calculateFilter(ADD, query.query, filterState);
                if (!this.equalFiltersWithoutQueries(filterBefore, filterAfter)) {
                    let filter = filtersToAdd.find(f => this.equalFiltersWithoutQueries(f, filterAfter));
                    if (filter) {
                        filter.queries.push(query.query);
                    }
                    else {
                        filtersToAdd.push(filterAfter);
                    }
                }
            }
            else {
                let filterState = {
                    querySets: [{
                            querySet: querySet,
                            initialData: initialData,
                            compress: compress,
                            once: once,
                            count: 0,
                            callbacks: query.listener ? [query.listener] : [],
                            errorCallbacks: query.errorListener ? [query.errorListener] : [],
                        }]
                };
                this.queries.set(query.query, filterState);
                let filterAfter = this.calculateFilter(ADD, query.query, filterState);
                let filter = filtersToAdd.find(f => this.equalFiltersWithoutQueries(f, filterAfter));
                if (filter) {
                    filter.queries.push(query.query);
                }
                else {
                    filtersToAdd.push(filterAfter);
                }
            }
        }
        return filtersToAdd;
    }
    filterForQuery(query) {
        return this.queries.get(query);
    }
    removeAllQueries(querySet) {
        let queries = Array.from(this.queries.keys());
        return this.removeQueries(queries, querySet);
    }
    removeQueries(queries, querySet) {
        let queriesToRemove = [];
        for (const query of queries) {
            let remove = true;
            let filterState = this.queries.get(query);
            if (filterState) {
                let index = filterState.querySets.findIndex(qs => qs.querySet === querySet);
                if (index > -1) {
                    filterState.querySets.splice(index, 1);
                }
                if (filterState.querySets.length) {
                    remove = false;
                }
            }
            if (remove) {
                this.queries.delete(query);
                queriesToRemove.push(query);
            }
        }
        if (queriesToRemove.length) {
            return {
                action: REMOVE,
                queries: queriesToRemove
            };
        }
        return undefined;
    }
    activeFilters() {
        let filters = [];
        for (const [query, filterState] of this.queries) {
            const filter = this.calculateFilter(ADD, query, filterState);
            let filterFound = filters.find(f => this.equalFiltersWithoutQueries(f, filter));
            if (filterFound) {
                filterFound.queries.push(query);
            }
            else {
                filters.push(filter);
            }
        }
        return filters;
    }
    handleErrorListeners(errorCallbacks, query, edsEvent) {
        for (let callback of errorCallbacks) {
            try {
                callback(edsEvent);
            }
            catch (e) {
                console.warn(`Error while handling error listener for query: ${query}`, e);
            }
        }
    }
    handleGlobalListener(edsEvent) {
        var _a;
        try {
            (_a = this.globalListener) === null || _a === void 0 ? void 0 : _a.call(this, edsEvent);
        }
        catch (e) {
            console.warn(`Error while handling global error listener`, e);
        }
    }
}
