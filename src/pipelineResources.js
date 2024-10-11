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
import { loggerDebug, loggerError, loggerInfo, yellow } from './logger.js';
import { parseNeptuneDomain } from "./util.js";

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
let NEPTUNE_IAM_AUTH = false;
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

function startSpinner(text) {
    if (!quiet) {
        spinner = ora(text).start();
    }
}

function succeedSpinner(text) {
    if (!quiet) {
        spinner.succeed(text);
    }
}

function warnSpinner(text) {
    if (!quiet) {
        spinner.warn(text);
    }
}

async function checkPipeline() {
    // Checking if Role, Lambda and AppSync API is already created.
    const iamClient = new IAMClient({region: REGION});
    const lambdaClient = new LambdaClient({region: REGION});
    const appSyncClient = new AppSyncClient({region: REGION});

    let lambdaExists = false;
    let appSyncExists = false;
    let roleExists = false;
    
    loggerInfo('Checking pipeline resources', {toConsole: true});
    startSpinner('Checking for lambda...');
    try {
        const command = new GetFunctionCommand({FunctionName: NAME +'LambdaFunction'});
        await lambdaClient.send(command);
        lambdaExists = true;
        const text = 'Found lambda';
        succeedSpinner(text);
        loggerInfo(text);
    } catch (error) {
        lambdaExists = false;
        const text = 'Lambda not found';
        warnSpinner(text);
        loggerInfo(text);
        loggerDebug("checkPipeline GetFunctionCommand: " + JSON.stringify(error));
    }

    startSpinner('Checking for API...');
    const notFound = 'API not found';
    try {
        const command = new ListGraphqlApisCommand({apiType: "GRAPHQL"});
        const response = await appSyncClient.send(command);
        response.graphqlApis.forEach(element => {
            if (element.name == NAME + 'API') {
                //APPSYNC_API_ID = element.apiId;
                appSyncExists = true;
            }
        });
        if (appSyncExists) {
            succeedSpinner('API found');
        } else {
            warnSpinner(notFound);
            loggerInfo(notFound);
        }
    } catch (error) {
        warnSpinner(notFound);
        loggerInfo(notFound);
        loggerError("checkPipeline ListGraphqlApisCommand : " + JSON.stringify(error));
        appSyncExists = false;
    }

    startSpinner('Checking for lambda execution role...');
    try {
        const command = new GetRoleCommand({ RoleName: NAME + "LambdaExecutionRole" });
        const response = await iamClient.send(command);
        LAMBDA_ROLE = response.Role.Arn;
        roleExists = true;
        const text = 'Lambda execution role found';
        succeedSpinner(text);
        loggerInfo(text);
    } catch (error) {
        const text = 'Lambda execution role not found';
        warnSpinner(text);
        loggerInfo(text);
        loggerDebug("checkPipeline GetRoleCommand: " + JSON.stringify(error));
        roleExists = false;
    }
    
    if (lambdaExists && appSyncExists && roleExists) {
        loggerInfo('Pipeline exists.', {toConsole: true});
        pipelineExists = true;
    } else {
        loggerInfo('Pipeline does not exist.', {toConsole: true});
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

/**
 * Retrieves information about the neptune db cluster for the given db name and region. Should not be used for neptune analytics graphs.
 */
async function getNeptuneClusterDbInfoBy(name, region) {
    NEPTUNE_DB_NAME = name;
    REGION = region;

    await setNeptuneDbClusterInfo();

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

/**
 * Retrieves information about the neptune db cluster and sets module-level variable values based on response data. Should not be used for neptune analytics graphs.
 */
async function setNeptuneDbClusterInfo() {
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
}


async function createLambdaRole() {
    const iamClient = new IAMClient({region: REGION});
    
    // Create Lambda principal role
    msg = 'Creating Lambda principal role ...';
    loggerInfo(msg);
    startSpinner(msg);
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
    msg = 'Role ARN: ' + yellow(LAMBDA_ROLE);
    succeedSpinner(msg);
    loggerInfo('Created Lambda principal role')
    loggerDebug(msg);

    // Attach to Lambda role the AWSLambdaBasicExecutionRole 
    msg = 'Attaching AWSLambdaBasicExecutionRole to Lambda Role';
    startSpinner(msg);
    loggerInfo(msg);
    let input = {
        RoleName: roleName,
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    };
    let command = new AttachRolePolicyCommand(input);
    await iamClient.send(command);    
    storeResource({LambdaExecutionPolicy1: input.PolicyArn});
    msg = `Attached ${yellow('AWSLambdaBasicExecutionRole')} to Lambda Role`;
    succeedSpinner(msg);
    loggerInfo(msg);


    if (NEPTUNE_IAM_AUTH) {

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
        startSpinner(msg);
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
        msg = 'Neptune query policy ARN: ' + yellow(policyARN);
        succeedSpinner(msg);
        loggerInfo('Neptune query policy created')
        loggerDebug(msg);
        
        // Attach to Lambda role the Neptune query policy. 
        msg = 'Attaching Neptune query policy to Lambda role ...';
        startSpinner(msg);
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
        succeedSpinner(msg);
        loggerInfo(msg);
        
    } else {
        
        msg = 'Attaching policy for Neptune VPC to Lambda role ...';
        startSpinner(msg);
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
        succeedSpinner(msg);
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
    loggerInfo('Creating Lambda function');
    startSpinner('Creating Lambda function ...');
    let lambdaName = NAME +'LambdaFunction';
    let params = {
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
                "NEPTUNE_IAM_AUTH_ENABLED": NEPTUNE_IAM_AUTH.toString(),
                "LOGGING_ENABLED": "false",
                "NEPTUNE_DB_NAME": NEPTUNE_DB_NAME,
                "NEPTUNE_REGION": REGION,
                "NEPTUNE_DOMAIN": parseNeptuneDomain(NEPTUNE_HOST),
                "NEPTUNE_TYPE": NEPTUNE_TYPE,
            },
        },
    };

    if (!NEPTUNE_IAM_AUTH) {
        params.VpcConfig = {
            SubnetIds: NEPTUNE_DBSubnetIds,
            SecurityGroupIds: [NEPTUNE_VpcSecurityGroupId]
        }
    }
    const lambdaClient = new LambdaClient({region: REGION});
    const data = await lambdaClient.send(new LambdaCreateFunctionCommand(params));
    LAMBDA_ARN = data.FunctionArn;
    storeResource({LambdaFunction: lambdaName});
    msg = 'Lambda Name: ' + yellow(NAME +'LambdaFunction') + ' ARN: ' + yellow(LAMBDA_ARN);
    succeedSpinner(msg);
    loggerInfo('Lambda function created')
    loggerDebug(msg);
}


async function createAppSyncAPI() {      
    const iamClient = new IAMClient({region: REGION});

    loggerInfo('Creating lambda invoke policy');
    startSpinner('Creating policy for Lambda invocation ...');
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
    succeedSpinner('Lambda invocation policy created: ' + yellow(policyName));
    loggerInfo('Created lambda invoke policy');
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

    loggerInfo('Creating lambda invocation role');
    startSpinner('Creating role for Lambda invocation ...');
    response = await iamClient.send(new CreateRoleCommand(params));        
    const LAMBDA_INVOCATION_ROLE = response.Role.Arn;        
    storeResource({LambdaInvokeRole: roleName});
    sleep(5000);
    succeedSpinner('Lambda invocation role created: ' + yellow(roleName));
    loggerInfo('Created lambda invocation role');
    loggerInfo('Attaching role policy');
    startSpinner('Attaching policy ...');
    params = {
        RoleName: roleName,
        PolicyArn: policyARN,
    };
    command = new AttachRolePolicyCommand(params);
    await iamClient.send(command);
    succeedSpinner('Attached policy to role');
    loggerInfo('Attached role policy');
    // APPSync API
    const appSyncClient = new AppSyncClient({region: REGION});

    loggerInfo('Creating AppSync API');
    startSpinner('Creating AppSync API ...');
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
    succeedSpinner('Created API: ' + yellow(NAME + 'API'));
    loggerInfo('Created App Sync API');

    // create Key
    loggerInfo('Creating App Sync API key');
    startSpinner('Creating API key ...');
    command = new CreateApiKeyCommand({apiId: apiId});
    response = await appSyncClient.send(command);
    const apiKey = response.apiKey.id;
    succeedSpinner('Created API key');
    loggerInfo('Created App Sync API key');

    // create datasource
    loggerInfo('Creating datasource');
    startSpinner('Creating DataSource ...');
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
    succeedSpinner('Created DataSource: ' + yellow(NAME+'DataSource'));
    loggerInfo('Created datasource');

    // create function
    loggerInfo('Creating function');
    startSpinner('Creating Function ...');
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
    succeedSpinner('Created Function: ' + yellow(NAME+'Function'));
    loggerInfo('Created function');

    // Upload schema
    loggerInfo('Creating schema');
    startSpinner('Uploading schema ...');
    let encoder = new TextEncoder();
    let definition = encoder.encode(APPSYNC_SCHEMA);
    params = { 
        apiId: apiId,
        definition: definition,
      };
    command = new StartSchemaCreationCommand(params);
    response = await appSyncClient.send(command);    
    await sleep(5000);
    succeedSpinner('Added schema');
    loggerInfo('Created schema');
    
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
    loggerInfo('Attaching resolvers');
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
    loggerInfo('Finished attaching resolvers');
}


async function attachResolverToSchemaField (client, apiId, functionId, typeName, fieldName) {
    
    // attach resolvers to schema
    msg = 'Attaching resolver to schema type ' + yellow(typeName) + ' field ' + yellow(fieldName) + ' ...';
    startSpinner(msg);
    loggerDebug(msg);

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
      succeedSpinner(msg);
      loggerDebug(msg);
}


async function removeAWSpipelineResources(resources, quietI) {
    quiet = quietI;
    const appSyncClient = new AppSyncClient({region: resources.region});
    const lambdaClient = new LambdaClient({region: resources.region});
    const iamClient = new IAMClient({region: resources.region});
    
    // Appsync API
    msg = 'Deleting AppSync API ...';
    startSpinner('Deleting AppSync API ...');
    loggerInfo(msg);

    try {
        const input = { 
            apiId:  resources.AppSyncAPI
        };
        const command = new DeleteGraphqlApiCommand(input);
        await appSyncClient.send(command);
        msg = 'Deleted API id: ' + yellow(resources.AppSyncAPI);
        succeedSpinner(msg);
        loggerInfo('Deleted AppSync API')
        loggerDebug(msg);
    } catch (error) {
        msg = 'AppSync API delete failed: ' + error.message; 
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }
    
    // Lambda
    msg = 'Deleting Lambda function ...';
    startSpinner(msg);
    loggerInfo(msg);
    try {
        const input = {
            FunctionName: resources.LambdaFunction 
        };
        const command = new DeleteFunctionCommand(input);        
        await lambdaClient.send(command);
        msg = 'Deleted Lambda function: ' + yellow(resources.LambdaFunction);
        succeedSpinner(msg);
        loggerInfo('Deleted Lambda')
        loggerDebug(msg);
    } catch (error) {
        msg = 'Lambda function failed to delete: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }    
    
    // Lambda execution role
    msg = 'Detaching first IAM policy from role ...';
    startSpinner(msg);
    loggerInfo(msg);
    try {
        let input = { 
            PolicyArn: resources.LambdaExecutionPolicy1,
            RoleName: resources.LambdaExecutionRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        msg = 'Detached policy: ' + yellow(resources.LambdaExecutionPolicy1) + " from role: " + yellow(resources.LambdaExecutionRole);        
        succeedSpinner(msg);
        loggerInfo('Detached first IAM policy from role');
        loggerDebug(msg);
    } catch (error) {
        msg = 'Detach first policy failed: ' + error.error;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }

    msg = 'Detaching second IAM policy from role ...';
    startSpinner(msg);
    loggerInfo(msg);
    try {
        let input = { 
            PolicyArn: resources.LambdaExecutionPolicy2,
            RoleName: resources.LambdaExecutionRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        msg = 'Detached IAM policy: ' + yellow(resources.LambdaExecutionPolicy2) + " from role: " + yellow(resources.LambdaExecutionRole);
        succeedSpinner(msg);
        loggerInfo('Detached second IAM policy from role');
        loggerDebug(msg);
    } catch (error) {
        msg = 'Detach second IAM policy failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }
    
    // Delete Neptune query Policy
    if (resources.NeptuneQueryPolicy != undefined) {
        msg = 'Deleting query policy ...';
        startSpinner(msg);
        loggerInfo(msg);
        try {
            const input = {
                PolicyArn: resources.NeptuneQueryPolicy,
            };
            const command = new DeletePolicyCommand(input);     
            await iamClient.send(command);            
            msg = 'Deleted query policy: ' + yellow(resources.NeptuneQueryPolicy);
            succeedSpinner(msg);
            loggerInfo('Deleted query policy');
            loggerDebug(msg);
        } catch (error) {
            msg = 'Delete query policy failed: ' + error.message;
            if (!quiet) spinner.fail(msg);
            loggerError(msg + " : " + JSON.stringify(error));
        }
    }

    // Delete Role
    msg = 'Deleting execution role ...';
    startSpinner(msg);
    loggerInfo(msg);
    try {
        const input = {
            RoleName: resources.LambdaExecutionRole,
        };
        const command = new DeleteRoleCommand(input);        
        await iamClient.send(command);
        msg = 'Deleted execution role: ' + yellow(resources.LambdaExecutionRole);
        succeedSpinner(msg);
        loggerInfo('Deleted execution role');
        loggerDebug(msg);
    } catch (error) {
        msg = 'Delete execution role failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }
    
    // AppSync Lambda role
    msg = 'Detaching invoke policy from AppSync Lambda role ...';
    startSpinner(msg);
    loggerInfo(msg);
    try {
        let input = { 
            PolicyArn: resources.LambdaInvokePolicy,
            RoleName: resources.LambdaInvokeRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        msg = 'Detached invoke policy: ' + yellow(resources.LambdaInvokePolicy) + " from role: " + yellow(resources.LambdaInvokeRole);
        succeedSpinner(msg);
        loggerInfo('Detached invoke policy');
        loggerDebug(msg);
    } catch (error) {
        msg = 'Detach invoke policy failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }

    // Delete Policy
    msg = 'Deleting invoke policy ...';
    startSpinner(msg);
    loggerInfo(msg);
    try {
        const input = {
            PolicyArn: resources.LambdaInvokePolicy,
        };
        const command = new DeletePolicyCommand(input);     
        await iamClient.send(command);
        msg = 'Deleted invoke policy: ' + yellow(resources.LambdaInvokePolicy);
        succeedSpinner(msg);
        loggerInfo('Deleted invoke policy');
        loggerDebug(msg);
    } catch (error) {
        msg = 'Delete invoke policy failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }
   
    // Delete Role
    msg = 'Deleting invoke role ...';
    startSpinner(msg);
    loggerInfo(msg);
    try {
        const input = {
            RoleName: resources.LambdaInvokeRole,
        };
        const command = new DeleteRoleCommand(input);        
        await iamClient.send(command);
        msg = 'Deleted invoke role: ' + yellow(resources.LambdaInvokeRole);
        succeedSpinner(msg);
        loggerInfo('Deleted invoke role');
        loggerDebug(msg);
    } catch (error) {
        msg = 'Delete invoke role failed: ' + error.message;
        if (!quiet) spinner.fail(msg);
        loggerError(msg + " : " + JSON.stringify(error));
    }    
}


async function updateLambdaFunction(resources) {
    msg = 'Updating Lambda function code ...';
    startSpinner(msg);
    loggerInfo(msg);
    const lambdaClient = new LambdaClient({region: resources.region});
    const input = {
        FunctionName: resources.LambdaFunction,
        ZipFile: ZIP,
    };
    const command = new UpdateFunctionCodeCommand(input);
    await lambdaClient.send(command);
    msg = 'Lambda function code updated: ' + yellow(resources.LambdaFunction);
    succeedSpinner(msg);
    loggerInfo('Lambda function code updated');
    loggerDebug(msg);
}


async function updateAppSyncAPI(resources) {    
    const appSyncClient = new AppSyncClient({region: resources.region});

    msg = 'Updating AppSync API schema ...';
    startSpinner(msg);
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
    msg = 'AppSync API Schema updated';
    succeedSpinner(msg);
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
    NEPTUNE_IAM_AUTH = isNeptuneIAMAuth;
    NEPTUNE_HOST = neptuneHost;
    NEPTUNE_PORT = neptunePort;
    thisOutputFolderPath = outputFolderPath;
    NEPTUNE_TYPE = neptuneType;

    msg = 'Creating or updating AWS pipeline resources ...';
    loggerInfo(msg, {toConsole: true});
    await checkPipeline();

    if (!pipelineExists) {
        loggerInfo('Creating AWS pipeline resources', {toConsole: true});
        try {
            storeResource({region: REGION});

            if (NEPTUNE_TYPE === 'neptune-db') {
                try {
                    loggerInfo('Getting Neptune Cluster Info');
                    startSpinner('Getting Neptune Cluster Info ...');
                    await setNeptuneDbClusterInfo();
                    succeedSpinner('Retrieved Neptune Cluster Info');
                    loggerInfo('Set Neptune Cluster Info');
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
                            loggerDebug(`Subnet Group: ` + yellow(NEPTUNE_DBSubnetGroup), {toConsole: true});
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
                        loggerInfo("Could not read the database ARN to restrict the Lambda permissions. To increase security change the resource in the Neptune Query policy.", {toConsole: true});
                        loggerInfo("Proceeding without getting Neptune Cluster info.", {toConsole: true});
                    }
                }
            }

            msg = 'Creating ZIP ...';
            loggerInfo(msg);
            startSpinner(msg);
            ZIP = await createDeploymentPackage(LAMBDA_FILES_PATH)
            msg = 'Created ZIP File: ' + yellow(LAMBDA_FILES_PATH);
            succeedSpinner(msg);
            loggerInfo(msg);

            await createLambdaRole();
            await createLambdaFunction();
            await createAppSyncAPI();            

            loggerInfo('Saved resources to file: ' + yellow(RESOURCES_FILE), {toConsole: true});

        } catch (error) {
            msg = 'Error creating resources: ' + error.message;
            if (!quiet) spinner.fail(msg);
            loggerError(msg + " : " + JSON.stringify(error));
            loggerError('Rolling back resources.');
            await removeAWSpipelineResources(RESOURCES, quiet);
        }

    } else {
        loggerInfo('Updating AWS pipeline resources', {toConsole: true});
        let resources = null;
        try {
            msg = 'Loading resources file ...';            
            startSpinner(msg);
            loggerInfo(msg);
            resources = JSON.parse(fs.readFileSync(RESOURCES_FILE, 'utf8'));
            msg = 'Loaded resources from file: ' + yellow(RESOURCES_FILE);
            succeedSpinner(msg);
            loggerInfo(msg);
        } catch (error) {
            msg = 'Error loading resources file: ' + RESOURCES_FILE + ' ' + error.message;
            if (!quiet) spinner.warn(msg);
            loggerError(msg + " : " + JSON.stringify(error));
            return;
        }  

        msg = 'Creating ZIP ...';
        startSpinner(msg);
        loggerInfo(msg);
        ZIP = await createDeploymentPackage(LAMBDA_FILES_PATH)
        msg = 'Created ZIP File: ' + yellow(LAMBDA_FILES_PATH);
        succeedSpinner(msg);
        loggerInfo(msg);

        loggerInfo('Updating Lambda function', {toConsole: true});
        await updateLambdaFunction(resources);

        loggerInfo('Updating AppSync API', {toConsole: true});
        await updateAppSyncAPI(resources);
    }
}

export { createUpdateAWSpipeline, getNeptuneClusterDbInfoBy, removeAWSpipelineResources }

