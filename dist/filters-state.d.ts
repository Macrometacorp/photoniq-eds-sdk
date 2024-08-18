/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */
import { EDSEvent, Filter, FilterState } from "./types";
import { Query, QuerySet } from "./query-set";
export declare const FALSE: string;
export declare const TRUE: string;
export declare const ADD: string;
export declare const REMOVE: string;
export declare class FiltersState {
    private readonly queries;
    private readonly globalListener;
    constructor(globalListener: (event: EDSEvent) => void);
    private calculateFilter;
    increment(filterState: FilterState): void;
    tryToRemove(filterState: FilterState, query: string): Filter | undefined;
    equalFiltersWithoutQueries(a: Filter, b: Filter): boolean;
    addQueries(queries: Query[], initialData: boolean, once: boolean, compress: boolean, querySet: QuerySet): Filter[];
    filterForQuery(query: string): FilterState | undefined;
    removeAllQueries(querySet: QuerySet): Filter | undefined;
    removeQueries(queries: string[], querySet: QuerySet): Filter | undefined;
    activeFilters(): Filter[];
    handleErrorListeners(errorCallbacks: any[], query: string, edsEvent: EDSEvent): void;
    handleGlobalListener(edsEvent: EDSEvent): void;
}
