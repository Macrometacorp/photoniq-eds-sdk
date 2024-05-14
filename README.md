# Web Socket Driver for PhotonIQ EDS

JavaScript/TypeScript Driver for the PhotonIQ Event Delivery Service (EDS). Runs under Web Socket connection.


## Create a bundle

Development
```shell
npm run build
```

Release
```shell
npm run release
```

## Example

```JavaScript
let connection = PhotoniqEdsWs.connect({
    host: "nbapoc.photoniq.macrometa.io",
    customerId: "<your_customer_id>",
    apiKey: "<your_api_key>",
    fabric: "dev_courtside",
    }, function(event) {
        if (event.type === "open") {
            console.log('EDS connection established: ', event);
        } else if (event.type === "connection-id") {
            console.log("EDS assigned connection's ID: " + event.data);
        } else if (event.type === "server-global-error") {
            console.log(`EDS replied with an Error: `, event);
        }else if (event.type === "server-query-error") {
            console.log(`EDS replied with an Error for query '${event.query}': `, event);
        } else if (event.type === "client-global-error") {
            console.log(`Client global error: `, event);
        } else if (event.type === "client-query-error") {
            console.log(`Client error for query '${event.query}': `, event);
        } else if (event.type === "close") {
            console.log('EDS connection closed: ', event);
        }
    });
    
    let qs = connection.querySet();
     
    // default usage
    qs.retrieve("SELECT linescore FROM game_live WHERE _key='0012307019'", (event) => {
        console.log(`Linescore event: `, event);
    })
    
    // use as batch
    qs.batch()
    .retrieveAndSubscribe("SELECT clock FROM game_live WHERE _key='0012307019'", (event) => {
        console.log(`Clock event: `, event);
    })
    .retrieveAndSubscribe("SELECT htm FROM game_live WHERE _key='0012307019'", (event) => {
        console.log(`Htm event: `, event);
    })       
    .assemble(); 

```

## Docs

Generated in [/docs](/docs) folder

Build docs
```bash
typedoc
```


