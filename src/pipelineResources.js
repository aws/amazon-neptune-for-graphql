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

import { NeptuneClient, 
    DescribeDBClustersCommand, 
    DescribeDBSubnetGroupsCommand  }  from "@aws-sdk/client-neptune";

import { IAMClient, 
    CreateRoleCommand, 
    AttachRolePolicyCommand, 
    GetRoleCommand, 
    CreatePolicyCommand, 
    DetachRolePolicyCommand,
    DeleteRoleCommand,
    DeletePolicyCommand,
    //waitUntilRoleExists, 
    //waitUntilPolicyExists
    }  from "@aws-sdk/client-iam";

import { LambdaClient, 
    CreateFunctionCommand as LambdaCreateFunctionCommand, 
    GetFunctionCommand, 
    DeleteFunctionCommand,
    UpdateFunctionCodeCommand }  from "@aws-sdk/client-lambda";

import { AppSyncClient, 
    CreateGraphqlApiCommand, 
    StartSchemaCreationCommand, 
    CreateDataSourceCommand, 
    CreateFunctionCommand as AppSyncCreateFunctionCommand, 
    CreateResolverCommand,
    CreateApiKeyCommand,
    ListGraphqlApisCommand,
    DeleteGraphqlApiCommand,    
    ListResolversCommand } from "@aws-sdk/client-appsync";

import fs from 'fs';
import archiver from 'archiver';
import ora from 'ora';
import { exit } from "process";
import { loggerError, loggerInfo } from "./logger.js";

// Input
let NEPTUNE_DB_NAME = '';
let NAME = '';
let REGION = '';
let APPSYNC_SCHEMA = '';
let SCHEMA_MODEL = null;
let LAMBDA_FILES_PATH = '';
let ADD_MUTATIONS = true;
let quiet = false;
let thisOutputFolderPath = './output';

// Computed
let pipelineExists = false;
let NEPTUNE_HOST = null;
let NEPTUNE_PORT = null;
let NEPTUNE_DBSubnetGroup = null;
let NEPTUNE_DBSubnetIds = [];
let NEPTUNE_VpcSecurityGroupId = null;
let NEPTUME_IAM_AUTH = false;
let NEPTUNE_CURRENT_VERSION = '';
let NEPTUNE_CURRENT_IAM = false;
let NEPTUNE_IAM_POLICY_RESOURCE = '*';
let LAMBDA_ROLE = '';
let LAMBDA_ARN = '';
let NEPTUNE_TYPE = 'neptune-db';
let ZIP = null;
let RESOURCES = {};
let RESOURCES_FILE = '';
let msg = '';

const sleep = ms => new Promise(r => setTimeout(r, ms)); // alternative: import { setTimeout } from timers/promises
let spinner = null;

function yellow(text) {
    return '\x1b[33m' + text + '\x1b[0m';
}


async function checkPipeline() {
    // Checking if Role, Lambda and AppSync API is already created.
    const iamClient = new IAMClient({region: REGION});
    const lambdaClient = new LambdaClient({region: REGION});
    const appSyncClient = new AppSyncClient({region: REGION});

    let lambdaExists = false;
    let appSyncExists = false;
    let roleExists = false;

    msg = 'Checking pipeline resources...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    try {
        const command = new GetFunctionCommand({FunctionName: NAME +'LambdaFunction'});        
        await lambdaClient.send(command);
        lambdaExists = true;
    } catch (error) {        
        loggerInfo("checkPipeline GetFunctionCommand: " + JSON.stringify(error));
        lambdaExists = false;
    }
    
    try {        
        const command = new ListGraphqlApisCommand({apiType: "GRAPHQL"});
        const response = await appSyncClient.send(command);
        response.graphqlApis.forEach(element => {
            if (element.name == NAME + 'API') {
                //APPSYNC_API_ID = element.apiId;                
                appSyncExists = true;
            }
        });
    } catch (error) {
        loggerInfo("checkPipeline ListGraphqlApisCommand : " + JSON.stringify(error));
        appSyncExists = false;
    }

    try {
        const command = new GetRoleCommand({ RoleName: NAME + "LambdaExecutionRole" });
        const response = await iamClient.send(command);
        LAMBDA_ROLE = response.Role.Arn;
        roleExists = true;
    } catch (error) {
        loggerInfo("checkPipeline GetRoleCommand: " + JSON.stringify(error));
        roleExists = false;
    }
    
    if (lambdaExists && appSyncExists && roleExists) {
        msg = 'Pipeline exists.';
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
        pipelineExists = true;
    } else {
        msg = 'Pipeline does not exists.';
        if (!quiet) spinner.warn(msg);
        loggerInfo(msg);
    }

    if (lambdaExists && appSyncExists && roleExists) return;
    if (!lambdaExists && !appSyncExists && !roleExists) return;
    
    loggerError('One or more pipeline resources are missing.');

    if (!lambdaExists) {
        msg = '  Lambda ' + yellow(NAME) + 'LambdaFunction' + ' is  missing.';
        loggerError(msg);
    }

    if (!roleExists) {
        msg = '  Role ' + yellow(NAME) + 'LambdaExecutionRole' + ' is  missing.';
        loggerError(msg);
    }

    if (!appSyncExists) {
        msg = '  AppSync ' + yellow(NAME) + 'API' + ' is  missing.';
        loggerError(msg);
    }

    loggerError('Fix the issue manually or create the pipeline resources with a new name.');
    process.exit(1);
}


function storeResource(resource) {
    Object.assign(RESOURCES, resource);  
    fs.writeFileSync(RESOURCES_FILE, JSON.stringify(RESOURCES, null, 2));
}


async function getNeptuneClusterinfoBy(name, region) {
    NEPTUNE_DB_NAME = name;
    REGION = region;

    await getNeptuneClusterinfo();

    return {
        host: NEPTUNE_HOST, 
        port: NEPTUNE_PORT,
        isIAMauth : NEPTUNE_CURRENT_IAM,
        version : NEPTUNE_CURRENT_VERSION,
        dbSubnetGroup: NEPTUNE_DBSubnetGroup, 
        dbSubnetIds: NEPTUNE_DBSubnetIds, 
        vpcSecurityGroupId: NEPTUNE_VpcSecurityGroupId,
        iamPolicyResource: NEPTUNE_IAM_POLICY_RESOURCE };
}


async function getNeptuneClusterinfo() {
    if (NEPTUNE_TYPE == 'neptune-db') {
        const neptuneClient = new NeptuneClient({region: REGION});

        const params = {
            DBClusterIdentifier: NEPTUNE_DB_NAME
        };

        const data = await neptuneClient.send(new DescribeDBClustersCommand(params));
        
        const input = { // DescribeDBSubnetGroupsMessage
            DBSubnetGroupName: data.DBClusters[0].DBSubnetGroup,        
        };
        const command = new DescribeDBSubnetGroupsCommand(input);
        const response = await neptuneClient.send(command);
            
        NEPTUNE_HOST = data.DBClusters[0].Endpoint;
        NEPTUNE_PORT = data.DBClusters[0].Port.toString();
        NEPTUNE_DBSubnetGroup = data.DBClusters[0].DBSubnetGroup;
        NEPTUNE_VpcSecurityGroupId = data.DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId;
        NEPTUNE_CURRENT_IAM = data.DBClusters[0].IAMDatabaseAuthenticationEnabled;
        NEPTUNE_CURRENT_VERSION = data.DBClusters[0].EngineVersion;
        NEPTUNE_IAM_POLICY_RESOURCE = `${data.DBClusters[0].DBClusterArn.substring(0, data.DBClusters[0].DBClusterArn.lastIndexOf(':cluster')).replace('rds', 'neptune-db')}:${data.DBClusters[0].DbClusterResourceId}/*`;    
        response.DBSubnetGroups[0].Subnets.forEach(element => { 
            NEPTUNE_DBSubnetIds.push(element.SubnetIdentifier);
        });
    } else {
        loggerInfo('AWS SDK for Neptune Analytics is not available, yet.');
        throw new Error(msg);            
    }    
}


async function createLambdaRole() {
    const iamClient = new IAMClient({region: REGION});
    
    // Create Lambda principal role
    msg = 'Creating Lambda principal role ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    let roleName = NAME +"LambdaExecutionRole";
    const params = {
        AssumeRolePolicyDocument: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { Service: ["lambda.amazonaws.com"] },
              Action: ["sts:AssumeRole"],
            },
          ],
        }),
        RoleName: roleName
    };
    const data = await iamClient.send(new CreateRoleCommand(params));
    //await waitUntilRoleExists({ client: iamClient, maxWaitTime: 180 }, { RoleName: data.Role.RoleName }); // does not work :(, using sleep
    await sleep(10000);
    LAMBDA_ROLE = data.Role.Arn;
    storeResource({LambdaExecutionRole: roleName});
    msg = 'Role Created: ' + yellow(roleName);
    if (!quiet) spinner.succeed(msg);
    loggerInfo(msg);

    // Attach to Lambda role the AWSLambdaBasicExecutionRole 
    msg = 'Attaching AWSLambdaBasicExecutionRole to Lambda Role';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    let input = {
        RoleName: roleName,
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    };
    let command = new AttachRolePolicyCommand(input);
    await iamClient.send(command);    
    storeResource({LambdaExecutionPolicy1: input.PolicyArn});
    msg = `Attached ${yellow('AWSLambdaBasicExecutionRole')} to Lambda Role`;
    if (!quiet) spinner.succeed(msg);
    loggerInfo(msg);


    if (NEPTUME_IAM_AUTH) {

        let action = [];
        if (NEPTUNE_TYPE == 'neptune-db') {
            action = [
                "neptune-db:DeleteDataViaQuery",
                "neptune-db:connect",
                "neptune-db:ReadDataViaQuery",
                "neptune-db:WriteDataViaQuery"
            ];
        } else {
            action = "neptune-graph:*"
        }

        // Create Neptune query policy
        msg = 'Creating policy for Neptune queries';
        if (!quiet) spinner = ora(msg).start();
        loggerInfo(msg);
        let policyName = NAME+"NeptuneQueryPolicy";
        let command = new CreatePolicyCommand({
            PolicyDocument: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: action,
                    Resource: NEPTUNE_IAM_POLICY_RESOURCE            
                },
            ],
            }),
            PolicyName: policyName,
        });
    
        let response = await iamClient.send(command);
        const policyARN = response.Policy.Arn;
        storeResource({NeptuneQueryPolicy: policyARN});
        await sleep(5000);
        msg = 'Neptune query policy created: ' + yellow(policyName);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
        
        // Attach to Lambda role the Neptune query policy. 
        msg = 'Attaching Neptune query policy to Lambda role ...';
        if (!quiet) spinner = ora(msg).start();
        loggerInfo(msg);
        input = {
            RoleName: roleName,
            PolicyArn: policyARN,
        };
        command = new AttachRolePolicyCommand(input);
        await iamClient.send(command);    
        storeResource({LambdaExecutionPolicy2: input.PolicyArn});    
        await sleep(10000);
        msg = `Attached ${yellow('Neptune Query Policy')} policies to Lambda Role`;
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
        
    } else {
        
        msg = 'Attaching policy for Neptune VPC to Lambda role ...';
        if (!quiet) spinner = ora(msg).start();
        loggerInfo(msg);
        input = {
            RoleName: roleName,
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
        };
        command = new AttachRolePolicyCommand(input);
        await iamClient.send(command);    
        storeResource({LambdaExecutionPolicy2: input.PolicyArn});    
        await sleep(10000);
        msg = `Attached ${yellow('AWSLambdaVPCAccessExecutionRole')} policies to role`;
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    }

}


async function createDeploymentPackage(folderPath) {       
    const zipFilePath = `${thisOutputFolderPath}/${NAME}.zip`;
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.file(`${thisOutputFolderPath}/output.resolver.graphql.js`, { name: 'output.resolver.graphql.js' })
    await archive.finalize();
    await sleep(2000);
    const fileContent = await fs.readFileSync(zipFilePath);
    return fileContent;    
}


async function createLambdaFunction() {
    const lambdaClient = new LambdaClient({region: REGION});
    
    msg = 'Creating Lambda function ...';
    if (!quiet) spinner = ora(msg).start();
    
    let params;
    let lambdaName = NAME +'LambdaFunction';
    if (NEPTUME_IAM_AUTH) {
        params = {
            Code: {          
                ZipFile: ZIP
            },
            FunctionName: lambdaName,
            Handler: 'index.handler',
            Role: LAMBDA_ROLE,        
            Runtime: 'nodejs18.x',
            Description: 'Neptune GraphQL Resolver for AppSync',
            Timeout: 15,
            MemorySize: 128,            
            Environment: {
                Variables: {
                    "NEPTUNE_HOST": NEPTUNE_HOST,
                    "NEPTUNE_PORT": NEPTUNE_PORT,
                    "NEPTUNE_IAM_AUTH_ENABLED": "true",
                    "LOGGING_ENABLED": "false",
                    "NEPTUNE_TYPE": NEPTUNE_TYPE
                },
            },
        };
    } else {
        params = {
            Code: {          
                ZipFile: ZIP
            },
            FunctionName: lambdaName,
            Handler: 'index.handler',
            Role: LAMBDA_ROLE,        
            Runtime: 'nodejs18.x',
            Description: 'Neptune GraphQL Resolver for AppSync',
            Timeout: 15,
            MemorySize: 128,
            VpcConfig: {
                SubnetIds: NEPTUNE_DBSubnetIds,
                SecurityGroupIds: [NEPTUNE_VpcSecurityGroupId]
            },
            Environment: {
                Variables: {
                    "NEPTUNE_HOST": NEPTUNE_HOST,
                    "NEPTUNE_PORT": NEPTUNE_PORT,
                    "NEPTUNE_IAM_AUTH_ENABLED": "false",
                    "LOGGING_ENABLED": "false"
                },
            },
        };
    }

    const data = await lambdaClient.send(new LambdaCreateFunctionCommand(params));    
    //await sleep(5000);    
    LAMBDA_ARN = data.FunctionArn;
    storeResource({LambdaFunction: lambdaName});
    msg = 'Lambda created: ' + yellow(lambdaName);
    if (!quiet) spinner.succeed(msg);
    loggerInfo(msg);
}


async function createAppSyncAPI() {      
    const iamClient = new IAMClient({region: REGION});
    
    if (!quiet) spinner = ora('Creating policy for Lambda invocation ...').start();
    let policyName = NAME+"LambdaInvokePolicy";
    let command = new CreatePolicyCommand({
        PolicyDocument: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
                Effect: "Allow",
                Action: "lambda:invokeFunction",            
                Resource: [
                    LAMBDA_ARN,
                    LAMBDA_ARN + ":*"
                ]            
            },
          ],
        }),
        PolicyName: policyName,
      }
    );
    let response = await iamClient.send(command);
    const policyARN = response.Policy.Arn;
    storeResource({LambdaInvokePolicy: policyARN});
    if (!quiet) spinner.succeed('Lambda invocation policy created: ' + yellow(policyName));

    let roleName = NAME +"LambdaInvocationRole";
    let params = {
        AssumeRolePolicyDocument: JSON.stringify({
            Version: "2012-10-17",
            Statement: [                
                {
                    Effect: "Allow",
                    Principal: {
                        Service: "appsync.amazonaws.com"
                    },
                    Action: "sts:AssumeRole"
                }          
            ]
        }),
        RoleName: roleName
    };

    if (!quiet) spinner = ora('Creating role for Lambda invocation ...').start();
    response = await iamClient.send(new CreateRoleCommand(params));        
    const LAMBDA_INVOCATION_ROLE = response.Role.Arn;        
    storeResource({LambdaInvokeRole: roleName});
    sleep(5000);
    if (!quiet) spinner.succeed('Lambda invocation role created: ' + yellow(roleName));
    
    if (!quiet) spinner = ora('Attaching policy ...').start();
    params = {
        RoleName: roleName,
        PolicyArn: policyARN,
    };
    command = new AttachRolePolicyCommand(params);
    await iamClient.send(command);
    if (!quiet) spinner.succeed('Attached policy to role');

    // APPSync API
    const appSyncClient = new AppSyncClient({region: REGION});

    if (!quiet) spinner = ora('Creating AppSync API ...').start();
    params = {
        name: NAME + 'API',
        authenticationType: "API_KEY",      
        visibility: "GLOBAL",
        apiType: "GRAPHQL"        
    };
    command = new CreateGraphqlApiCommand(params);
    response = await appSyncClient.send(command);
    const apiId = response.graphqlApi.apiId;
    storeResource({AppSyncAPI: apiId});
    if (!quiet) spinner.succeed('Created API: ' + yellow(NAME + 'API'));


    // create Key
    if (!quiet) spinner = ora('Creating API key ...').start();
    command = new CreateApiKeyCommand({apiId: apiId});
    response = await appSyncClient.send(command);
    const apiKey = response.apiKey.id;
    if (!quiet) spinner.succeed('Created API key');


    // create datasource
    if (!quiet) spinner = ora('Creating DataSource ...').start();
    params = {
        apiId: apiId,
        name: NAME + 'DataSource',       
        type: "AWS_LAMBDA",
        serviceRoleArn: LAMBDA_INVOCATION_ROLE,
        lambdaConfig: {
            lambdaFunctionArn: LAMBDA_ARN, 
        },
    };    
    command = new CreateDataSourceCommand(params);
    response = await appSyncClient.send(command);
    if (!quiet) spinner.succeed('Created DataSource: ' + yellow(NAME+'DataSource'));


    // create function
    if (!quiet) spinner = ora('Creating Function ...').start();
    params = {
        apiId: apiId,
        name: NAME+'Function',       
        dataSourceName: NAME+'DataSource',
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

    };
    command = new AppSyncCreateFunctionCommand(params);
    response = await appSyncClient.send(command);
    await sleep(5000);
    let functionId = response.functionConfiguration.functionId;    
    storeResource({AppSyncAPIFunction: functionId});
    if (!quiet) spinner.succeed('Created Function: ' + yellow(NAME+'Function'));

    // Upload schema
    if (!quiet) spinner = ora('Uploading schema ...').start();
    let encoder = new TextEncoder();
    let definition = encoder.encode(APPSYNC_SCHEMA);
    params = { 
        apiId: apiId,
        definition: definition,
      };
    command = new StartSchemaCreationCommand(params);
    response = await appSyncClient.send(command);    
    await sleep(5000);
    if (!quiet) spinner.succeed('Added schema');
    
    await attachResolvers(appSyncClient, apiId, functionId);
}


async function getSchemaFields(typeName) {
    const r = [];
    SCHEMA_MODEL.definitions.forEach(function (def) {
        if (def.kind == "ObjectTypeDefinition") {
            if (def.name.value == typeName) {    
                def.fields.forEach(function (field) {
                    r.push(field.name.value);
                });
            }
        }   
    });
    return r;
}


async function attachResolvers(client, apiId, functionId) {   
        
    const queries = await getSchemaFields("Query");
    let mutations = [];
    
    if (ADD_MUTATIONS) 
        mutations = await getSchemaFields("Mutation");
    
    let response = null;

    // Queries
    let input = {
        apiId: apiId,
        typeName: "Query",
    };
    let command = new ListResolversCommand(input);
    response = await client.send(command);
    
    let existingQueries = [];
    if (response != null) {
        for (const resolver of response.resolvers) {
            existingQueries.push(resolver.fieldName);
        }
    } 

    for (const query of queries) {
        if (!existingQueries.includes(query)) {                
            await attachResolverToSchemaField(client, apiId, functionId, "Query", query);
        }
    }      
    
    // Mutations    
    if (ADD_MUTATIONS) {
        input = {
            apiId: apiId,
            typeName: "Mutation",
        };
        command = new ListResolversCommand(input);
        response = await client.send(command); 
        
        let existingMutations = [];
        if (response != null) {
            for (const resolver of response.resolvers) {
                existingMutations.push(resolver.fieldName);
            }
        }

        for (const mutation of mutations) {
            if (!existingMutations.includes(mutation)) {                        
                await attachResolverToSchemaField(client, apiId, functionId, "Mutation", mutation);                
            }
        }
    }

}


async function attachResolverToSchemaField (client, apiId, functionId, typeName, fieldName) {
    
    // attach resolvers to schema
    msg = 'Attaching resolver to schema type ' + yellow(typeName) + ' field ' + yellow(fieldName) + ' ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);

    const input = {
        apiId: apiId,
        typeName: typeName,
        fieldName: fieldName,    
        kind: "PIPELINE",
        pipelineConfig: {
          functions: [
            functionId
          ],
        },        
        runtime: {
          name: "APPSYNC_JS",
          runtimeVersion: "1.0.0",
        },
        code:
`
import {util} from '@aws-appsync/utils';

export function request(ctx) {
    return {};
}

export function response(ctx) {
    return ctx.prev.result;
}
`,
      };
      const command = new CreateResolverCommand(input);
      await client.send(command);
      await sleep(200);
      msg = 'Attached resolver to schema type ' + yellow(typeName) + ' field ' + yellow(fieldName);
      if (!quiet) spinner.succeed(msg);
      loggerInfo(msg);
}


async function removeAWSpipelineResources(resources, quietI) {
    quiet = quietI;
    const appSyncClient = new AppSyncClient({region: resources.region});
    const lambdaClient = new LambdaClient({region: resources.region});
    const iamClient = new IAMClient({region: resources.region});
    
    // Appsync API
    msg = 'Deleting AppSync API ...';
    if (!quiet) spinner = ora('Deleting AppSync API ...').start();
    loggerInfo(msg);

    try {
        const input = { 
            apiId:  resources.AppSyncAPI
        };
        const command = new DeleteGraphqlApiCommand(input);
        await appSyncClient.send(command);
        msg = 'Deleted API id: ' + yellow(resources.AppSyncAPI);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    } catch (error) {
        msg = 'AppSync API delete failed: ' + error.message; 
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }
    
    // Lambda
    msg = 'Deleting Lambda function ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    try {
        const input = {
            FunctionName: resources.LambdaFunction 
        };
        const command = new DeleteFunctionCommand(input);        
        await lambdaClient.send(command);
        msg = 'Deleted Lambda function: ' + yellow(resources.LambdaFunction);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    } catch (error) {
        msg = 'Lambda function fail to delete: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }    
    
    // Lambda execution role
    msg = 'Detaching IAM policies from role ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    try {
        let input = { 
            PolicyArn: resources.LambdaExecutionPolicy1,
            RoleName: resources.LambdaExecutionRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        msg = 'Detached policy: ' + yellow(resources.LambdaExecutionPolicy1) + " from role: " + yellow(resources.LambdaExecutionRole);        
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    } catch (error) {
        msg = 'Detach policy failed: ' + error.error;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }

    msg = 'Detaching IAM policies from role ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    try {
        let input = { 
            PolicyArn: resources.LambdaExecutionPolicy2,
            RoleName: resources.LambdaExecutionRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        msg = 'Detached policy: ' + yellow(resources.LambdaExecutionPolicy2) + " from role: " + yellow(resources.LambdaExecutionRole);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    } catch (error) {
        msg = 'Detach policy failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }
    
    // Delete Neptune query Policy
    if (resources.NeptuneQueryPolicy != undefined) {
        msg = 'Deleting policy ...';
        if (!quiet) spinner = ora(msg).start();
        loggerInfo(msg);
        try {
            const input = {
                PolicyArn: resources.NeptuneQueryPolicy,
            };
            const command = new DeletePolicyCommand(input);     
            await iamClient.send(command);            
            msg = 'Deleted policy: ' + yellow(resources.NeptuneQueryPolicy);
            if (!quiet) spinner.succeed(msg);
            loggerInfo(msg);
        } catch (error) {
            msg = 'Delete policy failed: ' + error.message;
            if (!quiet) spinner.fail(msg);
            loggerError(msg + " : " + JSON.stringify(error));
        }
    }

    // Delete Role
    msg = 'Deleting role ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    try {
        const input = {
            RoleName: resources.LambdaExecutionRole,
        };
        const command = new DeleteRoleCommand(input);        
        await iamClient.send(command);
        msg = 'Deleted role: ' + yellow(resources.LambdaExecutionRole);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    } catch (error) {
        msg = 'Delete role failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }
    
    // AppSync Lambda role
    msg = 'Detaching policy from AppSync Lambda role ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    try {
        let input = { 
            PolicyArn: resources.LambdaInvokePolicy,
            RoleName: resources.LambdaInvokeRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        msg = 'Detached policy: ' + yellow(resources.LambdaInvokePolicy) + " from role: " + yellow(resources.LambdaInvokeRole);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    } catch (error) {
        msg = 'Detach policy failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }

    // Delete Policy
    msg = 'Deleting policy ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    try {
        const input = {
            PolicyArn: resources.LambdaInvokePolicy,
        };
        const command = new DeletePolicyCommand(input);     
        await iamClient.send(command);
        msg = 'Deleted policy: ' + yellow(resources.LambdaInvokePolicy);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    } catch (error) {
        msg = 'Delete policy failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }
   
    // Delete Role
    msg = 'Deleting role ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    try {
        const input = {
            RoleName: resources.LambdaInvokeRole,
        };
        const command = new DeleteRoleCommand(input);        
        await iamClient.send(command);
        msg = 'Deleted role: ' + yellow(resources.LambdaInvokeRole);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);
    } catch (error) {
        msg = 'Delete role failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }    
}


async function updateLambdaFunction(resources) {
    msg = 'Updating Lambda function code ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    const lambdaClient = new LambdaClient({region: resources.region});
    const input = {
        FunctionName: resources.LambdaFunction,
        ZipFile: ZIP,
    };
    const command = new UpdateFunctionCodeCommand(input);
    await lambdaClient.send(command);
    msg = 'Lambda function code updated: ' + yellow(resources.LambdaFunction);
    if (!quiet) spinner.succeed(msg);
    loggerInfo(msg);
}


async function updateAppSyncAPI(resources) {    
    const appSyncClient = new AppSyncClient({region: resources.region});

    msg = 'Updating AppSync API schema ...';
    if (!quiet) spinner = ora(msg).start();
    loggerInfo(msg);
    let encoder = new TextEncoder();
    let definition = encoder.encode(APPSYNC_SCHEMA);

    let params = { 
        apiId: resources.AppSyncAPI,
        definition: definition,
      };
    let command = new StartSchemaCreationCommand(params);
    await appSyncClient.send(command);    
    await sleep(5000);
    msg = 'Schema updated';
    if (!quiet) spinner.succeed(msg);
    loggerInfo(msg);
  
    await attachResolvers(appSyncClient, resources.AppSyncAPI, resources.AppSyncAPIFunction);
}


async function createUpdateAWSpipeline (    pipelineName, 
                                            neptuneDBName, 
                                            neptuneDBregion, 
                                            appSyncSchema, 
                                            schemaModel, 
                                            lambdaFilesPath, 
                                            addMutations, 
                                            quietI, 
                                            __dirname, 
                                            isNeptuneIAMAuth, 
                                            neptuneHost, 
                                            neptunePort,
                                            outputFolderPath, 
                                            neptuneType) {    

    NAME = pipelineName;    
    REGION = neptuneDBregion;
    NEPTUNE_DB_NAME = neptuneDBName;
    APPSYNC_SCHEMA = appSyncSchema;
    SCHEMA_MODEL = schemaModel;
    LAMBDA_FILES_PATH = lambdaFilesPath;
    RESOURCES_FILE = `${outputFolderPath}/${NAME}-resources.json`;
    ADD_MUTATIONS = addMutations;
    quiet = quietI;
    NEPTUME_IAM_AUTH = isNeptuneIAMAuth;
    NEPTUNE_HOST = neptuneHost;
    NEPTUNE_PORT = neptunePort;
    thisOutputFolderPath = outputFolderPath;
    NEPTUNE_TYPE = neptuneType;

    msg = 'Creating or updating AWS pipeline resources ...';
    loggerInfo(msg);
    await checkPipeline();

    if (!pipelineExists) {
        try {
            storeResource({region: REGION});

            if (NEPTUNE_TYPE === 'neptune-db') {
                try {
                    loggerInfo('Get Neptune Cluster Info');
                    if (!quiet) spinner = ora('Getting ...').start();
                    await getNeptuneClusterinfo();
                    if (!quiet) spinner.succeed('Got Neptune Cluster Info');
                    if (isNeptuneIAMAuth) {
                        if (!NEPTUNE_CURRENT_IAM) {
                            loggerError('The Neptune database authentication is set to VPC.');
                            loggerError('Remove the --create-update-aws-pipeline-neptune-IAM option.');
                            exit(1);
                        }
                    } else {
                        if (NEPTUNE_CURRENT_IAM) {
                            loggerError('The Neptune database authentication is set to IAM.');
                            loggerError('Add the --create-update-aws-pipeline-neptune-IAM option.');
                            exit(1);
                        } else {
                            loggerInfo(`Subnet Group: ` + yellow(NEPTUNE_DBSubnetGroup));
                        }
                    }

                    if (NEPTUNE_CURRENT_VERSION != '') {
                        const v = NEPTUNE_CURRENT_VERSION;
                        if (lambdaFilesPath.includes('SDK') == true &&
                            (v == '1.2.1.0' || v == '1.2.0.2' || v == '1.2.0.1' || v == '1.2.0.0' || v == '1.1.1.0' || v == '1.1.0.0')) {
                            loggerError("Neptune SDK query is supported starting with Neptune versions 1.2.2.0");
                            loggerError("Switch to Neptune HTTPS query with option --output-resolver-query-https");
                            exit(1);
                        }
                    }

                } catch (error) {
                    msg = 'Error getting Neptune Cluster Info.';
                    if (!quiet) spinner.fail(msg);
                    loggerError(msg + " : " + JSON.stringify(error));
                    if (!isNeptuneIAMAuth) {
                        loggerError("VPC data is not available to proceed.");
                        exit(1);
                    } else {
                        loggerInfo("Could not read the database ARN to restrict the Lambda permissions. To increase security change the resource in the Neptune Query policy.");
                        loggerInfo("Proceeding without getting Neptune Cluster info.");
                    }
                }
            }
            
            loggerInfo('Create ZIP');
            msg = 'Creating ZIP ...';
            if (!quiet) spinner = ora(msg).start();
            loggerInfo(msg);
            ZIP = await createDeploymentPackage(LAMBDA_FILES_PATH)
            msg = 'Created ZIP File: ' + yellow(LAMBDA_FILES_PATH);
            if (!quiet) spinner.succeed(msg);
            loggerInfo(msg);

            loggerInfo('Create Lambda execution role');
            await createLambdaRole();            

            loggerInfo('Create Lambda function');
            await createLambdaFunction();            

            loggerInfo('Create AppSync API');
            await createAppSyncAPI();            

            loggerInfo('Saved resources to file: ' + yellow(RESOURCES_FILE));

        } catch (error) {
            msg = 'Error creating resources: ' + error.message;
            if (!quiet) spinner.fail(msg);
            loggerError(msg + " : " + JSON.stringify(error));
            loggerError('Rolling back resources.');
            await removeAWSpipelineResources(RESOURCES, quiet);
        }

    } else {
        loggerInfo('Update resources');
        let resources = null;
        try {
            msg = 'Loading resources file ...';            
            if (!quiet) spinner = ora(msg).start();
            loggerInfo(msg);
            resources = JSON.parse(fs.readFileSync(RESOURCES_FILE, 'utf8'));
            msg = 'Loaded resources from file: ' + yellow(RESOURCES_FILE);
            if (!quiet) spinner.succeed(msg);
            loggerInfo(msg);
        } catch (error) {
            msg = 'Error loading resources file: ' + RESOURCES_FILE + ' ' + error.message;
            if (!quiet) spinner.warn(msg);
            loggerError(msg + " : " + JSON.stringify(error));
            return;
        }  
        
        msg = 'Create ZIP';
        loggerInfo(msg);
        msg = 'Creating ZIP ...';
        if (!quiet) spinner = ora(msg).start();
        loggerInfo(msg);
        ZIP = await createDeploymentPackage(LAMBDA_FILES_PATH)
        msg = 'Created ZIP File: ' + yellow(LAMBDA_FILES_PATH);
        if (!quiet) spinner.succeed(msg);
        loggerInfo(msg);

        loggerInfo('Update Lambda function');
        await updateLambdaFunction(resources);

        loggerInfo('Update AppSync API');
        await updateAppSyncAPI(resources);
    }
}

export { createUpdateAWSpipeline, getNeptuneClusterinfoBy, removeAWSpipelineResources }

