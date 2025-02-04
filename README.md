<br>
<img src="https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/images/utilityRunning.gif" width="180" height="100">

# **Amazon Neptune utility for GraphQL&trade; schemas and resolvers**

The Amazon Neptune utility for GraphQL&trade; is a Node.js command-line utility to help with the creation and maintenance of a GraphQL API for the Amazon Neptune Database or Neptune Analytics graph. It is a no-code solution for a GraphQL resolver when GraphQL queries have a variable number of input parameters and return a variable number of nested fields.

If you **start from a Neptune database with data**, the utility discover the graph database schema including nodes, edges, properties and edges cardinality, generate the GraphQL schema with the directives required to map the GraphQL types to the graph databases nodes and edges, and auto-generate the resolver code. We optimized the resolver code to reduce the latency of querying Amazon Neptune by returning only the data requested by the GraphQL query. *(Note: the utility works only for Property Graph databases, not RDF yet)*

You can also **start with a GraphQL schema with your types and an empty Neptune database**. The utility will process your starting GraphQL schema and inference the directives required to map it to the Neptune database graph nodes and edges. You can also **start with GraphQL schema with the directives**, that you have modified or created.

The utility has the option to **generate the AWS resources** of the entire pipeline, including the AWS AppSync API, configuring the roles, data source, schema and resolver, and the AWS Lambda that queries Amazon Neptune.

If you have a **few queries** with a static number of input parameters and return fields, and you are willing to code your GraphQL resolver, look at these blogs:

- [Building Serverless Calorie tracker application with AWS AppSync and Amazon Neptune](https://github.com/aws-samples/aws-appsync-calorie-tracker-workshop)
- [Integrating alternative data sources with AWS AppSync: Amazon Neptune and Amazon ElastiCache](https://aws.amazon.com/blogs/mobile/integrating-aws-appsync-neptune-elasticache/)

<br>

Index:
- [Install and Setup](#install-and-setup)
- [Starting from a Neptune database with data](#starting-from-a-neptune-database-with-data)
- [Starting from a Neptune database with data: Air Routes Example](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/routesExample.md)
- [Starting from a GraphQL schema and an empty Neptune database](#starting-from-a-graphql-schema-and-an-empty-neptune-database)
- [Starting from a GraphQL schema and an empty Neptune database: Todo Example](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/todoExample.md)
- [Starting from GraphQL schema with directives](#starting-from-a-graphql-schema-with-directives)
- [Customize the GraphQL schema with directives](#customize-the-graphql-schema-with-directives)
- [AWS resources for the GraphQL API](#aws-resources-for-the-graphql-api)
- [Generate Apollo Server Artifacts](#generate-apollo-server-artifacts)
- [Commands reference: utility CLI options](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/cliReference.md)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [License](#license)
- [Contributing](#contributing)

<br>

# Install and Setup 
The utility requires Node.js to be executed. Some features require reaching to a Neptune database, and having access to the AWS CLI with permissions to create AWS resources. You can also run the utility just to process input files without the need to connect it directly to a Neptune database or to create AWS resources. In this case you will find the GraphQL schemas and the resolver code in the local *output* directory.

### Node.js is required in any scenario
Node.js is required to run the utility, v18 or above. 
- To install it on macOS or Windows go to the [Node.js website](https://nodejs.org/) to download the installer.
- To install on an EC2-Instance follow the [AWS documentation](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-up-node-on-ec2-instance.html).

### Install the Amazon Neptune utility for GraphQL
The utility is available as NPM package. To install it:

`npm install @aws/neptune-for-graphql -g`

After the installation run the utility `--help`` command to check if runs:

`neptune-for-graphql --help` 

### Reach to a Neptune database endpoint
If you are starting from a Neptune database with data, you need to enable the utility to reach the database endpoint. By default Neptune databases are accessible only within a VPC.

The easiet way is to run the utility from an EC2 instance which network is configured within your Neptune database VPC. The minimum size instance to run the utility is ***t2.micro*** (free of charge). During the creation of the instance select the Neptune database VPC using the *Common Security Groups* pulldown menu.


#### Next Step
- Install Node.js
- [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) if you need to create the AWS resources, or you need an IAM role to access the Neptune database.

<br>


# Starting from a Neptune database with data
Independently if you are familiar with GraphQL or not, the command below is the fastest way to create a GraphQL API. Starting from an existing Neptune database endpoint, the utility scans the Neptune database discovering the schema of the existing nodes, edges and properties. Based on the graph database schema, it inferences a GraphQL schema, queries and mutations. Then, it creates an AppSync GraphQL API, and the required AWS resources, like a pair of IAM roles and a Lambda function with the GraphQL resolver code. As soon as the utility complete the execution, you will find in the AppSync console your new GraphQL API called *your-new-GraphQL-API-name*API. To test it, use the AppSync “Queries” from the menu. (*Note: follow the setup instructions below to enable your environment to reach the Neptune database and create AWS resources.*)

`neptune-for-graphql --input-graphdb-schema-neptune-endpoint `<*your-neptune-database-endpoint:port*>` --create-update-aws-pipeline --create-update-aws-pipeline-name` <*your-new-GraphQL-API-name*>` --output-resolver-query-https`

If you run the command above a second time, it will look again at the Neptune database data and update the AppSync API and the Lambda code.

To rollback, removing all the AWS resources run:

`neptune-for-graphql --remove-aws-pipeline-name` <*your-new-GraphQL-API-name*>

#### References:
- [Here](/doc/routesExample.md) is an example using the Air Routes data on Amazon Neptune, showing the outputs of the utility.
- If you are wondering which AWS resources the utility is creating, look at the section below.
- To customize the GraphQL schema, look at the section below.

<br>

# Starting from a GraphQL schema and an empty Neptune database
You can start from an empty Neptune database and use a GraphQL API to create the data and query it. Running the command below, the utility will automate the creation of the AWS resources. Your *your-graphql-schema-file* must include the GraphQL schema types, like in the TODO example [here](/doc/todoExample.md). The utility will analyze your schema and create an extended version based on your types. It will add queries and mutations for the nodes stored in the graph database, and in case your schema have nested types, it will add relationships between the types stored as edges in the graph database, again see the TODO example [here](/doc/todoExample.md). The utility creates an AppSync GraphQL API, and the required AWS resources, like a pair of IAM roles and a Lambda function with the GraphQL resolver code. As soon as the utility complete the execution, you will find in the AppSync console your new GraphQL API called *your-new-GraphQL-API-name*API. To test it, use the AppSync “Queries” from the menu. (*Note: follow the setup instructions below to enable your environment to reach the Neptune database and create AWS resources.*)

`neptune-for-graphql --input-schema-file `<*your-graphql-schema-file*>` --create-update-aws-pipeline --create-update-aws-pipeline-name` <*your-new-GraphQL-API-name*>` --create-update-aws-pipeline-neptune-endpoint` <*your-neptune-database-endpoint:port*>  ` --output-resolver-query-https`

#### References:
- [Here](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/todoExample.md) is an example using a TODO GraphQL schema, showing the outputs of the utility.
- If you are wondering which AWS resources the utility is creating, look at the section below.
- To customize the GraphQL schema, look at the section below.

<br>

# Starting from a GraphQL schema with directives
You can start from a GraphQL schema with directives for a graph database. For the list of supported directives see the section below [Customize the GraphQL schema with directives](#customize-the-graphql-schema-with-directives). 


`neptune-for-graphql --input-schema-file `<*your-graphql-schema-file-with-directives*>` --create-update-aws-pipeline --create-update-aws-pipeline-name` <*your-new-GraphQL-API-name*> `--create-update-aws-pipeline-neptune-endpoint` <*your-neptune-database-endpoint:port*>` --output-resolver-query-https`


<br>

# Customize the GraphQL schema with directives
The utility generate a GraphQL schema with directives, queries and mutations. You might want to use it as is, or change it. Here below ways to change it.

### Please no mutations in my schema
In case you don't want your Graph API having the option of updating your database data, add the the CLI option `--output-schema-no-mutations`.



### @alias
This directive can be applied to GraphQL schema types or fields. It maps different names between the graph database and the GraphQL schema. The syntax is *@alias(property: your-name)*. In the example below *airport* is the graph database node label mapped to the *Airport* GraphQL type, and *desc* is the property of the graph database node mapped to the field *description*. See the [Air Routes Example](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/routesExample.md). The GraphQL guidance is pascal case for types and camel case for fields.

```graphql
type Airport @alias(property: "airport") {  
  city: String
  description: String @alias(property: "desc")  
}
```

### @relationship
This directive maps nested GraphQL types to a graph databases edges. The syntax is *@relationship(edgeType: graphdb-edge-name, direction: IN|OUT)*. 
<br>
See the [Todo Example](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/todoExample.md) and the [Air Routes Example](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/routesExample.md).

```graphql
type Airport @alias(property: "airport") {
  ...
  continentContainsIn: Continent @relationship(edgeType: "contains", direction: IN)
  countryContainsIn: Country @relationship(edgeType: "contains", direction: IN)
  airportRoutesOut(filter: AirportInput, options: Options): [Airport] @relationship(edgeType: "route", direction: OUT)
  airportRoutesIn(filter: AirportInput, options: Options): [Airport] @relationship(edgeType: "route", direction: IN)
}
```

### @graphQuery, @cypher
You can define your openCypher queries to resolve a field value, add queries or mutations. 

Here new a field *outboundRoutesCount* is added to the type *Airport* to count the outboud routes:

```graphql
type Airport @alias(property: "airport") {
  ...
  outboundRoutesCount: Int @graphQuery(statement: "MATCH (this)-[r:route]->(a) RETURN count(r)")
}
```
Here an example of new queries and mutations. Note that if you omit the *RETURN*, the resolver will assume the keyword *this* is the returning scope.
```graphql
type Query {
  getAirportConnection(fromCode: String!, toCode: String!): Airport @cypher(statement: "MATCH (:airport{code: '$fromCode'})-[:route]->(this:airport)-[:route]->(:airport{code:'$toCode'})")   
}

type Mutation {
  createAirport(input: AirportInput!): Airport @graphQuery(statement: "CREATE (this:airport {$input}) RETURN this")
  addRoute(fromAirportCode:String, toAirportCode:String, dist:Int): Route @graphQuery(statement: "MATCH (from:airport{code:'$fromAirportCode'}), (to:airport{code:'$toAirportCode'}) CREATE (from)-[this:route{dist:$dist}]->(to) RETURN this")
}
```

You can add a query or mutation using a Gremlin query. At this time Gremlin queries are limited to return *scalar* values, or *elementMap()* for a single node, or *elementMap().fold()* for a list of nodes.
```graphql
type Query {
  getAirportWithGremlin(code:String): Airport @graphQuery(statement: "g.V().has('airport', 'code', '$code').elementMap()") # single node
  getAirportsWithGremlin: [Airport] @graphQuery(statement: "g.V().hasLabel('airport').elementMap().fold()") # list of nodes
  getCountriesCount: Int @graphQuery(statement: "g.V().hasLabel('country').count()")  # scalar example
}
```

### @id
The directive @id identify the field mapped to the graph database entity id. Graph databases like Amazon Neptune always have a unique id for nodes and edges assigned during bulk imports or autogenerated. 
In the example below _id 
```graphql
type Airport {
  _id: ID! @id
  city: String
  code: String  
}
```

### Reserved types, queries and mutations names
The utility autogenerates queries and mutations to enable you to have a working GraphQL API just after having ran the utility. The pattern of these names are recognized by the resolver and are reserved. Here an example for the type *Airport* and the connecting type *Route*:

The type *Options* is reserved. 
```graphql
input Options {
  limit: Int
}
```

The function parameters *filter*, and *options* are reserved.
```graphql
type Query {  
    getNodeAirports(filter: AirportInput, options: Options): [Airport]
}
```

The beginning of query names *getNode...*, and the beginning of the mutations names like *createNode...*, *updateNode...*, *deleteNode...*, *connectNode...*, *updateEdge...*, and *deleteEdge...*.
```graphql
type Query {  
  getNodeAirport(id: ID, filter: AirportInput): Airport
  getNodeAirports(filter: AirportInput): [Airport]
}

type Mutation {  
  createNodeAirport(input: AirportInput!): Airport
  updateNodeAirport(id: ID!, input: AirportInput!): Airport
  deleteNodeAirport(id: ID!): Boolean  
  connectNodeAirportToNodeAirportEdgeRoute(from: ID!, to: ID!, edge: RouteInput!): Route
  updateEdgeRouteFromAirportToAirport(from: ID!, to: ID!, edge: RouteInput!): Route
  deleteEdgeRouteFromAirportToAirport(from: ID!, to: ID!): Boolean
}
```

### Re-apply your changes with --input-schema-changes-file
You might want to modify the GraphQL source schema and run the utility again to get the latest schema from your Neptune database. Every time the utility discovers a new graphdb schema, it generates a new GraphQL schema. To inject your changes, you can manually edit the GraphQL source schema and run the utility again, using it as input instead of the Neptune database endpoint, or write your changes in the format below. As you run the utility with the added option `--input-schema-changes-file <your-changes-file>`, your changes will be applied at once.
```json
[
     { "type": "graphQLTypeName",
       "field": "graphQLFieldName",
       "action": "remove|add",
       "value": "value"
    }
]
```
For Example:

```json
[
    { "type": "Airport", "field": "outboundRoutesCountAdd", "action": "add", "value":"outboundRoutesCountAdd: Int @graphQuery(statement: \"MATCH (this)-[r:route]->(a) RETURN count(r)\")"},    
    { "type": "Mutation", "field": "deleteNodeVersion", "action": "remove", "value": "" },
    { "type": "Mutation", "field": "createNodeVersion", "action": "remove", "value": "" }
]
```


<br>

# AWS resources for the GraphQL API
You have three option to created the GraphQL API pipeline:
- Let the utility create the AWS resources
- Let the utility create a CDK file, then you run it
- You manually create the AWS resources 

Independently of the method you or the utility will need to create the following resources:
- Create a IAM role for Lambda called LambdaExecutionRole
- Attach to the LambdaExecutionRole the IAM policy AWSLambdaBasicExecutionRole
- For VPC (default) attach to the LambdaExecutionRole the IAM policy AWSLambdaVPCAccessExecutionRole
- For IAM create and attach to the LambdaExecutionRole a new IAM policy that only allow to connect and query Neptune
- Create a Lambda function with the LambdaExecutionRole
- Create a IAM for AppSync API to call the Lambda called LambdaInvocationRole
- Attach to the LambdaInvocationRole the policy LambdaInvokePolicy
- Create the AppSync GraphQL API 
- Add to the AppSync API a Function with the LambdaInvocationRole to call the Lambda


### Let the utility create the resources
With the CLI option `--create-update-aws-pipeline`, and its accesory options ([see the commands reference](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/cliReference.md)), the utility automatically creates the resources.<br>
You need to run the utility from a shell in which you installed the AWS CLI, and it is configured for a user with the permission of creating AWS resources. <br>
The utility creates a file with the list of resources named *pipeline-name.resources.json*. Then it uses the file to modify the existing resources when the user runs the command again, or when the user wants to delete the AWS resources with the command option `--remove-aws-pipeline-name <value>`.
The code of the utility uses the JavaScript AWS sdk v3, if you'd like to review the code is only in [this file](https://github.com/aws/amazon-neptune-for-graphql/blob/main/src/pipelineResources.js).

### I prefer a CDK file
To option to trigger the creation of the CDK file starts with `--output-aws-pipeline-cdk`, and its accessory options ([see the commands reference](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/cliReference.md)). <br> 
After you ran it, you will find in the *output* folder the file *CDK-pipeline-name-cdk.js* and *CDK-pipeline-name.zip*. The ZIP file is the code for the Lambda function.
See CDK end to end example [here](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/cdk.md).

### Let me setup the resources manually or with my favorite DevOps toolchain
[Here](https://github.com/aws/amazon-neptune-for-graphql/blob/main/doc/resources.md) the detailed list of resources needed to configure the GraphQL API pipeline.
<br>

# Generate Apollo Server Artifacts
If you prefer to use Apollo Server instead of AWS App Sync, the utility can generate a ZIP file of Apollo Server artifacts with the CLI option `--create-update-apollo-server` for a standalone server or `--create-update-apollo-server-subgraph` for federated systems.

For example:
```
neptune-for-graphql \
  --input-graphdb-schema-neptune-endpoint abc.us-west-2.neptune.amazonaws.com:8182 \
  --create-update-apollo-server \
  --output-resolver-query-https
```

The command above will generate an `apollo-server.zip` file which can then be deployed locally by following these steps:
1. unzip `apollo-server.zip`
2. change directory into the unzipped folder
3. execute `npm install` to install required dependencies
4. execute `node index.mjs` to start the Apollo Server
5. access the graphQL application in a browser by visiting `http://localhost:4000/`

> [!NOTE] 
> Node's default AWS credentials provider is used for authentication with Neptune. See [AWS SDK credential providers](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/#fromnodeproviderchain) for more information.

# Known limitations
- @graphQuery using Gremlin works only if the query returns a scalar value, one elementMap(), or list as elementMap().fold(), this feature is under development.
- Neptune RDF database and SPARQL language is not supported.
- Querying Neptune via SDK is not yet supported for Apollo Server, only HTTPS is supported.
- Mutations are not yet supported for Apollo Server
<br>

# Roadmap
- Gremlin resolver.
- SPARQL resolver for RDF database.
- Enhanced configurations for Apollo Server.
<br>

# License
Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at http://www.apache.org/licenses/LICENSE-2.0
or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License. [Full license page](/LICENSE.txt).
<br>

# Contributing
Follow AWS open source practices.
<br>
[Contributing page.](/CONTRIBUTING.md)
<br>
[Code of conduct page.](/CODE_OF_CONDUCT.md)
<br>
