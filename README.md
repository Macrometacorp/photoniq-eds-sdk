# SDK for PhotonIQ EDS

JavaScript/TypeScript Driver for the PhotonIQ Event Delivery Service (EDS). Runs under Web Socket/SSE connection.


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
let connection = PhotoniqEdsSdk.connect({
  host: "<YOUR-PHOTONIQ>.photoniq.macrometa.io",
  customerId: "<YOUR-CUSTOMER-ID>",
  apiKey: "<YOUR-API-KEY>",
  fabric: "<YOUR-FABRIC>"
});
    
let qs = connection.querySet();

// Retrieve data by query without listening for changes.
qs.retrieve("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
  console.log(`Event: `, event);
});

// Retrieve data by query and listen for changes.
qs.retrieveAndSubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
  console.log(`Event: `, event);
});

// Listen data for changes.
qs.subscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
  console.log(`Event: `, event);
});

// Unsubscribe from query
qs.unsubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>");

// Unsubscribe from all queries
qs.unsubscribeAll();
```

## Use as a module

1. Install the module:

```
npm i photoniq-eds-sdk
```

2.  Add dependency in the project:

- Vue Example:
```
<script>
import { connect } from 'photoniq-eds-sdk';

export default {
  name: 'App',
  mounted() {
    this.initialize();
  },
  methods: {
    initialize() {
      try {

        let optionalGlobalListener = function(event) {
          if (event.type === "open") {
            console.log('EDS connection established: ', event);
          } else if (event.type === "properties") {
            console.log("EDS assigned connection's ID: " + event.data);
          } else if (event.type === "server-global-error") {
            console.log(`EDS replied with an Error: `, event);
          }else if (event.type === "server-query-error") {
            console.log(`EDS replied with an Error for query '${event}': `, event);
          } else if (event.type === "client-global-error") {
            console.log(`Client global error: `, event);
          } else if (event.type === "client-query-error") {
            console.log(`Client error for query '${event}': `, event);
          } else if (event.type === "close") {
            console.log('EDS connection closed: ', event);
          }
        };

        let connection = connect({
          host: "<YOUR-PHOTONIQ>.photoniq.macrometa.io",
          customerId: "<YOUR-CUSTOMER-ID>",
          apiKey: "<YOUR-API-KEY>",
          fabric: "<YOUR-FABRIC>"
        }, optionalGlobalListener);
        let qs = connection.querySet();

        qs.retrieveAndSubscribe("SELECT * FROM <YOUR-COLLECTION> WHERE key=<YOUR-KEY>", (event) => {
          console.log(`Event: `, event);
        });

      } catch (error) {
        console.error('Error:', error);
      }
    }
  }
}
</script>
```

## Docs

Generated in [/docs](/docs) folder

Build docs
```bash
typedoc
```


