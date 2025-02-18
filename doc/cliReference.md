# Neptune GraphQL Utility Command Line options Reference

`--help, --h, -help, -h`
<br>
Help

`--version, -v`
<br>
Version

`--quiet, -q`
<br>
Logs to the console only the errors.

## Input
`--input-schema <value>, -is <value>`<br>
`--input-schema-file <value>, -isf <value>`
<br>
The GraphQL schema with or without directives as data or file name.

`--input-schema-changes-file <value>, -isc <value>`
<br>
The file that contains your GraphQL schema changes to be applied when you run the utility multiple time. When you run the utility pointing to a database multiple times, and you manually changed the GraphQL source schema, maybe adding a custom query, your changes will be lost. To avoid it, add your changes to the a json file and pass it to this option. See section [*Re-apply your changes*](#re-apply-your-changes-with---input-schema-changes-file) for the file format.

```json
[
     { "type": "graphQLTypeName",
       "field": "graphQLFieldName",
       "action": "remove|add",
       "value": "value"
    }
]
```

`--input-graphdb-schema <value>, -ig <value>`<br>
`--input-graphdb-schema-file <value>, -igf <value>`
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

`--input-graphdb-schema-neptune-endpoint <value>, -ie <value>`
<br>
The Neptune database endpoint from which the utility extract the graphdb schema. Format: `host:port`

## Output options
`--output-folder-path <value>, -o <value>`
<br>
Changes the default output folder *./output*

`--output-schema-file <value>, -os <value>`
<br>
The file name output for the GraphQL schema. If not specified the default is *output.schema.graphql*, or if a pipeline name is set with `--create-update-aws-pipeline-name` the file name is going to be *pipeline-name.schema.graphql*. 

`--output-source-schema-file <value>, -oss <value>`
<br>
The file name output for the GraphQL schema with directives. If not specified the default is *output.source.schema.graphql*, or if a pipeline name is set with `--create-update-aws-pipeline-name` the file name is going to be *pipeline-name.source.schema.graphql*

`--output-schema-no-mutations, -onm`
<br>
The inferred GraphQL schema will not have mutations, just queries.

`--output-neptune-schema-file <value>, -og <value>`
<br>
The file name output for discovered Neptune graphdb schema. If not specified the default is *output.graphdb.json*, or if a pipeline name is set with `--create-update-aws-pipeline-name` the file name is going to be *pipeline-name.graphdb.json*. 

`--output-js-resolver-file <value>, -or <value>`
<br>
The file name output for a copy of the resolver code. If not specified the default is *output.resolver.graphql.js*, or if a pipeline name is set with `--create-update-aws-pipeline-name` the file name is going to be *pipeline-name.resolver.graphql.js*. This file is also zipped in the code package uploaded to the Lambda function that run the resolver.

`--output-resolver-query-sdk, -ors`
`--output-resolver-query-https, -orh`
<br>
The default method for the Lambda uses to query Neptune is the Neptune-data SDK option `--output-resolver-query-sdk`. The SDK is available inly from Neptune version 1.2.1.0.R5. When the utility detect an older Neptune version, it stops suggesting to use the HTTPS Lambda option `--output-resolver-query-https`. If you prefer the HTTPS query method just use `--output-resolver-query-https`.

`--output-lambda-resolver-zip-file <value>, -olf <value>` 
<br>
The file name for the Lambda zip package, the default is *output.lambda.zip*

`--output-no-lambda-zip, -onl`
<br>
Does not create the Lambda zip file.


## Create AWS resources
`--create-update-aws-pipeline, -p`
<br>
This trigger the creation of the AWS resources for the GraphQL API, including the AppSync GraphQL API and the Lambda that run the resolver.

`--create-update-aws-pipeline-name <value>, -pn <value>`
<br>
This set the name for the pipeline like pipeline-nameAPI for the AppSync API or pipeline-nameFunction for the Lambda function. If not specifies and `--create-update-aws-pipeline` will use the Neptune database name.

`--create-update-aws-pipeline-region <value>, -pr <value>`
<br>
This set the AWS region in which the pipeline for the GraphQL API is created. If not specified will default to us-east-1, or use the Neptune database region from extracted from the database endpoint.

`--create-update-aws-pipeline-neptune-endpoint <value>, -pe <value>`
<br>
This set the Neptune database endpoint used by the Lambda function to query the Neptune database. If not set it used the endpoint set with `--input-graphdb-schema-neptune-endpoint`.

`--create-update-aws-pipeline-neptune-IAM, -pi`
<br>
Enable IAM authentication in the Lambda function that queries Neptune, the default is using the Neptune VPC.

`--remove-aws-pipeline-name <value>, -rp`
<br>
It removes the pipeline created with `--create-update-aws-pipeline`. The resources to remove are from a file called *pipeline-name.resources.json*.

## Create CDK files
`--output-aws-pipeline-cdk, -c`
<br>
This trigger the creation of a CDK file to be use to create the AWS resources for the GraphQL API, including the AppSync GraphQL API and the Lambda that run the resolver.

`--output-aws-pipeline-cdk-neptune-endpoint <value>, -ce <value>`
<br>
This set the Neptune database endpoint used by the Lambda function to query the Neptune database. If not set it used the endpoint set with `--input-graphdb-schema-neptune-endpoint`.

`--output-aws-pipeline-cdk-name <value>, -cn <value>`
<br>
This set the name for the pipeline like pipeline-nameAPI for the AppSync API or pipeline-nameFunction for the Lambda function. If not specifies and `--create-update-aws-pipeline` will use the Neptune database name.

`--output-aws-pipeline-cdk-region <value>, -cr <value>`
<br>
This set the AWS region in which the pipeline for the GraphQL API is created. If not specified will default to us-east-1, or use the Neptune database region from extracted from the database endpoint.

`--output-aws-pipeline-cdk-file <value>, -cf <name>`
<br>
This set the CDK file name. If not set the default is *pipeline-name-cdk.js*.

`--output-aws-pipeline-cdk-neptune-IAM, -ci`
<br>
Enable IAM authentication in the Lambda function that queries Neptune, the default is using the Neptune VPC.

## Create Apollo Server files

`--create-update-apollo-server, -asvr` 
<br>
Triggers the creation of a zip file of artifacts for Apollo Server instead of App Sync

`--create-update-apollo-server-subgraph, -asub`
<br>
Triggers the creation of a zip file of artifacts for Apollo Server subgraph instead of App Sync

