# Deploy the GraphQL API resources with CDK 
If your organization require using CDK to deploy AWS resources, here an end to end example.
<br>
Note: likely your organization has a CDK application that deploy other AWS resources. The team that maintain the CDK application can integrate the GraphQL API deployment using two files from the GraphQL utility output; the *output/your-new-GraphQL-API-name-cdk.js* and the *output/your-new-GraphQL-API-name.zip*.


## Create the CDK assets
Example starting from an Amazon Neptune database endpoint. In this case the utility uses the Neptune endpoint to discover the region and database name.

`neptune-for-graphql --input-graphdb-schema-neptune-endpoint `<*your-neptune-database-endpoint:port*>` --output-aws-pipeline-cdk --output-aws-pipeline-cdk-name` <*your-new-GraphQL-API-name*> `--output-resolver-query-https`

Example starting from a GraphQL schema.

`neptune-for-graphql --input-schema-file `<*your-graphql-schema-file*>` --output-aws-pipeline-cdk --output-aws-pipeline-cdk-name` <*your-new-GraphQL-API-name*>` --output-aws-pipeline-cdk-neptune-endpoint` <*your-neptune-database-endpoint:port*>` --output-resolver-query-https` 



## An example on how to test the CDK utility output

### Install the CDK
`npm install -g aws-cdk`
<br>
`cdk --version`

### Create a CDK application
Create a directory *your-CDK-dir* for your CDK application, CD in the new directory and initialize the CDK application.

`md` *your-CDK-dir*
<br>
`cd ` *your-CDK-dir*
<br>
`cdk init app --language javascript`

Install CDK libraries used by the GraphQL utility.

`npm install @aws-cdk/aws-iam`
<br>
`npm install @aws-cdk/aws-ec2`
<br>
`npm install @aws-cdk/aws-appsync`

### Integrate the GraphQL utility CDK output to the CDK application
Copy from the utility CDK output files from the *output* directory in the CDK application.

`cp  output/`*your-new-GraphQL-API-name*`-cdk.js /lib`
<br>
`cp  output/`*your-new-GraphQL-API-name*`.zip .`

Update the CDK test project, editing the file `bin/`*your-CDK-dir*`.js`
<br>
The file looks like this:
```js
#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { CdkStack } = require('../lib/cdk-stack');

const app = new cdk.App();
new CdkStack(app, 'CdkStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
```

Update the require and integrated the CDK class the utility created. Like this:
```js
#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { AppSyncNeptuneStack } = require('../lib/your-new-GraphQL-API-name-cdk');

const app = new cdk.App();
new AppSyncNeptuneStack(app, 'your-CdkStack-name', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
```


### Run the CDK application

To create CloudFormantion template:

`cdk synth`

To deploy the CloudFormation template:

`cdk deploy`

To rollback your deployment:

`cdk destroy`