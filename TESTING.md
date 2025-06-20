# **Amazon Neptune Utility for GraphQL&trade; Tests**

The Amazon Neptune Utility for GraphQL project contains unit and integration
tests. When contributing changes to the project, one should ensure that these
tests are updated accordingly and are successful before opening a pull request.

All unit and integration tests can be executed with the following command:

```
npm test
```

## Unit Tests

Unit tests do not require a neptune db cluster or graph and can be executed with
the following command:

```
npm run test:unit
```

## Integration Tests

Integration tests execute against a live neptune db cluster or graph and require
the following prerequisites to run:

1. `npm install` 
2. neptune db cluster or graph which is accessible from the machine running the
   tests and is [loaded with the airports sample dataset](#loading-airports-sample-data-into-neptune)
2. aws credentials configured appropriately on the machine running the tests to
   allow query access to the neptune db or cluster
3. environment variables `AIR_ROUTES_DB_HOST` and `AIR_ROUTES_DB_PORT` set to
   identify the neptune db cluster or graph, for example:

```
# neptune db cluster
export AIR_ROUTES_DB_HOST=air-routes.cluster-123.us-west-2.neptune.amazonaws.com
export AIR_ROUTES_DB_PORT=8182
```

```
# neptune analytics graph
export AIR_ROUTES_DB_HOST=g-abc123.us-west-2.neptune-graph.amazonaws.com
export AIR_ROUTES_DB_PORT=8182
```

To execute the integration tests use the following command:

```
npm run test:integration
```

## Loading Airports Sample Data Into Neptune

The easiest way to load the airports sample data into Neptune is using the [%seed line magic](https://docs.aws.amazon.com/neptune/latest/userguide/notebooks-magics.html#notebooks-line-magics-seed) in a Neptune notebook. To set up a Neptune notebook see [Using Amazon Neptune with graph notebooks](https://docs.aws.amazon.com/neptune/latest/userguide/graph-notebooks.html) and [Using notebooks with Neptune Analytics](https://docs.aws.amazon.com/neptune-analytics/latest/userguide/notebooks.html).


> [TIP!]
> The integration tests expect neptune db clusters to be loaded with the airports `gremlin` sample dataset and neptune analytics graphs to be loaded with the airports `opencypher` sample dataset (the gremlin airports dataset is not available for neptune analytics).

[Seed Airport Data with Gremlin](doc/images/SeedAirportsGremlin.png)

[Seed Airport Data with Cypher](doc/images/SeedAirportsCypher.png)