# Detailed AWS Resources

Steps:

1. Run Neptune Graph Utility
2. Create IAM roles
3. Create the Lambda
4. Load in the Lambda the GraphQL resolver code
5. Create the AppSync API
6. Create the AppSync data source for the Lambda
7. Create the AppSync function for the Lambda with selectionSetGraphQL payload
8. Create the AppSync GraphQL Schema using the Neptune Graph Utility output
9. Attach to each GraphQL Schema operation the resolver function
10. Test using the AppSync Queries

The resources configuration change to access a Neptune Database in a VPC or with
IAM enabled. The following instruction are marked (VPC) or (IAM) to
differentiate it.

## 1 . Run Neptune Graph Utility

Run the Neptune GraphQL Utility to generate the resolver code for the Lambda,
and the GraphQL schema for AppSync.

Starting from an existing Neptune database. Run the command below passing your
Neptune cluster endpoint and port. You can run the utility from a personal
computer where you setup an SSH tunnel to an EC2 instance in the same VPC of
your Neptune DB (VPC), or run the utility from an EC2 instance in the same
Neptune VPC (if VPC), or with a Neptune IAM role (if IAM).

```
neptune-for-graphql --input-graphdb-schema-neptune-endpoint <your-database-endpoint:port>
````

The default output location for the GraphQL schema file to use in AppSync schema
is: ./output/output.schema.graphql
<br>
The default output location of Lambda resolver file is:
./output/output.resolver.graphql.js
<br>
The default output location of the Lambda zip: is: ./output/output.lambda.zip

## 3. Create the Lambda

Create the AWS Lambda that will receive the AppSync query requests, resolve it
into a Neptune graph query, query the Neptune database and return the result to
AppSync. To create the Lambda you have two options:

### Create Lambda IAM execution role

1. Create the Lambda execution role for the Lambda
    1. Create a new IAM Role for the Lambda function
    2. Attach the policy `AWSLambdaBasicExecutionRole`
    3. (if VPC) Attach the policy `AWSLambdaVPCAccessExecutionRole`
    3. (if IAM) Attach the a new policy `NeptuneQueryPolicy`:
    ```
    "Effect": "Allow",
    "Action": [
        "neptune-db:connect",
        "neptune-db:DeleteDataViaQuery",                        
        "neptune-db:ReadDataViaQuery",
        "neptune-db:WriteDataViaQuery"
    ],
    "Resource": "arn:aws:neptune-db:region:account-id:cluster-resource-id/*"
    ```


1. go to the Neptune documentation
   here https://docs.aws.amazon.com/neptune/latest/userguide/get-started-cfn-lambda.html,
   can run the CloudFormation template that creates the Lambda. Lambda runtime
   is Node.js 18x.
   (NOTE: the Neptune CloudFormation to create the Lambda is outdated, the
   nodejs12.x is no longer supported by Lambda)
2. go to Lambda console
    1. Create a new function, author from scratch
    2. Name the function ( you will point AppSync to this fucntion)
    3. Runtime: Node.js 18.x
    4. Open Advance settings, enable VPC, and select your Neptune DB VPC,
       Subnets and Security Group.
    5. Create the function
    6. Open the Lambda Environment Variables and add:
        1. NEPTUNE_HOST= your database endpoint
        2. NEPTUNE_IAM_AUTH_ENABLED = true
        3. NEPTUNE_PORT = your database port typically 8182
        4. LOGGING_ENABLED = false

## 4. Load in the Lambda the GraphQL resolver code

1. Upload in the Lambda the zip file in the output folder
2. The Lambda is now ready

## 5. Create the AppSync API

1. Go to the AppSync Console
2. Create API
    1. Select “GraphQL API” and “Design from scratch”
    2. Next
    3. Name the API
    4. Next and Create API

## 6. Create the AppSync data source for the Lambda

1. Select “Data Sources” from the AppSync menu of your new API
    1. Create data source
    2. Name the data source
    3. Select “AWS Lambda function” as “Data source type”
    4. Select the region, same as Neptune Database and the Lambda
    5. Select the ARN of the Lambda you created
    6. Create

## 7. Create the AppSync function for the Lambda with selectionSetGraphQL payload

Select “Functions” from the AppSync menu of your new API

1. Create function
2. for “Data Source name” select the one you just created.
3. Name the function
4. replace the “Function code” with the following, then Create

```js
import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const {source, args} = ctx
    return {
        operation: 'Invoke',
        payload: {
            field: ctx.info.fieldName,
            arguments: args,
            selectionSetGraphQL: ctx.info.selectionSetGraphQL,
            source
        },
    };
}

export function response(ctx) {
    return ctx.result;
}
```

## 8. Create the AppSync GraphQL Schema using the Neptune Graph Utility output

Select “Schema” from the AppSync menu of your new API

1. Replace the AppSync Schema with the content of the Neptune GraphQL Utility
   output in the file with default named ./output/output.schema.graphql.
2. Save Schema

## 9. Attach to each GraphQL Schema operation the resolver function

1. Scroll through the “Resolvers” list to Query
    1. for each field in the Query section select “Attach”
    2. In the “Create pipeline resolver”
        1. “Add function“ selecting the AppSync function you just created
        2. Select “Create”
2. Go back to the AppSync Schema, and repeat the step above for each field in
   the Resolvers Query and Mutation section. Note: you might have to repeat it
   10-30 times :(
3. Congratulation you have now a GraphQL API for your Neptune database

## 10. Test using the AppSync Queries

To test it, select “Query” in the AppSync menu of your new API.

1. from the “Explorer” select a query, the parameters and then “Run”

