# Neptune GraphQL Utility Command Line options Reference


`--help, --h, -help, -h`
<br>
Help

`--input-schema <value>`<br>
`--input-schema-file <value>`
<br>
The GraphQL schema with or without directives as data or file name.

`--input-schema-changes-file <value>`
<br>
The file that contains your GraphQL schema changes to be applied when you run the utility multiple time. When you run the utility poiniting to a database multiple times, and you manually changed the GraphQL source schema, maybe adding a custom query, your chnages will be lost. To avoid it, add your changes to the a json file and pass it to this option. See section [*Re-apply your changes*](#re-apply-your-changes-with---input-schema-changes-file) for the file format.

```json
[
     { "type": "graphQLTypeName",
       "field": "graphQLFieldName",
       "action": "remove|add",
       "value": "value"
    }
]
```

`--input-graphdb-schema <value>`<br>
`--input-graphdb-schema-file <value>`
<br>
The graphdb schema as data or file name. Instead of pointing to a Neptune database you can edit a graphdb schema as use it as input.

```json
{
    "nodeStructures": [
        { "label":"nodelabel1",
            "properties": [
                { "name":"name1", "type":"type1" }
            ]
        },
        { "label":"nodelabel2",
            "properties": [
                { "name":"name2", "type":"type1" }
        ]}
    ],
    "edgeStructures": [
        { "label":"label1",
            "directions": [
                { "from":"nodelabel1", "to":"nodelabel2", "relationship":"ONE-ONE|ONE-MANY|MANY-MANY"  }
            ],
            "properties": [
                { "name":"name1", "type":"type1" }
            ]
        }]
    }
```

`--input-graphdb-schema-neptune-endpoint <value>`
<br>
The Neptune database enpoint from which the utility extract the graphdb schema.

`--output-schema-file <value>`
<br>
The file name output for the GraphQL schema. If not specified the default is *output.schema.graphql*, or if a pipeline name is set with `--create-update-aws-pipeline-name` the file name is going to be *pipeline-name.schema.graphql*. 

`--output-source-schema-file <value>`
<br>
The file name output for the GraphQL schema with directives. If not specified the default is *output.source.schema.graphql*, or if a pipeline name is set with `--create-update-aws-pipeline-name` the file name is going to be *pipeline-name.source.schema.graphql*

`--output-schema-no-mutations`
<br>
The inferred GraphQL schema will not have mutuations, just queries.

`--output-neptune-schema-file`
<br>
The file name output for discovered Neptune graphdb schema. If not specified the default is *output.graphdb.json*, or if a pipeline name is set with `--create-update-aws-pipeline-name` the file name is going to be *pipeline-name.graphdb.json*. 

`--output-js-resolver-file <value>`
<br>
The file name output for a copy of the resolver code. If not specified the default is *output.resolver.graphql.js*, or if a pipeline name is set with `--create-update-aws-pipeline-name` the file name is going to be *pipeline-name.resolver.graphql.js*. This file is zipped in code package uploaded to the Lambda function that run the resolver.

`--create-update-aws-pipeline`
<br>
This trigger the creation of the AWS resources for the GraphQL API, including the AppSync GraphQL API and the Lambda that run the resolver.

`--create-update-aws-pipeline-name <value>`
<br>
This set the name for the pipeline like pipeline-nameAPI for the AppSync API or pipeline-nameFunction for the Lambda function. If not specifies and `--create-update-aws-pipeline` will use the Neptune database name.

`--create-update-aws-pipeline-region <value>`
<br>
This set the AWS region in which the pipeline for the GraphQL API is created. If not specified will default to us-east-1, or use the Neptune database region from extracted from the database endpoint.

`--create-update-aws-pipeline-neptune-endpoint <value>`
<br>
This set the Neptune database endpoint used by the Lambda function to query the Neptune database. If not set it used the endpoint set with `--input-graphdb-schema-neptune-endpoint`.

`--remove-aws-pipeline-name <value>`
<br>
It removes the pipeline created with `--create-update-aws-pipeline`. The resources to remove are from a file called *pipeline-name.resources.json*.

`--output-aws-pipeline-cdk`
<br>
This trigger the creation of a CDK file to be use to create the AWS resources for the GraphQL API, including the AppSync GraphQL API and the Lambda that run the resolver.

`--output-aws-pipeline-cdk-neptume-endpoint <value>`
<br>
This set the Neptune database endpoint used by the Lambda function to query the Neptune database. If not set it used the endpoint set with `--input-graphdb-schema-neptune-endpoint`.

`--output-aws-pipeline-cdk-name <value>`
<br>
This set the name for the pipeline like pipeline-nameAPI for the AppSync API or pipeline-nameFunction for the Lambda function. If not specifies and `--create-update-aws-pipeline` will use the Neptune database name.

`--output-aws-pipeline-cdk-region <value>`
<br>
This set the AWS region in which the pipeline for the GraphQL API is created. If not specified will default to us-east-1, or use the Neptune database region from extracted from the database endpoint.

`--output-aws-pipeline-cdk-file <value>`
<br>
This set the CDK file name. If not set the default is *pipeline-name-cdk.js*.
