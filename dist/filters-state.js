"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiltersState = exports.REMOVE = exports.ADD = exports.TRUE = exports.FALSE = void 0;
exports.FALSE = "FALSE";
exports.TRUE = "TRUE";
exports.ADD = "add";
exports.REMOVE = "add";
class FiltersState {
    constructor() {
        this.queries = new Map();
    }
    calculateFilter(action, query, filterState) {
        const initialData = filterState.querySets.some(qs => qs.initialData && qs.count === 0) ? exports.TRUE : undefined;
        const once = filterState.querySets.every(qs => qs.once) ? exports.TRUE : undefined;
        const compress = filterState.querySets.some(qs => qs.compress) ? exports.TRUE : undefined;
        return {
            action: action,
            queries: [query],
            initialData: initialData,
            once: once,
            compress: compress
        };
    }
    tryToRemove(query) {
        let filterState = this.queries.get(query);
        if (filterState) {
            if (filterState.querySets.every(qs => qs.once)) {
                this.queries.delete(query);
                return {
                    action: exports.REMOVE,
                    queries: [query]
                };
            }
            else {
                // increment count for each query set
                for (const qs of filterState.querySets) {
                    qs.count++;
                }
            }
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
                let filterBefore = this.calculateFilter(exports.ADD, query.query, filterState);
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
                let filterAfter = this.calculateFilter(exports.ADD, query.query, filterState);
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
                            callbacks: [query.listener],
                            errorCallbacks: [query.errorListener],
                        }]
                };
                this.queries.set(query.query, filterState);
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
                action: exports.REMOVE,
                queries: queriesToRemove
            };
        }
        return undefined;
    }
    // TODO: make more efficient by grouping queries by the same FilterWithoutQueries object
    activeFilters() {
        let filters = [];
        for (const [query, filterState] of this.queries) {
            const filter = this.calculateFilter(exports.ADD, query, filterState);
            filters.push(filter);
        }
        return filters;
    }
}
exports.FiltersState = FiltersState;
