# SDK for PhotonIQ EDS

PhotonIQ offers SDK to enable you connect to and deliver event streams to your applications, services, and several other data-volatile use cases. It supports both WebSocket and Server-Sent Events (SSE) connections.

# Quick Start

This section demonstrates some simple tasks to help get you started using this client SDK in two ways.

This quickstart guide will guide you through:
- Connecting to an event delivery service
- Querying and subscribing that service and receiving query results and updates

## Basic Example:

Connect to Event Delivery Service, retrieve and subsribe to SQL:
```js
let config = {
    host: "<YOUR-PHOTONIQ>.photoniq.macrometa.io",
    customerId: "<YOUR-CUSTOMER-ID>",
    apiKey: "<YOUR-API-KEY>",
    fabric: "<YOUR-FABRIC>",
};

let connection = PhotoniqEdsSdk.connect(config);

let querySet = connection.querySet();

querySet.retrieveAndSubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
    console.log(`Message event: `, event);
})
```
---
**NOTE**

The example uses a WebSocket connection. To switch to an SSE connection, add connectionTypes: `["sse"]` to the config. For a priority connection that falls back to WebSocket in case of network issues, use connectionTypes: `["sse", "ws"]`.

---

## Supported Methods

### Connect

Create a new `Connection` instance and establish connection to PhotonIQ EDS server:

```js
let connection: Connection = PhotoniqEdsSdk.connect(config);
```

### Create

Create a new `Connection` instance:

```js
let connection = PhotoniqEdsSdk.create(config);
```

#### `Config` instance schema:

| **Property** | **Type** | **Requred** | **Description** |
|----------------------|-----------|-----------|-----------------------------------|
| `host` | `string` | Yes | Host of the connection   |
| `customerId` | `string` | Yes | Customer ID credentails    |
| `apiKey` | `string` | Yes | ApiKey credentails    |
| `fabric` | `string` | No | Fabric to be used. Default is `_system`   |
| `urlParameters` | `object` | No | Custom URL query parameters set as key value properties   |
| `connectionTypes` | `(string `\|` SubConfig)[]` | No | Use type of connection and priority. Default is `["ws"]`. Types: `ws`, `sse`    |
| `autoReconnect` | `boolean` | No | Automatically reconnect in case of network issues. Default is `true`    |

#### `SubConfig` instance schema:

| **Property** | **Type** | **Requred** | **Description** |
|----------------------|-----------|-----------|---------------------------|
| `type` | `string` | Yes | Type of the connection. Value: `ws` or `sse`   |
| `customerId` | `string` | No | Customer ID credentails. Default set from `Config`     |
| `apiKey` | `string` | No | ApiKey credentails. Default set from `Config`   |
| `fabric` | `string` | No | Fabric to be used. Default set from `Config`  |
| `urlBase` | `string` | No | Set custom URL for connection.   |
| `urlParameters` | `object` | No | Custom URL query parameters set as key:value properties   |
| `pingSeconds` | `number` | No | Seconds between ping-pong messages to the WebSocket server. Default is `29`. Acceptable only for `ws` connection.   |
| `flushTimeoutMs` | `number` | No | Seconds between ping-pong messages to the WebSocket server. Default is `20`. Acceptable only for `sse` connection.   |

# Connection Instance

It maintains a WebSocket/SSE connection:

## Supported methods

### connect

Connects to the Event Delivery Service. This method can be used to reconnect after a disconnection, such as after using the `disconnect` method:
```js
connection.connect();
```

### getConfig

Retrieves the configuration of the connection. Returns a `Config` instance:
```js
connection.getConfig();
```

| **Argument** | **Type** | **Description** |
|--------------|------------|------------------------|
| return | `Config` | Client configuration of the connection |

### getId

Retrieves the connection ID:
```js
connection.getId();
```

| **Argument** | **Type** | **Description** |
|--------------|------------|------------------------|
| return | `number` | ID of the connection  |

### getStatus

Checks status of the connection:
```js
connection.getStatus();
```

The  method can return the next `ConnectionType` enum values:

| **Type** | **Description** |
|----------------------|---------------------------|
| `ConnectionType.Closed` | Connection closed  |
| `ConnectionType.Connecting` | Connection is opening    |
| `ConnectionType.Open` | Connection opened    |
| `ConnectionType.Closing` | Connection is closing   |


### getProperty

Get property of a connection:
```js
connection.getProperty(name);
```

| **Argument** | **Type** | **Description** |
|--------------|------------|------------------------|
| `name` | `string` | Name of a property  |
| return | `string` | Value of a property  |


### getProperties

Get all properties of a connection:
```js
connection.getProperties();
```

| **Argument** | **Type** | **Description** |
|--------------|------------|------------------------|
| return | `object` | Object of all property:value pairs  |

### querySet

Create a `QuerySet` instance:
```js
connection.querySet();
```

| **Argument** | **Type** | **Description** |
|--------------|------------|------------------------|
| return | `QuerySet` | Query set instance  |


### disconnect

Disconnect from the Event Delivery Service:
```js
connection.disconnect();
```

| **Argument** | **Type** | **Description** |
|--------------|------------|------------------------|
| return | `boolean` | `true` if disconnected; `false`  if it was not connected |

# Query Set And Batch

This abstract layer helps to manage a group of queries instead of working with each query independently. To initialize a new `QuerySet` instance, call the following method from the `Connection` instance:

```js
let querySet = connection.querySet();
```

## Supported methods


### retrieve

Only retrieves initial data and immediately removes the query from the Event Delivery Service after the response:
```js
querySet.retrieve("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
    console.log(`Message event: `, event);
})
```

| **Argument** | **Type** | **Requred** | **Description** |
|--------------|------------|----------|------------------------|
| `query` | `string` | Yes | SQL query to retrieve/listen  |
| `resultListener`| `function` | Yes |  Set result listener |
| `errorListenerOrOptions`| `function `\|` QueryOptions` | No |  Set error listener or set query options |
| `options` | `QueryOptions` | No | Set query options.  |

### retrieveAndSubscribe

Retrieves initial data and subscribes to changes in the query:
```js
querySet.retrieveAndSubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
    console.log(`Message event: `, event);
})
```

Retrieves compressed initial data and subscribes to changes in the query:
```js
querySet.retrieveAndSubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
    console.log(`Message event: `, event);
}, {
    compress: true
})
```

| **Argument** | **Type** | **Requred** | **Description** |
|--------------|------------|----------|-------------------|
| `query` | `string` | Yes | SQL query to retrieve/listen  |
| `resultListener`| `function` | Yes |  Set result listener |
| `errorListenerOrOptions`| `function `\|` QueryOptions` | No |  Set error listener or set query options |
| `options` | `QueryOptions` | No | Set query options.  |

### subscribe

Only subscribes to changes in the query:
```js
querySet.subscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
    console.log(`Message event: `, event);
})
```

| **Argument** | **Type** | **Requred** | **Description** |
|--------------|------------|----------|-------------------|
| `query` | `string` | Yes | SQL query to retrieve/listen  |
| `resultListener`| `function` | Yes |  Set result listener |
| `errorListenerOrOptions`| `function `\|` QueryOptions` | No | Set error listener or set query options |
| `options` | `QueryOptions` | No | Set query options.  |

### unubscribe

Removes a subscription if the query was subscribed in the `QuerySet`. This applies only to the `retrieveAndSubscribe` and `subscribe` methods:
```js
querySet.unsubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>");
```

### batch

To make requests to the Event Delivery Service more efficient, it is possible to join them into one WebSocket/SSE message. This returns a `QueryBatch`  instance, which has the same methods (`retrieve`, `retrieveAndSubscribe`, `subscribe`, `unsubscribe`) as `QuerySet`.
The final method should be`assemble()`,  which builds and sends the message:
```js
let queryBatch = querySet.batch();
queryBatch
    .retrieve("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
       console.log(`Message event: `, event);
    })
    .retrieveAndSubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
       console.log(`Message event: `, event);
    })
    .subscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
       console.log(`Message event: `, event);
    })
    .unsubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>")
    .assemble();
```

### unubscribeAll

Removes all subscriptions in the `QuerySet`:
```js
querySet.unsubscribeAll();
```


#### `QueryOptions` instance schema:

| **Property** | **Type** | **Requred** | **Description** |
|--------------|----------|-------------|-----------------|
| `compress` | `boolean` | No | compress response data  |

# Listeners and Error Handling

The Client has two types of event listeners: **global** and **query**.

## Global Listener

The listener can be attached to the client when use `connect` method to Event Delivery Service

### Example

```js
let globalListener = function(event) {
    if (event.type === "open") {
        console.log('EDS connection established: ', event);
    } else if (event.type === "properties") {
        console.log("EDS assigned properties: ", event.data);
    } else if (event.type === "server-global-error") {
        console.log(`EDS replied with an Error: `, event);
    }else if (event.type === "server-query-error") {
        console.log(`EDS replied with an Error for query '${event.query}': `, event);
    } else if (event.type === "client-global-error") {
        console.log(`Client global error: `, event);
    } else if (event.type === "client-query-error") {
        console.log(`Client error for query '${event.query}': `, event);
    } else if (event.type === "message") {
        console.log('Message event: ', event);
    } else if (event.type === "close") {
        console.log('EDS connection closed: ', event);
    }
};

let connection = PhotoniqEdsSdk.connect({
host: "<YOUR-PHOTONIQ>.photoniq.macrometa.io",
customerId: "<YOUR-CUSTOMER-ID>",
apiKey: "<YOUR-API-KEY>",
fabric: "<YOUR-FABRIC>",
}, globalListener);
```

### EDSEvent Schema

The `globalListener` function returns `EDSEvent` instance which has the next schema:

| **Property** | **Type** | **Requred** | **Description** |
|----------------------|-----------|-----------|-----------------------------------|
| `type` | `EDSEventType` | Yes | List of event types generated by EDS driver   |
| `connection` | `Connection` | Yes | An instance used for the WebSocket/SSE connection   |
| `data` | `any` | No | Present for events with data like `message`, `cnnection-id` types    |
| `code` | `number` | No | Error code, only present for server side errors    |
| `message` | `string` | No | Error message, only present in error's event   |
| `query` | `string` | No | Error for a query, only present for query's errors   |


### EDSEventType  Schema

The `type` property can have the next `EDSEventType` enum values:

| **Type** | **Description** |
|----------------------|---------------------------|
| `open` | Openned WebSocket/SSE connection   |
| `properties` | Received properties of connection   |
| `server-query-error` | Server-side error related to a query    |
| `server-global-error` | Server-side error **not** related to a query   |
| `client-query-error` | Client-side error related to a query |
| `client-global-error` | Client-side error **not** related to a query   |
| `message` | Message event |
| `close` | Closed WebSocket/SSE connection  |

## Query Listeners
The functions listen to events related to a specific query and are divided into **result** and **error** listeners.

### Result Listener
It listens only for events with `event.type === "message"` and is passed as the second parameter to the `retrieve`, `retrieveAndSubscribe`, and `subscribe` methods:
```js
let sql = "SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>";
let resultListener = (event) => {
    console.log(`Message event: `, event);
};
querySet.retrieve(sql, resultListener);
```

### Error Listener
The error listener handles error messages related to a query, which can have the types `event.type === "server-query-error"` or `event.type === "client-query-error"`

```js
let sql = "SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>";
let resultListener = (event) => {
    console.log(`Message event: `, event);
};
let errorListener = (event) => {
    console.log(`Error event: `, event);
};
querySet.retrieve(sql, resultListener, errorListener);
```