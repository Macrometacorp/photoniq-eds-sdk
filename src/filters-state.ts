/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import {Config, EDSEvent, Filter, FilterState} from "./types";
import {Query, QuerySet} from "./query-set";

export const FALSE: string = "FALSE";
export const TRUE: string = "TRUE";
export const ADD: string = "add";
export const REMOVE: string = "remove";

export class FiltersState {

    private readonly queries: Map<string, FilterState>;
    private readonly queriesToRemove: string[];
    private readonly config: Config;
    private readonly globalListener: (type: EDSEvent) => void;

    constructor(config: Config, globalListener: (event: EDSEvent) => void) {
        this.config = config;
        this.queries = new Map();
        this.queriesToRemove = [];
        this.globalListener = globalListener;
    }

    private calculateFilter(action: string, query: string, filterState: FilterState): Filter {
        // if any QuerySet requested initial data for query than query should request initial data for this QuerySet.
        const initialData = filterState.querySets.some(qs => qs.initialData && qs.count === 0) ? TRUE : undefined;
        // if all QuerySet's request only initial data (`retieve(..)` method) then joined filter should have `once` = true.
        const once = filterState.querySets.every(qs => qs.once) ? TRUE : undefined;
        // if any QuerySet requested compressed data then we need to retrieve it as compress for all QuerySet's.
        const compress = filterState.querySets.some(qs => qs.compress) ? TRUE : undefined;

        return {
            action: action,
            queries: [query],
            initialData: initialData,
            once: once,
            compress: compress,
            filterType: this.config.queryType
        };
    }

    public increment(filterState: FilterState): void {
        // increment count for each query set
        for (const qs of filterState.querySets) {
            qs.count++;
        }
    }

    public tryToRemove(filterState: FilterState, query: string): Filter | undefined {
        if (filterState.querySets.every(qs => qs.once)) {
            this.queries.delete(query);
            if (this.queriesToRemove.indexOf(query) == -1) {
                this.queriesToRemove.push(query);
            }
            return {
                action: REMOVE,
                queries: [query]
            }
        }
        return undefined;
    }

    public equalFiltersWithoutQueries(a: Filter, b: Filter): boolean {
        return a.action === b.action &&
            a.compress === b.compress &&
            a.initialData === b.initialData &&
            a.once === b.once;
    }

    public addQueries(queries: Query[], initialData:boolean, once: boolean, compress: boolean, querySet: QuerySet): Filter[] {
        let filtersToAdd: Filter[] = [];
        for (const query of queries) {
            let filterState = this.queries.get(query.query);
            if (filterState) {
                let filterBefore = this.calculateFilter(ADD, query.query, filterState);
                let querySetWithFilter = filterState.querySets.find(qs => qs.querySet === querySet);

                if (querySetWithFilter) {
                    querySetWithFilter.initialData = initialData;
                    querySetWithFilter.once = once;
                    querySetWithFilter.compress = compress;
                    if (querySetWithFilter.callbacks.indexOf(query.listener) == -1) {
                        querySetWithFilter.callbacks.push(query.listener);
                    }
                    if (querySetWithFilter.errorCallbacks.indexOf(query.errorListener) == -1) {
                        querySetWithFilter.errorCallbacks.push(query.errorListener);
                    }
                } else {
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
                    filterState.sent = false;
                    let filter = filtersToAdd.find(f => this.equalFiltersWithoutQueries(f, filterAfter));
                    if (filter) {
                        filter.queries.push(query.query);
                    } else {
                        filtersToAdd.push(filterAfter);
                    }
                }
            } else {
                let filterState = {
                    querySets: [{
                        querySet: querySet,
                        initialData: initialData,
                        compress: compress,
                        once: once,
                        count: 0,
                        callbacks: query.listener ? [query.listener] : [],
                        errorCallbacks: query.errorListener ? [query.errorListener] : [],
                    }],
                    sent: false
                };
                this.queries.set(query.query, filterState);
                let filterAfter = this.calculateFilter(ADD, query.query, filterState);
                let filter = filtersToAdd.find(f => this.equalFiltersWithoutQueries(f, filterAfter));
                if (filter) {
                    filter.queries.push(query.query);
                } else {
                    filtersToAdd.push(filterAfter);
                }
            }
        }
        return filtersToAdd;
    }

    public filterForQuery(query: string): FilterState | undefined {
        return this.queries.get(query);
    }
    
    public removeAllQueries(querySet: QuerySet): Filter | undefined  {
        let queries = Array.from(this.queries.keys());
        return this.removeQueries(queries, querySet);
    }

    public removeQueries(queries: string[], querySet: QuerySet): Filter | undefined  {
        for (const query of queries) {
            let filterState = this.queries.get(query);
            if (filterState) {
                let index = filterState.querySets.findIndex(qs => qs.querySet === querySet);
                if (index > -1) {
                    filterState.querySets.splice(index, 1);
                }
                if (!filterState.querySets.length) {
                    this.queries.delete(query);
                    if (this.queriesToRemove.indexOf(query) == -1) {
                        this.queriesToRemove.push(query);
                    }
                }
            }
        }
        if (this.queriesToRemove.length) {
            return {
                action: REMOVE,
                queries: this.queriesToRemove
            };
        }
        return undefined;
    }
    
    public activeFilters(): Filter[] {
        let filters = [];
        for (const [query, filterState] of this.queries) {
            const filter: Filter = this.calculateFilter(ADD, query, filterState);
            let filterFound = filters.find(f => this.equalFiltersWithoutQueries(f, filter));
            if (filterFound) {
                filterFound.queries.push(query);
            } else {
                filters.push(filter);
            }
        }
        return filters;
    }

    public activeNotSentFilters(): Filter[] {
        let filters = [];
        for (const [query, filterState] of this.queries) {
            if (filterState.sent) continue;
            const filter: Filter = this.calculateFilter(ADD, query, filterState);
            let filterFound = filters.find(f => this.equalFiltersWithoutQueries(f, filter));
            if (filterFound) {
                filterFound.queries.push(query);
            } else {
                filters.push(filter);
            }
        }
        return filters;
    }
    
    public activeFiltersSent(filters: Filter[]): void {
        for (let filter of filters) {
            this.activeFilterSent(filter);
        }
    }

    public activeFilterSent(filter: Filter): void {
        for (let query of filter.queries) {
            let filterState = this.queries.get(query);
            if (filterState) {
                filterState.sent = true;
            }
        }
    }

    public allFiltersNotSent(): void {
        for (const [query, filterState] of this.queries) {
            filterState.sent = false;
        }
    }

    public removeFilter(): Filter | undefined {
        let queriesToRemove = this.queriesToRemove.filter(q => !this.queries.has(q));
        if (queriesToRemove.length === 0) return undefined;
        return {
            action: REMOVE,
            queries: queriesToRemove
        }
    }

    public removeFilterSent(): void {
        // remove all elements
        this.queriesToRemove.splice(0, this.queriesToRemove.length);
    }

    public handleErrorListeners(errorCallbacks: any[], query: string, edsEvent: EDSEvent): void {
        for (let callback of errorCallbacks) {
            try {
                callback(edsEvent);
            } catch (e) {
                console.warn(`Error while handling error listener for query: ${query}`, e)
            }
        }
    }

    public handleGlobalListener(edsEvent: EDSEvent): void {
        try {
            this.globalListener?.(edsEvent);
        } catch (e) {
            console.warn(`Error while handling global error listener`, e);
        }
    }

}