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
import { parseNeptuneDomainFromHost } from "./util.js";

const NEPTUNE_DB = 'neptune-db';

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
let NEPTUNE_TYPE = NEPTUNE_DB;
let ZIP = null;
let RESOURCES = {};
let RESOURCES_FILE = '';

const sleep = ms => new Promise(r => setTimeout(r, ms)); // alternative: import { setTimeout } from timers/promises
let spinner = null;

/**
 * Start the spinner with a message.
 *
 * To also log the message to file, set logInfo = true. Do not log messages with sensitive data to file.
 *
 * @param text the message to display on the spinner as it is spinning
 * @param logInfo if true then the text will also be logged to file at info level
 */
function startSpinner(text, logInfo = false) {
    if (logInfo) {
        loggerInfo(text);
    }
    if (!quiet) {
        spinner = ora(text).start();
    }
}

/**
 * Stop the spinner with a success message.
 *
 * To also log the message to file, set logOptions.logLevel to 'info' or 'debug'. Do not log messages with sensitive data to file at info level.
 *
 * @param text the text to display on the spinner to indicate success
 * @param logOptions optional logging options which determine if the text is also logged to file and what level it should be logged at
 */
function succeedSpinner(text, logOptions = {logLevel: ''}) {
    if (spinner && !quiet) {
        spinner.succeed(text);
    } else if (!spinner && !quiet) {
        console.error('Cannot succeed spinner as it has not been started');
        console.log(text);
    }
    if (logOptions.logLevel === 'info') {
        loggerInfo(text);
    } else if (logOptions.logLevel === 'debug') {
        loggerDebug(text);
    }
}

function warnSpinner(text) {
    if (spinner && !quiet) {
        spinner.warn(text);
    } else if (!spinner && !quiet) {
        console.error('Cannot warn spinner as it has not been started');
        console.log(text);
    }
}

function failSpinner(text) {
    if (spinner && !quiet) {
        spinner.fail(text);
    } else if (!spinner && !quiet) {
        console.error('Cannot fail spinner as it has not been started');
        console.log(text);
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
        succeedSpinner('Found lambda', {logLevel: 'info'});
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
        // set maxResults to max allowed value as workaround until https://github.com/aws/amazon-neptune-for-graphql/issues/39 is addressed
        const command = new ListGraphqlApisCommand({apiType: "GRAPHQL", maxResults: 25});
        const response = await appSyncClient.send(command);
        response.graphqlApis.forEach(element => {
            if (element.name == NAME + 'API') {
                //APPSYNC_API_ID = element.apiId;
                appSyncExists = true;
            }
        });
        if (appSyncExists) {
            succeedSpinner('API found', {logLevel: 'info'});
        } else {
            warnSpinner(notFound);
            loggerInfo(notFound);
        }
    } catch (error) {
        warnSpinner(notFound);
        loggerInfo(notFound);
        loggerError('Error checking for API', error);
        appSyncExists = false;
    }

    startSpinner('Checking for lambda execution role...');
    try {
        const command = new GetRoleCommand({ RoleName: NAME + "LambdaExecutionRole" });
        const response = await iamClient.send(command);
        LAMBDA_ROLE = response.Role.Arn;
        roleExists = true;
        succeedSpinner('Lambda execution role found', {logLevel: 'info'});
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
        loggerError('Lambda ' + yellow(NAME) + 'LambdaFunction is  missing.');
    }

    if (!roleExists) {
        loggerError('Role ' + yellow(NAME) + 'LambdaExecutionRole is  missing.');
    }

    if (!appSyncExists) {
        loggerError('AppSync ' + yellow(NAME) + 'API is  missing.');
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
    NEPTUNE_IAM_POLICY_RESOURCE = `${data.DBClusters[0].DBClusterArn.substring(0, data.DBClusters[0].DBClusterArn.lastIndexOf(':cluster')).replace('rds', NEPTUNE_DB)}:${data.DBClusters[0].DbClusterResourceId}/*`;
    response.DBSubnetGroups[0].Subnets.forEach(element => {
        NEPTUNE_DBSubnetIds.push(element.SubnetIdentifier);
    });
}


async function createLambdaRole() {
    const iamClient = new IAMClient({region: REGION});
    
    // Create Lambda principal role
    startSpinner('Creating Lambda principal role ...', true);
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
    succeedSpinner('Role ARN: ' + yellow(LAMBDA_ROLE), {logLevel: 'debug'});
    loggerInfo('Created Lambda principal role')

    // Attach to Lambda role the AWSLambdaBasicExecutionRole
    startSpinner('Attaching AWSLambdaBasicExecutionRole to Lambda Role', true);
    let input = {
        RoleName: roleName,
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    };
    let command = new AttachRolePolicyCommand(input);
    await iamClient.send(command);    
    storeResource({LambdaExecutionPolicy1: input.PolicyArn});
    succeedSpinner(`Attached ${yellow('AWSLambdaBasicExecutionRole')} to Lambda Role`, {logLevel: 'info'});


    if (NEPTUNE_IAM_AUTH) {
        // Create Neptune query policy
        startSpinner('Creating policy for Neptune queries', true);
        let policyName = NAME+"NeptuneQueryPolicy";
        let command = new CreatePolicyCommand({
            PolicyDocument: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: [
                        NEPTUNE_TYPE + ':connect',
                        NEPTUNE_TYPE + ':DeleteDataViaQuery',
                        NEPTUNE_TYPE + ':ReadDataViaQuery',
                        NEPTUNE_TYPE + ':WriteDataViaQuery'
                    ],
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
        succeedSpinner('Neptune query policy ARN: ' + yellow(policyARN), {logLevel: 'debug'});
        loggerInfo('Neptune query policy created')

        // Attach to Lambda role the Neptune query policy.
        startSpinner('Attaching Neptune query policy to Lambda role ...', true);
        input = {
            RoleName: roleName,
            PolicyArn: policyARN,
        };
        command = new AttachRolePolicyCommand(input);
        await iamClient.send(command);    
        storeResource({LambdaExecutionPolicy2: input.PolicyArn});    
        await sleep(10000);
        succeedSpinner(`Attached ${yellow('Neptune Query Policy')} policies to Lambda Role`, {logLevel: 'info'});
        
    } else {
        startSpinner('Attaching policy for Neptune VPC to Lambda role ...', true);
        input = {
            RoleName: roleName,
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
        };
        command = new AttachRolePolicyCommand(input);
        await iamClient.send(command);    
        storeResource({LambdaExecutionPolicy2: input.PolicyArn});    
        await sleep(10000);
        succeedSpinner(`Attached ${yellow('AWSLambdaVPCAccessExecutionRole')} policies to role`, {logLevel: 'info'});
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
    startSpinner('Creating Lambda function', true);
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
                "NEPTUNE_DOMAIN": parseNeptuneDomainFromHost(NEPTUNE_HOST),
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
    succeedSpinner('Lambda Name: ' + yellow(lambdaName) + ' ARN: ' + yellow(LAMBDA_ARN), {logLevel: 'debug'});
    loggerInfo('Lambda function created')
}


async function createAppSyncAPI() {      
    const iamClient = new IAMClient({region: REGION});

    startSpinner('Creating policy for Lambda invocation ...', true);
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
    succeedSpinner('Lambda invocation policy created: ' + yellow(policyName), {logLevel: 'debug'});
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

    startSpinner('Creating role for Lambda invocation ...', true);
    response = await iamClient.send(new CreateRoleCommand(params));        
    const LAMBDA_INVOCATION_ROLE = response.Role.Arn;        
    storeResource({LambdaInvokeRole: roleName});
    sleep(5000);
    succeedSpinner('Lambda invocation role created: ' + yellow(roleName), {logLevel: 'debug'});
    loggerInfo('Created lambda invocation role');

    startSpinner('Attaching policy ...', true);
    params = {
        RoleName: roleName,
        PolicyArn: policyARN,
    };
    command = new AttachRolePolicyCommand(params);
    await iamClient.send(command);
    succeedSpinner('Attached policy to role', {logLevel: 'info'});
    // APPSync API
    const appSyncClient = new AppSyncClient({region: REGION});

    startSpinner('Creating AppSync API ...', true);
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
    succeedSpinner('Created API: ' + yellow(NAME + 'API', {logLevel: 'debug'}));
    loggerInfo('Created App Sync API');

    // create Key
    startSpinner('Creating API key ...', true);
    command = new CreateApiKeyCommand({apiId: apiId});
    response = await appSyncClient.send(command);
    const apiKey = response.apiKey.id;
    succeedSpinner('Created API key', {logLevel: 'info'});

    // create datasource
    startSpinner('Creating DataSource ...', true);
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
    succeedSpinner('Created DataSource: ' + yellow(NAME+'DataSource'), {logLevel: 'debug'});
    loggerInfo('Created datasource');

    // create function
    startSpinner('Creating Function ...', true);
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
    succeedSpinner('Created Function: ' + yellow(NAME+'Function'), {logLevel: 'debug'});
    loggerInfo('Created function');

    // Upload schema
    startSpinner('Uploading schema ...', true);
    let encoder = new TextEncoder();
    let definition = encoder.encode(APPSYNC_SCHEMA);
    params = { 
        apiId: apiId,
        definition: definition,
      };
    command = new StartSchemaCreationCommand(params);
    response = await appSyncClient.send(command);    
    await sleep(5000);
    succeedSpinner('Added schema', {logLevel: 'info'});
    
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
    const startMsg = 'Attaching resolver to schema type ' + yellow(typeName) + ' field ' + yellow(fieldName) + ' ...';
    startSpinner(startMsg);
    loggerDebug(startMsg);

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
      const endMsg = 'Attached resolver to schema type ' + yellow(typeName) + ' field ' + yellow(fieldName);
      succeedSpinner(endMsg);
      loggerDebug(endMsg);
}


async function removeAWSpipelineResources(resources, quietI) {
    quiet = quietI;
    const appSyncClient = new AppSyncClient({region: resources.region});
    const lambdaClient = new LambdaClient({region: resources.region});
    const iamClient = new IAMClient({region: resources.region});
    
    // Appsync API
    startSpinner('Deleting AppSync API ...', true);

    try {
        const input = { 
            apiId:  resources.AppSyncAPI
        };
        const command = new DeleteGraphqlApiCommand(input);
        await appSyncClient.send(command);
        succeedSpinner('Deleted API id: ' + yellow(resources.AppSyncAPI), {logLevel: 'debug'});
        loggerInfo('Deleted AppSync API')
    } catch (error) {
        const message = 'AppSync API delete failed';
        failSpinner(message);
        loggerError(message, error);
    }
    
    // Lambda
    startSpinner('Deleting Lambda function ...', true);
    try {
        const input = {
            FunctionName: resources.LambdaFunction 
        };
        const command = new DeleteFunctionCommand(input);        
        await lambdaClient.send(command);
        succeedSpinner('Deleted Lambda function: ' + yellow(resources.LambdaFunction), {logLevel: 'debug'});
        loggerInfo('Deleted Lambda')
    } catch (error) {
        const message = 'Lambda function failed to delete';
        failSpinner(message);
        loggerError(message, error);
    }    
    
    // Lambda execution role
    startSpinner('Detaching first IAM policy from role ...', true);
    try {
        let input = { 
            PolicyArn: resources.LambdaExecutionPolicy1,
            RoleName: resources.LambdaExecutionRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        succeedSpinner('Detached policy: ' + yellow(resources.LambdaExecutionPolicy1) + " from role: " + yellow(resources.LambdaExecutionRole), {logLevel: 'debug'});
        loggerInfo('Detached first IAM policy from role');
    } catch (error) {
        let message = 'Detach first policy failed';
        failSpinner(message);
        loggerError(message, error);
    }

    startSpinner('Detaching second IAM policy from role ...', true);
    try {
        let input = { 
            PolicyArn: resources.LambdaExecutionPolicy2,
            RoleName: resources.LambdaExecutionRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        succeedSpinner('Detached IAM policy: ' + yellow(resources.LambdaExecutionPolicy2) + " from role: " + yellow(resources.LambdaExecutionRole), {logLevel: 'debug'});
        loggerInfo('Detached second IAM policy from role');
    } catch (error) {
        const message = 'Detach second IAM policy failed';
        failSpinner(message);
        loggerError(message, error);
    }
    
    // Delete Neptune query Policy
    if (resources.NeptuneQueryPolicy != undefined) {
        startSpinner('Deleting query policy ...', true);
        try {
            const input = {
                PolicyArn: resources.NeptuneQueryPolicy,
            };
            const command = new DeletePolicyCommand(input);     
            await iamClient.send(command);
            succeedSpinner('Deleted query policy: ' + yellow(resources.NeptuneQueryPolicy), {logLevel: 'debug'});
            loggerInfo('Deleted query policy');
        } catch (error) {
            const message = 'Delete query policy failed';
            failSpinner(message);
            loggerError(message, error);
        }
    }

    // Delete Role
    startSpinner('Deleting execution role ...', true);
    try {
        const input = {
            RoleName: resources.LambdaExecutionRole,
        };
        const command = new DeleteRoleCommand(input);        
        await iamClient.send(command);
        succeedSpinner('Deleted execution role: ' + yellow(resources.LambdaExecutionRole), {logLevel: 'debug'});
        loggerInfo('Deleted execution role');
    } catch (error) {
        const message = 'Delete execution role failed';
        failSpinner(message);
        loggerError(message, error);
    }
    
    // AppSync Lambda role
    startSpinner('Detaching invoke policy from AppSync Lambda role ...', true);
    try {
        let input = { 
            PolicyArn: resources.LambdaInvokePolicy,
            RoleName: resources.LambdaInvokeRole
        };
        let command = new DetachRolePolicyCommand(input);        
        await iamClient.send(command);
        succeedSpinner('Detached invoke policy: ' + yellow(resources.LambdaInvokePolicy) + " from role: " + yellow(resources.LambdaInvokeRole), {logLevel: 'debug'});
        loggerInfo('Detached invoke policy');
    } catch (error) {
        const message = 'Detach invoke policy failed';
        failSpinner(message);
        loggerError(message, error);
    }

    // Delete Policy
    startSpinner('Deleting invoke policy ...', true);
    try {
        const input = {
            PolicyArn: resources.LambdaInvokePolicy,
        };
        const command = new DeletePolicyCommand(input);     
        await iamClient.send(command);
        succeedSpinner('Deleted invoke policy: ' + yellow(resources.LambdaInvokePolicy), {logLevel: 'debug'});
        loggerInfo('Deleted invoke policy');
    } catch (error) {
        const message = 'Delete invoke policy failed';
        failSpinner(message);
        loggerError(message, error);
    }
   
    // Delete Role
    startSpinner('Deleting invoke role ...', true);
    try {
        const input = {
            RoleName: resources.LambdaInvokeRole,
        };
        const command = new DeleteRoleCommand(input);        
        await iamClient.send(command);
        succeedSpinner('Deleted invoke role: ' + yellow(resources.LambdaInvokeRole), {logLevel: 'debug'});
        loggerInfo('Deleted invoke role');
    } catch (error) {
        const message = 'Delete invoke role failed';
        failSpinner(message);
        loggerError(message, error);
    }    
}


async function updateLambdaFunction(resources) {
    startSpinner('Updating Lambda function code ...', true);
    const lambdaClient = new LambdaClient({region: resources.region});
    const input = {
        FunctionName: resources.LambdaFunction,
        ZipFile: ZIP,
    };
    const command = new UpdateFunctionCodeCommand(input);
    await lambdaClient.send(command);
    succeedSpinner('Lambda function code updated: ' + yellow(resources.LambdaFunction), {logLevel: 'debug'});
    loggerInfo('Lambda function code updated');
}


async function updateAppSyncAPI(resources) {    
    const appSyncClient = new AppSyncClient({region: resources.region});

    startSpinner('Updating AppSync API schema ...', true);
    let encoder = new TextEncoder();
    let definition = encoder.encode(APPSYNC_SCHEMA);

    let params = { 
        apiId: resources.AppSyncAPI,
        definition: definition,
      };
    let command = new StartSchemaCreationCommand(params);
    await appSyncClient.send(command);    
    await sleep(5000);
    succeedSpinner('AppSync API Schema updated', {logLevel: 'info'});
  
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

    loggerInfo('Creating or updating AWS pipeline resources ...', {toConsole: true});
    await checkPipeline();

    if (!pipelineExists) {
        loggerInfo('Creating AWS pipeline resources', {toConsole: true});
        try {
            storeResource({region: REGION});

            if (NEPTUNE_TYPE === NEPTUNE_DB) {
                try {
                    startSpinner('Getting Neptune Cluster Info ...', true);
                    await setNeptuneDbClusterInfo();
                    succeedSpinner('Retrieved Neptune Cluster Info', {logLevel: 'info'});
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
                    let message = 'Error getting Neptune Cluster Info.';
                    failSpinner(message);
                    loggerError(message, error);
                    if (!isNeptuneIAMAuth) {
                        loggerError("VPC data is not available to proceed.");
                        exit(1);
                    } else {
                        loggerInfo("Could not read the database ARN to restrict the Lambda permissions. To increase security change the resource in the Neptune Query policy.", {toConsole: true});
                        loggerInfo("Proceeding without getting Neptune Cluster info.", {toConsole: true});
                    }
                }
            }

            startSpinner('Creating ZIP ...', true);
            ZIP = await createDeploymentPackage(LAMBDA_FILES_PATH)
            succeedSpinner('Created ZIP File: ' + yellow(LAMBDA_FILES_PATH), {logLevel: 'info'});

            await createLambdaRole();
            await createLambdaFunction();
            await createAppSyncAPI();            

            loggerInfo('Saved resources to file: ' + yellow(RESOURCES_FILE), {toConsole: true});

        } catch (error) {
            const message= 'Error creating resources';
            failSpinner(message);
            loggerError(message, error);
            loggerError('Rolling back resources.');
            await removeAWSpipelineResources(RESOURCES, quiet);
        }

    } else {
        loggerInfo('Updating AWS pipeline resources', {toConsole: true});
        let resources = null;
        try {
            startSpinner('Loading resources file ...', true);
            resources = JSON.parse(fs.readFileSync(RESOURCES_FILE, 'utf8'));
            succeedSpinner('Loaded resources from file: ' + yellow(RESOURCES_FILE), {logLevel: 'info'});
        } catch (error) {
            const message = 'Error loading resources file' + RESOURCES_FILE;
            if (!quiet) spinner.warn(message);
            loggerError(message, error);
            return;
        }  

        startSpinner('Creating ZIP ...', true);
        ZIP = await createDeploymentPackage(LAMBDA_FILES_PATH)
        succeedSpinner('Created ZIP File: ' + yellow(LAMBDA_FILES_PATH), {logLevel: 'info'});

        loggerInfo('Updating Lambda function', {toConsole: true});
        await updateLambdaFunction(resources);

        loggerInfo('Updating AppSync API', {toConsole: true});
        await updateAppSyncAPI(resources);
    }
}

export { createUpdateAWSpipeline, getNeptuneClusterDbInfoBy, removeAWSpipelineResources }

