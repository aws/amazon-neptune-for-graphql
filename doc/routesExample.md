# Air Routes Example: Starting from a Neptune database with data
Amazon Neptune uses the Air Routes dataset in several Notebook tutorials. If you don't have a Neptune database with the Air Route data you can create a new database, and follow one of the Notebook tutorials to seed it with the Air Route data.

Then you can run this Neptune GraphQL Utility command to create an AppSync GraphQL API.

`neptune-for-graphql --input-graphdb-schema-neptune-endpoint `<*your-neptune-database-endpoint:port*>` --create-update-aws-pipeline --create-update-aws-pipeline-name AriRoutesExample`

The command will log during the execution the graph database schema it finds, the files it creates and the AWS resouces it creates or modifies. If you ever want to run the command logging only errors use the `--quiet` CLI option.

![Running](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/images/utilityRunning.gif)

The utility creates these files naming them based on the `--create-update-aws-pipeline-name` option, in our case `AirRoutesExample`:

| *file*  | *description*        |
|---------|----------------------|
| AirRoutes.zip |the Lambda code zip file|
| AirRoutesExample.source.schema.graphql | the GraphQL schema with directives |
| AirRoutesExample.schema.graphql | the GraphQL schema|
| AirRoutesExample.resolver.graphql.js | the JavaScript resolver |
| AirRoutesExample.neptune.schema.json | the graph schema it discovered |
| AirRoutesExample-resources.json | the list of AWS Resources it created |

## The graph schema it discovered
Below the content of the file AirRoutesExample.neptune.schema.json.
The files contains nodes, edges, properties, and edges cardinality. 
The utility then use this data to inference the GraphQL schema.

```json
{
  "nodeStructures": [
    {
      "label": "continent",
      "properties": [
        { "name": "code", "type": "String" },
        { "name": "type", "type": "String" },
        { "name": "desc", "type": "String" }]},
    {
      "label": "country",
      "properties": [
        { "name": "code", "type": "String" },
        { "name": "type", "type": "String" },
        { "name": "desc", "type": "String" }]},
    {
      "label": "version",
      "properties": [
        { "name": "date", "type": "String" },
        { "name": "code", "type": "String" },
        { "name": "author", "type": "String" },
        { "name": "type", "type": "String" },
        { "name": "desc", "type": "String" }]},
    {
      "label": "airport",
      "properties": [ 
        { "name": "country", "type": "String" },
        { "name": "longest", "type": "Int" },
        { "name": "code", "type": "String" },
        { "name": "city", "type": "String" },
        { "name": "elev", "type": "Int" },
        { "name": "icao", "type": "String" },
        { "name": "lon", "type": "Float" },
        { "name": "runways", "type": "Int" },
        { "name": "region", "type": "String" },
        { "name": "type", "type": "String" },
        { "name": "lat", "type": "Float" },
        { "name": "desc", "type": "String" }]}
  ],
  "edgeStructures": [
    {
      "label": "contains",
      "properties": [],
      "directions": [
        { "from": "continent", "to": "airport", "relationship": "ONE-MANY" },
        { "from": "country", "to": "airport", "relationship": "ONE-MANY" }
      ]
    },
    {
      "label": "route",
      "properties": [
        { "name": "dist", "type": "Int" }        
      ],
      "directions": [
        { "from": "airport", "to": "airport", "relationship": "MANY-MANY" }
      ]}
  ]
}
```

## The GraphQL schema with directives
Below the GraphQL schema with directives, inferenced by the utility.

- The Air Routes nodes labels are lower case, and GraphQL type names are typically in Pascal case, so the utility added the *@alias* directive to map the names between GraphQL and the Neptune Database.
- Because the node labelled *continent* is connected to the *airport* using the edge *contains* and the cardinality is one to many, you can see the directive *@relationship* in the GraphQL type *Continent* and new field names *airportContainssOut* returning an array of *Airport*. The type Airport has an opposite field called *continentContainsIn* as single *Continent*. This tuple declaration will enable you to query the *Continent* from the *Airport* and the list of *Airport*/s from a *Continent*.
- The edge *route* that connect an *airport* to another *airport* has a property called *dist*. You can find it in the type *Route*, and is added to the type *Airport* as well. We will see later how to query it.
- For each type the utility also added input, which are used as helpers for queries and mutations.
- For each node label the utility added two queries. One to retrive a single node/type using an id or any of the type fields listed in the input, and the second to retrive multiple values, again filtered using the input of that node/type.
- For each node three mutations: create, update and delete. Selecting the node to delete using an id or the input for that node/type.
- For edges two mutations: connect and delete. They take as input the ids of the from and to node, and in case the edge type has properties the corrispondent input.

Note: the queries and mutations you see below are recognized by the resolver based on the name pattern. If you need to customize it, first look at the documentation section: *Customize the GraphQL schema with directives*.


```graphql
type Continent @alias(property: "continent") {
  _id: ID! @id
  code: String
  type: String
  desc: String
  airportContainssOut(filter: AirportInput, options: Options): [Airport] @relationship(edgeType: "contains", direction: OUT)
  contains: Contains
}

input ContinentInput {
  _id: ID @id
  code: String
  type: String
  desc: String
}

type Country @alias(property: "country") {
  _id: ID! @id
  code: String
  type: String
  desc: String
  airportContainssOut(filter: AirportInput, options: Options): [Airport] @relationship(edgeType: "contains", direction: OUT)
  contains: Contains
}

input CountryInput {
  _id: ID @id
  code: String
  type: String
  desc: String
}

type Version @alias(property: "version") {
  _id: ID! @id
  date: String
  code: String
  author: String
  type: String
  desc: String
}

input VersionInput {
  _id: ID @id
  date: String
  code: String
  author: String
  type: String
  desc: String
}

type Airport @alias(property: "airport") {
  _id: ID! @id
  country: String
  longest: Int
  code: String
  city: String
  elev: Int
  icao: String
  lon: Float
  runways: Int
  region: String
  type: String
  lat: Float
  desc: String
  continentContainsIn: Continent @relationship(edgeType: "contains", direction: IN)
  countryContainsIn: Country @relationship(edgeType: "contains", direction: IN)
  airportRoutesOut(filter: AirportInput, options: Options): [Airport] @relationship(edgeType: "route", direction: OUT)
  airportRoutesIn(filter: AirportInput, options: Options): [Airport] @relationship(edgeType: "route", direction: IN)
  contains: Contains
  route: Route
}

input AirportInput {
  _id: ID @id
  country: String
  longest: Int
  code: String
  city: String
  elev: Int
  icao: String
  lon: Float
  runways: Int
  region: String
  type: String
  lat: Float
  desc: String
}

type Contains @alias(property: "contains") {
  _id: ID! @id
}

type Route @alias(property: "route") {
  _id: ID! @id
  dist: Int
}

input RouteInput {
  dist: Int
}

input Options {
  limit: Int
}

type Query {
  getNodeContinent(filter: ContinentInput): Continent
  getNodeContinents(filter: ContinentInput, options: Options): [Continent]
  getNodeCountry(filter: CountryInput): Country
  getNodeCountrys(filter: CountryInput, options: Options): [Country]
  getNodeVersion(filter: VersionInput): Version
  getNodeVersions(filter: VersionInput, options: Options): [Version]
  getNodeAirport(filter: AirportInput): Airport
  getNodeAirports(filter: AirportInput, options: Options): [Airport]
}

type Mutation {
  createNodeContinent(input: ContinentInput!): Continent
  updateNodeContinent(input: ContinentInput!): Continent
  deleteNodeContinent(_id: ID!): Boolean
  createNodeCountry(input: CountryInput!): Country
  updateNodeCountry(input: CountryInput!): Country
  deleteNodeCountry(_id: ID!): Boolean
  createNodeVersion(input: VersionInput!): Version
  updateNodeVersion(input: VersionInput!): Version
  deleteNodeVersion(_id: ID!): Boolean
  createNodeAirport(input: AirportInput!): Airport
  updateNodeAirport(input: AirportInput!): Airport
  deleteNodeAirport(_id: ID!): Boolean
  connectNodeContinentToNodeAirportEdgeContains(from_id: ID!, to_id: ID!): Contains
  deleteEdgeContainsFromContinentToAirport(from_id: ID!, to_id: ID!): Boolean
  connectNodeCountryToNodeAirportEdgeContains(from_id: ID!, to_id: ID!): Contains
  deleteEdgeContainsFromCountryToAirport(from_id: ID!, to_id: ID!): Boolean
  connectNodeAirportToNodeAirportEdgeRoute(from_id: ID!, to_id: ID!, edge: RouteInput!): Route
  updateEdgeRouteFromAirportToAirport(from_id: ID!, to_id: ID!, edge: RouteInput!): Route
  deleteEdgeRouteFromAirportToAirport(from_id: ID!, to_id: ID!): Boolean
}

schema {
  query: Query
  mutation: Mutation
}
```

## Let's use our new GraphQL API from AppSync console
Here below snapshot of the AppSync Queries console used to test our new GraphQL API named *AirRoutesExampleAPI*.
In the middle window, the Explorer shows you the queries and mutations. You can then pick a query, the input parameters and the return fields. 

In this case it formed a GrahQL query that is looking for one *Airport*, with *code* equal *SEA*, and return the *city*, the outboud flights *airportsOut*, and for each destination the *city* and the *route* distance, *dist*. As mentioned earlier in the graph database the nodes *airport* are connected with the edge type *route*, and *dist* is a property of the edge.

You can then follow the AppSync documentation on how to call the GraphQL API from your application, enable caching and other AppSync API features.

![AppSync Queries UI](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/images/AppSyncQuery.jpg)


