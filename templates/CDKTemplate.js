/*
Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at
    http://www.apache.org/licenses/LICENSE-2.0
or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
*/

const { Stack, Duration, App } = require('aws-cdk-lib');
const lambda  = require( 'aws-cdk-lib/aws-lambda');
const iam  = require( 'aws-cdk-lib/aws-iam');
const ec2  = require( 'aws-cdk-lib/aws-ec2');
const { parseNeptuneDomain } = require('../src/util.js');
const { CfnGraphQLApi, CfnApiKey, CfnGraphQLSchema, CfnDataSource, CfnResolver, CfnFunctionConfiguration }  = require( 'aws-cdk-lib/aws-appsync');

const NAME = '';
const REGION = '';

const NEPTUNE_HOST = '';
const NEPTUNE_PORT = '';
const NEPTUNE_DB_NAME = '';
const NEPTUNE_DBSubnetGroup = null;
const NEPTUNE_IAM_AUTH = false;
const NEPTUNE_IAM_POLICY_RESOURCE = '*';
const LAMBDA_FUNCTION_NAME = '';
const LAMBDA_ZIP_FILE = '';
let LAMBDA_ARN = '';

const APPSYNC_SCHEMA = '';

const APPSYNC_ATTACH_QUERY = [];

const APPSYNC_ATTACH_MUTATION = [];

class AppSyncNeptuneStack extends Stack {
   /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
    constructor(scope, id, props) {
        super(scope, id, props);  
        
        // Lambda function IAM/VPC
        let echoLambda = null;

        // Lambda: IAM Role
        const lambda_role = new iam.Role(this, NAME + 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com') 
        });

        lambda_role.addManagedPolicy( iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

       let env = {
           NEPTUNE_HOST: NEPTUNE_HOST,
           NEPTUNE_PORT: NEPTUNE_PORT,
           NEPTUNE_IAM_AUTH_ENABLED: NEPTUNE_IAM_AUTH,
           LOGGING_ENABLED: 'false',
           NEPTUNE_DB_NAME: NEPTUNE_DB_NAME,
           NEPTUNE_REGION: REGION,
           NEPTUNE_DOMAIN: parseNeptuneDomain(NEPTUNE_HOST),
       };
       if (NEPTUNE_IAM_AUTH) {
            // is IAM auth
            echoLambda = new lambda.Function(this, LAMBDA_FUNCTION_NAME, {
                functionName: LAMBDA_FUNCTION_NAME,
                description: 'Neptune GraphQL Resolver for AppSync',
                code: lambda.Code.fromAsset(LAMBDA_ZIP_FILE), 
                handler: 'index.handler',
                runtime: lambda.Runtime.NODEJS_18_X,
                timeout: Duration.seconds(15), 
                memorySize: 128, 
                environment: env,
                initialPolicy: [new iam.PolicyStatement({
                    sid: NAME + "NeptuneQueryPolicy",
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "neptune-db:connect",
                        "neptune-db:DeleteDataViaQuery",                        
                        "neptune-db:ReadDataViaQuery",
                        "neptune-db:WriteDataViaQuery"
                    ],
                    resources: [NEPTUNE_IAM_POLICY_RESOURCE]
                })],
                roleArn: lambda_role.roleArn
            });
                        
        } else {
            // is VPC auth
            const neptune_vpc = ec2.Vpc.fromLookup(this, 'Neptune_VPC', {
                vpcId: NEPTUNE_DBSubnetGroup
            });
            
            lambda_role.addManagedPolicy( iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));
        
            echoLambda = new lambda.Function(this, LAMBDA_FUNCTION_NAME, {
                functionName: LAMBDA_FUNCTION_NAME,
                description: 'Neptune GraphQL Resolver for AppSync',
                code: lambda.Code.fromAsset(LAMBDA_ZIP_FILE), 
                handler: 'index.handler',
                runtime: lambda.Runtime.NODEJS_18_X,
                timeout: Duration.seconds(15), 
                memorySize: 128, 
                environment: env,
                vpc: neptune_vpc,
                allowPublicSubnet: 'true',
                roleArn: lambda_role.roleArn
            });            
        }
        
        echoLambda.node.addDependency(lambda_role);
        LAMBDA_ARN = echoLambda.functionArn;        

        // Appsync: GraphQL API
        const itemsGraphQLApi = new CfnGraphQLApi(this, NAME + 'API', {
            name: NAME + 'API',
            authenticationType: 'API_KEY'
        });
      
        // AppSync: Key
        new CfnApiKey(this, NAME + '-' + 'APIKEY', {
            apiId: itemsGraphQLApi.attrApiId
        });
      
        // AppSync: Schema
        const apiSchema = new CfnGraphQLSchema(this, NAME + 'Schema', {
            apiId: itemsGraphQLApi.attrApiId,
            definition: APPSYNC_SCHEMA
        });

        // AppSync: IAM Lambda invocation role
        const lambdaInvokationRole = new iam.Role(this, NAME + 'LambdaInvocationRole', {
            assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com')
        });
              
        lambdaInvokationRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,                
                actions: ["lambda:invokeFunction"],            
                resources: [
                    LAMBDA_ARN,
                    LAMBDA_ARN + ":*"
                ]       
            })
        );
                
        // AppSync: DataSource
        const dataSource = new CfnDataSource(this, NAME + 'DataSource', {
            apiId: itemsGraphQLApi.attrApiId,
            name: NAME + 'DataSource',
            type: 'AWS_LAMBDA',
            lambdaConfig: {
                lambdaFunctionArn: LAMBDA_ARN,
            },
            serviceRoleArn: lambdaInvokationRole.roleArn
        });

        dataSource.node.addDependency(itemsGraphQLApi);
        dataSource.node.addDependency(lambdaInvokationRole);
        dataSource.node.addDependency(echoLambda);

               
        // AppSync: Function        
        const functionappSync = new CfnFunctionConfiguration(this, NAME + 'Function', {
            apiId: itemsGraphQLApi.attrApiId,
            dataSourceName: NAME + 'DataSource',
            name: NAME + 'Function',
            runtime: {
                name: "APPSYNC_JS",
                runtimeVersion: "1.0.0",
            },
            code:
`import { util } from '@aws-appsync/utils';
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
}`
        });        

        functionappSync.node.addDependency(dataSource);
        
        // AppSync: attach resolvers to queries
        APPSYNC_ATTACH_QUERY.forEach(n => {
            const resolver = new CfnResolver(this, n + "Resolver", {
                apiId: itemsGraphQLApi.attrApiId,
                typeName: 'Query',
                fieldName: n,     
                kind: "PIPELINE",
                pipelineConfig: { 
                    functions: [ 
                        functionappSync.attrFunctionId
                    ]},        
                runtime: { 
                    name: "APPSYNC_JS",
                    runtimeVersion: "1.0.0", 
                },
                code:
`import {util} from '@aws-appsync/utils';

export function request(ctx) {
    return {};
}

export function response(ctx) {
    return ctx.prev.result;
}`
            });

            resolver.node.addDependency(functionappSync);
            resolver.node.addDependency(apiSchema);
        });

        // AppSync: attach resolvers to mutations
        APPSYNC_ATTACH_MUTATION.forEach(n => {
            const resolver = new CfnResolver(this, n + "Resolver", {
                apiId: itemsGraphQLApi.attrApiId, 
                typeName: 'Mutation', 
                fieldName: n,      
                kind: "PIPELINE",
                pipelineConfig: { 
                    functions: [ 
                        functionappSync.attrFunctionId
                    ]},        
                runtime: {
                    name: "APPSYNC_JS",
                    runtimeVersion: "1.0.0", 
                },
                code:
`import {util} from '@aws-appsync/utils';

export function request(ctx) {
    return {};
}

export function response(ctx) {
    return ctx.prev.result;
}`
            });

            resolver.node.addDependency(functionappSync);
            resolver.node.addDependency(apiSchema);
        });


    }
}


module.exports = { AppSyncNeptuneStack }