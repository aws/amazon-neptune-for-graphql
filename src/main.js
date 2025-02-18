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

import { readFileSync, writeFileSync, mkdirSync}  from 'fs';
import { helpTxt } from './help.js';
import { graphDBInferenceSchema } from './graphdb.js';
import { changeGraphQLSchema } from './changes.js';
import { schemaParser, schemaStringify } from './schemaParser.js';
import { validatedSchemaModel} from './schemaModelValidator.js';
import { resolverJS } from './resolverJS.js';
import { getNeptuneSchema, setGetNeptuneSchemaParameters } from './NeptuneSchema.js';
import { createUpdateAWSpipeline, removeAWSpipelineResources } from './pipelineResources.js'
import { createAWSpipelineCDK } from './CDKPipelineApp.js'
import { createApolloDeploymentPackage, createLambdaDeploymentPackage, getModulePath } from './zipPackage.js'
import { loggerDebug, loggerError, loggerInfo, loggerInit, yellow } from './logger.js';

import ora from 'ora';
let spinner = null;

import path from 'path';
import { parseNeptuneEndpoint } from "./util.js";
// find global installation dir
const __dirname = getModulePath();

// get version
const version = JSON.parse(readFileSync(__dirname + '/../package.json')).version;

/**
 * neptune-graph is neptune analytics
 */
const NEPTUNE_GRAPH = 'neptune-graph';
const NEPTUNE_DB = 'neptune-db';

// Input
let quiet = false;
let logLevel = 'info';
let inputGraphQLSchema = '';
let inputGraphQLSchemaFile = '';
let inputGraphQLSchemaChanges = '';
let inputGraphQLSchemaChangesFile = '';
let inputGraphDBSchema = '';
let inputGraphDBSchemaFile = '';
let inputGraphDBSchemaNeptuneEndpoint = '';
let queryLanguage = 'opencypher'; // or TODO 'gremlin' or 'sparql'
let queryClient = 'sdk';          // or 'http'
let isNeptuneIAMAuth = false;
let createUpdateApolloServer = false;
let createUpdateApolloServerSubgraph = false;
let createUpdatePipeline = false;
let createUpdatePipelineName = '';
let createUpdatePipelineEndpoint = '';
let createUpdatePipelineRegion = 'us-east-1';
let createUpdatePipelineNeptuneDatabaseName = '';
let removePipelineName = '';
let inputCDKpipeline = false;
let inputCDKpipelineName = '';
let inputCDKpipelineEndpoint = '';
let inputCDKpipelineFile = '';
let inputCDKpipelineRegion = '';
let inputCDKpipelineDatabaseName = '';
let createLambdaZip = true;
let outputFolderPath = './output';
let neptuneType = NEPTUNE_DB; // or neptune-graph

// Outputs
let outputSchema = '';
let outputSchemaFile = '';
let outputSourceSchema = '';
let outputSourceSchemaFile = '';
let outputSchemaMutations = true;
let outputLambdaResolver  = '';
let outputLambdaResolverFile  = '';
let outputJSResolver  = '';
let outputJSResolverFile  = '';
let outputNeptuneSchemaFile = '';
let outputLambdaResolverZipName = '';
let outputLambdaResolverZipFile = '';
let outputLambdaPackagePath = '';

// Schema model
let schemaModel = {};

// Parse input arguments
function processArgs() {
    process.argv.forEach(function (val, index, array) {
        switch(val) {
            case '--help':
            case '--h':
            case '-help':
            case '-h':
                console.log(helpTxt);
                process.exit(0);
            break;
            case '--version':
            case '--v':
            case '-version':
            case '-v':
                console.log(version);
                process.exit(0);
            break;
            case '-q':
            case '--quiet':
                quiet = true;
            break;
            case '-lv':
            case '--log-verbose':
                logLevel = 'debug';
            break;
            case '-is':
            case '--input-schema':
                inputGraphQLSchema = array[index + 1];
            break;
            case '-isf':
            case '--input-schema-file':
                inputGraphQLSchemaFile = array[index + 1];
            break;
            case '-ig':
            case '--input-graphdb-schema':
                inputGraphDBSchema = array[index + 1];
            break;
            case '-igf':
            case '--input-graphdb-schema-file':
                inputGraphDBSchemaFile = array[index + 1];
            break;
            case '-isc':
            case '--input-schema-changes-file':
                inputGraphQLSchemaChangesFile = array[index + 1];
            break;
            case '-ie':
            case '--input-graphdb-schema-neptune-endpoint':
                inputGraphDBSchemaNeptuneEndpoint = array[index + 1];
            break;
            case '-os':
            case '--output-schema-file':
                outputSchemaFile = array[index + 1];
            break;
            case '-oss':
            case '--output-source-schema-file':
                outputSourceSchemaFile = array[index + 1];
            break;
            case '-onm':
            case '--output-schema-no-mutations':
                outputSchemaMutations = false;
            break;
            case '-olr':
            case '--output-lambda-resolver-file':
                outputLambdaResolverFile = array[index + 1];
            break;
            case '-or':
            case '--output-js-resolver-file':
                outputJSResolverFile = array[index + 1];
            break;
            case '-og':
            case '--output-neptune-schema-file':
                outputNeptuneSchemaFile = array[index + 1];
            break;
            case '-org':
            case '--output-resolver-query-gremlin':
                queryLanguage = 'gremlin';
            break;
            case '-oro':
            case '--output-resolver-query-opencypher':
                queryLanguage = 'opencypher';
            break;
            case '-orc':
            case '--output-resolver-query-client':
                queryClient = 'client';
            break;
            case '-orh':
            case '--output-resolver-query-https':
                queryClient = 'http';
            break;
            case '-ors':
            case '--output-resolver-query-sdk':
                queryClient = 'sdk';
            break;
            case 'asvr':
            case '--create-update-apollo-server':
                createUpdateApolloServer = true;
                createLambdaZip = false;
                createUpdatePipeline = false;
                inputCDKpipeline = false;
            break;
            case 'asub':
            case '--create-update-apollo-server-subgraph':
                createUpdateApolloServerSubgraph = true;
                createLambdaZip = false;
                createUpdatePipeline = false;
                inputCDKpipeline = false;
            break;
            case '-p':
            case '--create-update-aws-pipeline':
                createUpdatePipeline = true;
                createUpdateApolloServer = false;
                createUpdateApolloServerSubgraph = false;
                break;
            case '-pn':
            case '--create-update-aws-pipeline-name':
                createUpdatePipelineName = array[index + 1];
            break;
            case '-pr':
            case '--create-update-aws-pipeline-region':
                createUpdatePipelineRegion = array[index + 1];
            break;
            case '-pe':
            case '--create-update-aws-pipeline-neptune-endpoint':
                createUpdatePipelineEndpoint = array[index + 1];
            break;
            case '-pd':
            case '--create-update-aws-pipeline-neptune-database-name':
                createUpdatePipelineNeptuneDatabaseName = array[index + 1];
            break;
            case '-rp':
            case '--remove-aws-pipeline-name':
                removePipelineName = array[index + 1];
            break;
            case '-c':
            case '--output-aws-pipeline-cdk':
                inputCDKpipeline = true;
                createUpdateApolloServer = false;
                createUpdateApolloServerSubgraph = false;
            break;
            case '-ce':
            // support miss-spelled option for backwards compatibility - could be removed for next major release
            case '--output-aws-pipeline-cdk-neptume-endpoint':
            case '--output-aws-pipeline-cdk-neptune-endpoint':
                inputCDKpipelineEndpoint = array[index + 1];
            break;
            case '-cd':
            // support miss-spelled option for backwards compatibility - could be removed for next major release
            case '--output-aws-pipeline-cdk-neptume-database-name':
            case '--output-aws-pipeline-cdk-neptune-database-name':
                inputCDKpipelineDatabaseName = array[index + 1];
            break;
            case '-cn':
            case '--output-aws-pipeline-cdk-name':
                inputCDKpipelineName = array[index + 1];
            break;
            case '-cr':
            case '--output-aws-pipeline-cdk-region':
                inputCDKpipelineRegion = array[index + 1];
            break;
            case '-cf':
            case '--output-aws-pipeline-cdk-file':
                inputCDKpipelineFile = array[index + 1];
            break;
            case '-oln':
            case '--output-lambda-resolver-zip-name':
                outputLambdaResolverZipName = array[index + 1];
            break;
            case '-olf':
            case '--output-lambda-resolver-zip-file':
                outputLambdaResolverZipFile = array[index + 1];
            break;
            case '-pi':
            case '--create-update-aws-pipeline-neptune-IAM':
                isNeptuneIAMAuth = true;
            break;
            case '-ci':
            case '--output-aws-pipeline-cdk-neptune-IAM':
                isNeptuneIAMAuth = true;
            break;
            case '-onl':
            case '--output-no-lambda-zip':
                createLambdaZip = false;
            break;
            case '-o':
            case '--output-folder-path':
                outputFolderPath = array[index + 1];
            break;
        }
    });

}

/**
 * Saves the neptune schema to file
 */
function saveNeptuneSchema() {
    // Output Neptune schema
    if (inputGraphDBSchema !== '') {
        if (outputNeptuneSchemaFile === '') {
            if (createUpdatePipelineName === '') {
                outputNeptuneSchemaFile = outputFolderPath + '/output.neptune.schema.json';
            } else {
                outputNeptuneSchemaFile = `${outputFolderPath}/${createUpdatePipelineName}.neptune.schema.json`;
            }
        }

        try {
            writeFileSync(outputNeptuneSchemaFile, inputGraphDBSchema);
            loggerInfo('Wrote Neptune schema to file: ' + yellow(outputNeptuneSchemaFile), {toConsole: true});
        } catch (err) {
            loggerError('Error writing Neptune schema to file: ' + yellow(outputNeptuneSchemaFile), err);
        }
    } else {
        loggerDebug('No neptune schema to save to file')
    }
}

function createOutputFolder() {
    // Init output folder
    mkdirSync(outputFolderPath, {recursive: true});
}

function validateArgs() {
    // TODO more argument validation
    if (queryClient !== 'http' && (createUpdateApolloServerSubgraph || createUpdateApolloServer)) {
        console.error(`Neptune querying using ${queryClient} is not yet supported for Apollo Server. Please use option --output-resolver-query-https.`);
        process.exit(1);
    }
}

async function main() {
    
    if (process.argv.length <= 2) {
        console.log("--h for help.\n");
        process.exit(0);
    }

    processArgs();
    // invalid args should fail early
    validateArgs();

    // Init the logger
    loggerInit(outputFolderPath, quiet, logLevel);
    loggerInfo('Starting neptune-for-graphql version: ' + version);
    loggerDebug('Input arguments: ' + process.argv);

    // Get graphDB schema from file
    if (inputGraphDBSchemaFile != '' && inputGraphQLSchema == '' && inputGraphQLSchemaFile == '') {
        try {
            inputGraphDBSchema = readFileSync(inputGraphDBSchemaFile, 'utf8');
            loggerInfo('Loaded graphDB schema from file: ' + yellow(inputGraphDBSchemaFile), {toConsole: true});
        } catch (err) {
            loggerError('Error reading graphDB schema file: ' + yellow(inputGraphDBSchemaFile), err);
            process.exit(1);
        }
    }


    let neptuneInfo;
    // Check if any of the Neptune endpoints are a neptune analytic endpoint and if so, set the neptuneType and IAM to required
    // only one of these endpoints are expected to be non-empty at the same time
    const nonEmptyEndpoints = [inputGraphDBSchemaNeptuneEndpoint, createUpdatePipelineEndpoint, inputCDKpipelineEndpoint].filter(endpoint => endpoint !== '');
    if (nonEmptyEndpoints.length > 0) {
        neptuneInfo = parseNeptuneEndpoint(nonEmptyEndpoints[0]);
        neptuneType = neptuneInfo.neptuneType;
        if (neptuneType === NEPTUNE_GRAPH) {
            // neptune analytics requires IAM
            loggerInfo("Detected neptune-graph from input endpoint - setting IAM auth to true as it is required for neptune analytics")
            isNeptuneIAMAuth = true;
        }
    }

    // Get Neptune schema from endpoint
    if (inputGraphDBSchemaNeptuneEndpoint != '' && inputGraphDBSchema == '' && inputGraphDBSchemaFile == '') {
        if (!neptuneInfo) {
            neptuneInfo = parseNeptuneEndpoint(inputGraphDBSchemaNeptuneEndpoint);
        }

        loggerInfo('Retrieving Neptune schema');
        loggerDebug('Getting Neptune schema from endpoint: ' + yellow(inputGraphDBSchemaNeptuneEndpoint), {toConsole: true});

        setGetNeptuneSchemaParameters(neptuneInfo);
        let startTime = performance.now();
        inputGraphDBSchema = await getNeptuneSchema();
        let endTime = performance.now();
        let executionTime = endTime - startTime;
        loggerInfo('Fetch neptune schema execution time: ' + (executionTime/1000).toFixed(2) + ' seconds', {toConsole: true});
    }

    createOutputFolder();
    // save the neptune schema early for troubleshooting purposes
    saveNeptuneSchema();

    // Option 2: inference GraphQL schema from graphDB schema
    if (inputGraphDBSchema != '' && inputGraphQLSchema == '' && inputGraphQLSchemaFile == '') {
        loggerInfo('Inferencing GraphQL schema from graphDB schema', {toConsole: true});
        inputGraphQLSchema = graphDBInferenceSchema(inputGraphDBSchema, outputSchemaMutations);
    }

    // Option 1: load
    if (inputGraphQLSchema == '' && inputGraphQLSchemaFile != '') {
        try {
            inputGraphQLSchema = readFileSync(inputGraphQLSchemaFile, 'utf8');
            loggerInfo('Loaded GraphQL schema from file: ' + yellow(inputGraphQLSchemaFile), {toConsole: true});
        } catch (err) {
            loggerError('Error reading GraphQL schema file: ' + yellow(inputGraphQLSchemaFile), err);
            process.exit(1);
        }    
    }

    // Changes
    if (inputGraphQLSchemaChangesFile != '') {
        try {
            inputGraphQLSchemaChanges = readFileSync(inputGraphQLSchemaChangesFile, 'utf8');
            loggerInfo('Loaded GraphQL schema changes from file: ' + yellow(inputGraphQLSchemaChangesFile), {toConsole: true});
        } catch (err) {
            loggerError('Error reading GraphQL schema changes file: ' + yellow(inputGraphQLSchemaChangesFile), err);
            process.exit(1);
        }    
    }

    // AWS pipeline
    if (createUpdatePipeline) {
        if (!inputGraphDBSchemaNeptuneEndpoint == '' && createUpdatePipelineEndpoint == '') {
            createUpdatePipelineEndpoint = inputGraphDBSchemaNeptuneEndpoint;
        }
        if (createUpdatePipelineEndpoint == '' &&
            createUpdatePipelineRegion == '' && createUpdatePipelineNeptuneDatabaseName == '') {
            loggerError('AWS pipeline: is required a Neptune endpoint, or a Neptune database name and region.');
            process.exit(1);
        }
        if (createUpdatePipelineEndpoint == '' &&
            !createUpdatePipelineRegion == '' && createUpdatePipelineNeptuneDatabaseName == '') {
            loggerError('AWS pipeline: a Neptune database name is required.');
            process.exit(1);
        }
        if (createUpdatePipelineEndpoint == '' &&
            createUpdatePipelineRegion == '' && !createUpdatePipelineNeptuneDatabaseName == '') {
            loggerError('AWS pipeline: a Neptune database region is required.');
            process.exit(1);
        }
        if (createUpdatePipelineEndpoint != '') {
            if (!neptuneInfo) {
                neptuneInfo = parseNeptuneEndpoint(createUpdatePipelineEndpoint);
            }
            createUpdatePipelineNeptuneDatabaseName = neptuneInfo.graphName;
            const parsedRegion = neptuneInfo.region;

            if (createUpdatePipelineRegion !== parsedRegion) {
                if (createUpdatePipelineRegion !== '') {
                    loggerInfo('Switching region from ' + createUpdatePipelineRegion + ' to region parsed from endpoint: ' + parsedRegion);
                } else {
                    loggerInfo('Region parsed from endpoint: ' + parsedRegion);
                }
                createUpdatePipelineRegion = parsedRegion;
            }
        }
        if (createUpdatePipelineName == '') {
            createUpdatePipelineName = createUpdatePipelineNeptuneDatabaseName;
        }
    }   

    // CDK
    if (inputCDKpipeline) {
        if (!inputGraphDBSchemaNeptuneEndpoint == '') {
            inputCDKpipelineEndpoint = inputGraphDBSchemaNeptuneEndpoint;
        }
        if (inputCDKpipelineEndpoint == '' &&
            inputCDKpipelineRegion == '' && inputCDKpipelineDatabaseName == '') {
            loggerError('AWS CDK: is required a Neptune endpoint, or a Neptune database name and region.');
            process.exit(1);
        }
        if (inputCDKpipelineEndpoint == '' &&
            !inputCDKpipelineRegion == '' && inputCDKpipelineDatabaseName == '') {
            loggerError('AWS CDK: a Neptune database name is required.');
            process.exit(1);
        }
        if (inputCDKpipelineEndpoint == '' &&
            inputCDKpipelineRegion == '' && !inputCDKpipelineDatabaseName == '') {
            loggerError('AWS CDK: a Neptune database region is required.');
            process.exit(1);
        }    
        if (inputCDKpipelineEndpoint != '') {
            if (!neptuneInfo) {
                neptuneInfo = parseNeptuneEndpoint(inputCDKpipelineEndpoint);
            }
            inputCDKpipelineDatabaseName = neptuneInfo.graphName;
            const parsedRegion = neptuneInfo.region;
            if (inputCDKpipelineRegion !== parsedRegion) {
                if (inputCDKpipelineRegion !== '') {
                    loggerInfo('Switching CDK region from ' + inputCDKpipelineRegion + ' to region parsed from endpoint: ' + parsedRegion);
                } else {
                    loggerInfo('Region parsed from CDK endpoint: ' + parsedRegion);
                }
                inputCDKpipelineRegion = parsedRegion;
            }
        }
        if (inputCDKpipelineName == '') {
            inputCDKpipelineName = inputCDKpipelineDatabaseName;
        }
    }

    // Apply changes
    if (inputGraphQLSchemaChanges != '') {
        inputGraphQLSchema = changeGraphQLSchema(inputGraphQLSchema, inputGraphQLSchemaChanges); 
    }

    if (inputGraphQLSchema != '') {
        // Parse schema
        schemaModel = schemaParser(inputGraphQLSchema);
        
        // Validate schema
        schemaModel = validatedSchemaModel(schemaModel, quiet);

        // Generate AWS Lambda resolver for AppSync and Amazon Neptune        
        outputLambdaResolver = resolverJS(schemaModel, queryLanguage, queryClient, __dirname);

        // Generate generic Javascript resolver
        outputJSResolver = resolverJS(schemaModel, queryLanguage, queryClient, __dirname);
    }

    // ****************************************************************************
    // Outputs
    // ****************************************************************************

    // Output GraphQL schema no directives
    if (inputGraphQLSchema != '') {
    
        outputSchema = schemaStringify(schemaModel, false);
        if ( outputSchemaFile == '' ) {
            if (createUpdatePipelineName == '') { 
                outputSchemaFile = outputFolderPath + '/output.schema.graphql';
            } else {
                outputSchemaFile = `${outputFolderPath}/${createUpdatePipelineName}.schema.graphql`;
            } 
        }

        try {
            writeFileSync(outputSchemaFile, outputSchema);
            loggerInfo('Wrote GraphQL schema to file: ' + yellow(outputSchemaFile), {toConsole: true});
        } catch (err) {
            loggerError('Error writing GraphQL schema to file: ' + yellow(outputSchemaFile), err);
        }


        // Output GraphQL schema with directives
        outputSourceSchema = schemaStringify(schemaModel, true);
        if ( outputSourceSchemaFile == '' ) {
            if (createUpdatePipelineName == '') { 
                outputSourceSchemaFile = outputFolderPath + '/output.source.schema.graphql';
            } else {
                outputSourceSchemaFile = `${outputFolderPath}/${createUpdatePipelineName}.source.schema.graphql`;
            } 
        }   

        try {
            writeFileSync(outputSourceSchemaFile, outputSourceSchema);
            loggerInfo('Wrote output GraphQL schema to file: ' + yellow(outputSourceSchemaFile), {toConsole: true});
        } catch (err) {
            loggerError('Error writing output GraphQL schema to file: ' + yellow(outputSourceSchemaFile), err);
        }

        // Output Lambda resolver
        if (outputLambdaResolverFile == '') { 
            outputLambdaResolverFile = outputFolderPath + '/output.resolver.graphql.js'; 
        }

        try {
            writeFileSync(outputLambdaResolverFile, outputLambdaResolver);
            loggerInfo('Wrote Lambda resolver to file: ' + yellow(outputLambdaResolverFile), {toConsole: true});
        } catch (err) {
            loggerError('Error writing Lambda resolver to file: ' + yellow(outputLambdaResolverFile), err);
        }


        // Output Javascript resolver
        if (outputJSResolverFile == '') {
            if (createUpdatePipelineName == '') { 
                outputJSResolverFile = outputFolderPath + '/output.resolver.graphql.js';
            } else {
                outputJSResolverFile = `${outputFolderPath}/${createUpdatePipelineName}.resolver.graphql.js`;
            } 
        }

        try {
            writeFileSync(outputJSResolverFile, outputJSResolver);
            loggerInfo('Wrote Javascript resolver to file: ' + yellow(outputJSResolverFile), {toConsole: true});
        } catch (err) {
            loggerError('Error writing Javascript resolver to file: ' + yellow(outputJSResolverFile), err);
        }


        // Output Lambda Zip file
        switch (queryClient) {
            case 'http':
                outputLambdaPackagePath = '/../templates/Lambda4AppSyncHTTP';
            break;
            case 'sdk':
                if (neptuneType === NEPTUNE_DB) {
                    outputLambdaPackagePath = '/../templates/Lambda4AppSyncSDK';
                } else {
                    outputLambdaPackagePath = '/../templates/Lambda4AppSyncGraphSDK';
                }
            break;
        }

        // output Apollo zip
        if (createUpdateApolloServer || createUpdateApolloServerSubgraph) {
            const apolloZipPath = path.join(outputFolderPath, `apollo-server-${neptuneInfo.graphName}-${new Date().getTime()}.zip`);
            try {
                if (!quiet) {
                    spinner = ora('Creating Apollo server ZIP file ...').start();
                }
                await createApolloDeploymentPackage({
                    zipFilePath: apolloZipPath,
                    resolverFilePath: outputLambdaResolverFile,
                    schemaFilePath: outputSchemaFile,
                    neptuneInfo: neptuneInfo,
                    isSubgraph: createUpdateApolloServerSubgraph
                });
                if (!quiet) {
                    spinner.succeed('Created Apollo server ZIP');
                }
                loggerInfo('Created Apollo server ZIP file: ' + yellow(apolloZipPath), {toConsole: true});
            } catch (err) {
                if (!quiet) {
                    spinner.fail();
                }
                loggerError('Error creating Apollo server ZIP file: ' + yellow(apolloZipPath), err);
            }
        }

        if  ( !(createUpdatePipeline || inputCDKpipeline) && createLambdaZip) {

            if (outputLambdaResolverZipFile == '' && outputLambdaResolverZipName == '')  
                outputLambdaResolverZipFile = outputFolderPath + '/output.lambda.zip';
            
            if (outputLambdaResolverZipFile == '' && outputLambdaResolverZipName != '')  
                outputLambdaResolverZipFile = outputFolderPath + '/' + outputLambdaResolverZipName + '.zip';

            try {
                if (!quiet) spinner = ora('Creating Lambda ZIP ...').start();
                await createLambdaDeploymentPackage({
                    outputZipFilePath: outputLambdaResolverZipFile,
                    templateFolderPath: path.join(__dirname, outputLambdaPackagePath),
                    resolverFilePath: outputLambdaResolverFile
                });
                if (!quiet) {
                    spinner.succeed('Created Lambda ZIP');
                }
                loggerInfo('Wrote Lambda ZIP file: ' + yellow(outputLambdaResolverZipFile), {toConsole: true});
            } catch (err) {
                loggerError('Error creating Lambda ZIP file: ' + yellow(outputLambdaResolverZipFile), err);
            }
           
        }


        // Create Update AWS Pipeline
        if (createUpdatePipeline) {
            try {
                if (!neptuneInfo) {
                    neptuneInfo = parseNeptuneEndpoint(createUpdatePipelineEndpoint);
                }
                let neptuneHost = neptuneInfo.host;
                let neptunePort = neptuneInfo.port;

                await createUpdateAWSpipeline(  createUpdatePipelineName, 
                                                createUpdatePipelineNeptuneDatabaseName, 
                                                createUpdatePipelineRegion,
                                                outputSchema,
                                                schemaModel,
                                                __dirname + outputLambdaPackagePath,
                                                outputSchemaMutations,
                                                quiet,
                                                __dirname,
                                                isNeptuneIAMAuth,
                                                neptuneHost,
                                                neptunePort,
                                                outputFolderPath,
                                                outputLambdaResolverFile,
                                                neptuneType );
            } catch (err) {
                loggerError('Error creating AWS pipeline', err);
            }
        }

        // Output CDK
        if (inputCDKpipeline) {
            try {
                loggerInfo('Creating CDK File', {toConsole: true});

                if (!neptuneInfo) {
                    neptuneInfo = parseNeptuneEndpoint(inputCDKpipelineEndpoint);
                }
                let neptuneHost = neptuneInfo.host;
                let neptunePort = neptuneInfo.port;
                
                if (inputCDKpipelineFile == '') {                
                    inputCDKpipelineFile = `${outputFolderPath}/${inputCDKpipelineName}-cdk.js`;
                }

                await createAWSpipelineCDK({
                    pipelineName: inputCDKpipelineName,
                    neptuneDBName: inputCDKpipelineDatabaseName,
                    neptuneDBregion: inputCDKpipelineRegion,
                    appSyncSchema: outputSchema,
                    schemaModel: schemaModel,
                    lambdaFilesPath: __dirname + outputLambdaPackagePath,
                    outputFile: inputCDKpipelineFile,
                    __dirname: __dirname,
                    quiet: quiet,
                    isNeptuneIAMAuth: isNeptuneIAMAuth,
                    neptuneHost: neptuneHost,
                    neptunePort: neptunePort,
                    outputFolderPath: outputFolderPath,
                    neptuneType: neptuneType
                });
            } catch (err) {
                loggerError('Error creating CDK File', err);
            }
        }

        loggerInfo('Done', {toConsole: true});
    }

    // Remove AWS Pipeline
    if ( removePipelineName != '') {
        loggerInfo('Removing pipeline AWS resources, name: ' + yellow(removePipelineName), {toConsole: true});
        let resourcesToRemove = null;
        let resourcesFile = `${outputFolderPath}/${removePipelineName}-resources.json`;
        loggerInfo('Using file: ' + yellow(resourcesFile), {toConsole: true});
        try {
            resourcesToRemove = readFileSync(resourcesFile, 'utf8');
        } catch (err) {
            loggerError('Error reading AWS pipeline resources file: ' + yellow(resourcesFile), err);
            process.exit(1);
        }
        await removeAWSpipelineResources(JSON.parse(resourcesToRemove), quiet);
    }
        
}


export { main };