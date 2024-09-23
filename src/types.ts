/**
 * Copyright (C) Macrometa, Inc - All Rights Reserved
 *
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Macrometa, Inc <product@macrometa.com>, May 2024
 */

import { QuerySet } from "./query-set";
/**
 * @module Types
 *
 * 
 */

export const PHOTONIQ_ES: string = "x-photoniq-es";


/**
 * Configure connection
 * @param host host of the connection
 * @param customerId customer id credentails
 * @param apiKey ApiKey credentails
 * @param fabric fabric to be used. Default is `_system`
 * @param primaryConnection primary type of connection
 * @param pingSeconds seconds to send ping-pong messages for the server. Default is `29`  
 */
export type Config = {
    host: string;
    customerId: string;
    apiKey: string;
    fabric?: string;
    connectionTypes?: string[];
    autoReconnect?: boolean;
    pingSeconds?: number;
    queryType?: string;
};

/**
 * List of event types generated by EDS driver
*/
export enum EDSEventType {
    Open = "open",
    Close = "close",
    Properties = "properties",
    ServerQueryError = "server-query-error",
    ServerGlobalError = "server-global-error",
    ClientQueryError = "client-query-error",
    ClientGlobalError = "client-global-error",
    Message = "message"
}

/**
 * @param type type of event
 * @param connection connection instance which participated in event
 * @param data result of event
 */
export type EDSEvent = {
    type: EDSEventType;
    connection: Connection;
    data: any;
};

/**
 * @param code returns code or the error. Exists only for server responses
 * @param message error message
 * @param query error belongs to query in case if the error is not global
 */
export type EDSEventError = {
    code?: number;
    message: string;
    query?: string;
};

/**
 * @param query query of the event
 * @param count number of message returned by the subscribed query
 * @param retrieve return true if it is an intial data
 */
export type EDSEventMessage = {
    query: string;
    count: number;
    retrieve: boolean;
};


export interface Connection {
    connect(): void;
    send(filters: Filter[]): void;
    flush(): void;
    disconnect(): boolean;
    getStatus(): ConnectionStatus;
    getId(): string | undefined;
    getProperty(name: string): string | undefined;
    getProperties(): ConnectionProperties;
}

export interface InternalConnection extends Connection  {
    onOpen(listener: (event: any) => void): void;
    onMessage(listener: (query: string, filterState: FilterState, data: any) => void): void;
    onProperties(listener: (event: any) => void): void;
    onClose(listener: (event: any) => void): void;
    onError(listener: (event: any, server: boolean) => void): void;
}

export enum ConnectionStatus {
    Closed = "closed",
    Connecting = "connecting",
    Open = "open",
    Closing = "closing",
}

export type Filter = {
    action: string;
    initialData?: string;
    compress?: string;
    once?: string;
    filterType?: string;
    queries: string[];
};

export type FilterState = {
    querySets: QuerySetWithFilter[];
    sent: boolean;
};

export type QuerySetWithFilter = {
    querySet: QuerySet;
    compress: boolean;
    once: boolean;
    count: number;
    initialData: boolean;
    callbacks: any[];
    errorCallbacks: any[];
}

export type ConnectionProperties = {
    [key: string]: string;
};
