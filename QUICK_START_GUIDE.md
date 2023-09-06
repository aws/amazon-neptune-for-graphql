# Quick Start Guide

This quick start guide provides the instructions to run the Neptune GraphQL Utility to create an AWS AppSync GraphQL API starting from an Amazon Neptune database with graph data.

## Steps to install the Neptune GraphQL Utility prerequisites

1. EC2 Instance: create an EC2 instance in the same VPC as your Neptune database.
2. AWS CLI: install the AWS CLI.
3. Configure AWS CLI: the user needs permissions to create IAM roles, IAM policies, AWS Lambda and AWS AppSync API 
3. Node.js: install Node.js

## Run the utility

The utility can create, update or remove the end to end AWS resources from AppSync to Neptune. This includes IAM roles to execute AWS Lambda function that queries Neptune, the Lambda function, the IAM roles to enable AppSync to call the Lambda function, and the AppSync GraphQL API which includes the data source, function, schema and key to run it.

### Create the AWS resources

Run the utility using the command below replacing *your-database-enpoint:port* with you Neptune database endpoint and port, and replace *your-pipeline-name* with a name of your choice the utility will then use to name the AppSync API, the Lambda and IAM roles and policies.

The aws region where the resources are created is inferred from your database endpoint. In case you have changed the original Neptune database endpoint removing the region, add to the command below the option `--create-update-aws-pipeline-region your-aws-region` replacing *your-aws-region* with your region, like *us-west-1*.

If you are interested in seeing all the utility options, run it with the help option: ```node NeptuneGraphQLUtility.js --help```

Here the command to create the AppSync GraphQL API from a Neptune dabase with data:

```node NeptuneGraphQLUtility.js --input-graphdb-schema-neptune-endpoint your-database-enpoint:port --create-update-aws-pipeline --create-update-aws-pipeline-name your-pipeline-name```

### Test your AppSync GraphQL API

From the AWS console, go to the AppSync console. You will find a new API named *your-pipeline-name*API.
Select your new GraphQL API, and then select Query from the AppSync menu. From there you can query the Neptune database. The utility created a GraphQL schema with types, queries, and mutations.


### Remove the AWS resources

To remove all the recources the utility created run:

```node NeptuneGraphQLUtility.js --remove-aws-pipeline-name your-pipeline-name```

