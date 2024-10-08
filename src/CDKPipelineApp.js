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

import { getNeptuneClusterDbInfoBy } from './pipelineResources.js'
import { readFile, writeFile } from 'fs/promises';
//import semver from 'semver';
import fs from 'fs';
import archiver from 'archiver';
import ora from 'ora';
import { loggerError, loggerInfo } from "./logger.js";

let NAME = '';
let REGION = '';

let NEPTUNE_DB_NAME = '';
let NEPTUNE_HOST = null;
let NEPTUNE_PORT = null;
let NEPTUNE_DBSubnetGroup = null;
let NEPTUNE_IAM_POLICY_RESOURCE = '*';
let LAMBDA_ZIP_FILE = '';

let APPSYNC_SCHEMA = '';
let APPSYNC_ATTACH_QUERY = [];
let APPSYNC_ATTACH_MUTATION = [];
let SCHEMA_MODEL = null;
let thisOutputFolderPath = './output';
let msg = '';

function yellow(text) {
    return '\x1b[33m' + text + '\x1b[0m';
}

async function getSchemaFields(typeName) {
    /*  To be updated as:
            SCHEMA_MODEL.definitions
            .filter(def => def.kind === "ObjectTypeDefinition" && def.name.value === typeName)
            .flatMap(def => def.fields)
            .map(field => field.name.value)
    */
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


async function createDeploymentFile(folderPath, zipFilePath) {
    try {
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(output);
        archive.directory(folderPath, false);
        archive.file('./output/output.resolver.graphql.js', { name: 'output.resolver.graphql.js' })
        await archive.finalize();
    } catch (err) {
        loggerError('Creating deployment zip file: ' + err);
    }
}


async function createAWSpipelineCDK({
                                        pipelineName,
                                        neptuneDBName,
                                        neptuneDBregion,
                                        appSyncSchema,
                                        schemaModel,
                                        lambdaFilesPath,
                                        outputFile,
                                        __dirname,
                                        quiet,
                                        isNeptuneIAMAuth,
                                        neptuneHost,
                                        neptunePort,
                                        outputFolderPath,
                                        neptuneType
                                    }) {

    NAME = pipelineName;    
    REGION = neptuneDBregion;
    NEPTUNE_DB_NAME = neptuneDBName;
    APPSYNC_SCHEMA = appSyncSchema;
    SCHEMA_MODEL = schemaModel;
    NEPTUNE_HOST = neptuneHost;
    NEPTUNE_PORT = neptunePort;
    thisOutputFolderPath = outputFolderPath;

    LAMBDA_ZIP_FILE = `${thisOutputFolderPath}/${NAME}.zip`;
    let spinner = null;
    let neptuneClusterInfo = null;

    if (neptuneType === 'neptune-db') {
        try {
            loggerInfo('Get Neptune Cluster Info');
            if (!quiet) spinner = ora('Getting ...').start();
            neptuneClusterInfo = await getNeptuneClusterDbInfoBy(NEPTUNE_DB_NAME, REGION);
            if (!quiet) spinner.succeed('Got Neptune Cluster Info');
            if (isNeptuneIAMAuth) {
                if (!neptuneClusterInfo.isIAMauth) {
                    loggerError("The Neptune database authentication is set to VPC.");
                    loggerError("Remove the --output-aws-pipeline-cdk-neptune-IAM option.");
                    process.exit(1);
                }
            } else {
                if (neptuneClusterInfo.isIAMauth) {
                    loggerError("The Neptune database authentication is set to IAM.");
                    loggerError("Add the --output-aws-pipeline-cdk-neptune-IAM option.");
                    process.exit(1);
                } else {
                    loggerInfo(`Subnet Group: ` + neptuneClusterInfo.dbSubnetGroup);
                }
            }

            if (neptuneClusterInfo.version != '') {
                const v = neptuneClusterInfo.version;
                if (lambdaFilesPath.includes('SDK') == true && //semver.satisfies(v, '>=1.2.1.0') ) {
                    (v == '1.2.1.0' || v == '1.2.0.2' || v == '1.2.0.1' || v == '1.2.0.0' || v == '1.1.1.0' || v == '1.1.0.0')) {
                    loggerError("Neptune SDK query is supported starting with Neptune versions 1.2.1.0.R5");
                    loggerError("Switch to Neptune HTTPS query with option --output-resolver-query-https");
                    process.exit(1);
                }
            }

            NEPTUNE_HOST = neptuneClusterInfo.host;
            NEPTUNE_PORT = neptuneClusterInfo.port;
            NEPTUNE_DBSubnetGroup = neptuneClusterInfo.dbSubnetGroup.replace('default-', '');
            NEPTUNE_IAM_POLICY_RESOURCE = neptuneClusterInfo.iamPolicyResource;

        } catch (error) {
            msg = 'Error getting Neptune Cluster Info: ' + JSON.stringify(error);
            loggerError(msg);
            if (!quiet) spinner.fail("Error getting Neptune Cluster Info.");
            if (!isNeptuneIAMAuth) {
                spinner.clear();
                loggerError("VPC data is not available to proceed.");
                process.exit(1);
            } else {
                loggerInfo("Proceeding without getting Neptune Cluster info.");
            }
        }
    }
         
    if (!quiet) spinner = ora('Creating ZIP ...').start();
    await createDeploymentFile(lambdaFilesPath, LAMBDA_ZIP_FILE);
    if (!quiet) spinner.succeed('Created ZIP File: ' + yellow(LAMBDA_ZIP_FILE));
    
    APPSYNC_ATTACH_QUERY = await getSchemaFields('Query');
    APPSYNC_ATTACH_MUTATION = await getSchemaFields('Mutation');
    
    let CDKFile = await readFile(__dirname + '/../templates/CDKTemplate.js', 'utf8');

    CDKFile = CDKFile.replace( "const NAME = '';",                           `const NAME = '${NAME}';` );
    CDKFile = CDKFile.replace( "const REGION = '';",                         `const REGION = '${REGION}';` );
    CDKFile = CDKFile.replace( "const NEPTUNE_HOST = '';",                   `const NEPTUNE_HOST = '${NEPTUNE_HOST}';` );
    CDKFile = CDKFile.replace( "const NEPTUNE_PORT = '';",                   `const NEPTUNE_PORT = '${NEPTUNE_PORT}';` );
    CDKFile = CDKFile.replace( "const NEPTUNE_DB_NAME = '';",                `const NEPTUNE_DB_NAME = '${NEPTUNE_DB_NAME}';` );
    CDKFile = CDKFile.replace( "const NEPTUNE_DBSubnetGroup = null;",        `const NEPTUNE_DBSubnetGroup = '${NEPTUNE_DBSubnetGroup}';` );
    CDKFile = CDKFile.replace( "const NEPTUNE_IAM_AUTH = false;",            `const NEPTUNE_IAM_AUTH = ${isNeptuneIAMAuth};` );    
    CDKFile = CDKFile.replace( "const NEPTUNE_IAM_POLICY_RESOURCE = '*';",   `const NEPTUNE_IAM_POLICY_RESOURCE = '${NEPTUNE_IAM_POLICY_RESOURCE}';` );

    CDKFile = CDKFile.replace( "const LAMBDA_FUNCTION_NAME = '';",           `const LAMBDA_FUNCTION_NAME = '${NAME + 'LambdaFunction'}';` );
    CDKFile = CDKFile.replace( "const LAMBDA_ZIP_FILE = '';",                `const LAMBDA_ZIP_FILE = '${NAME}.zip';` );

    CDKFile = CDKFile.replace( "const APPSYNC_SCHEMA = '';",                 `const APPSYNC_SCHEMA = \`${APPSYNC_SCHEMA}\`;` );
    CDKFile = CDKFile.replace( "const APPSYNC_ATTACH_QUERY = [];",           `const APPSYNC_ATTACH_QUERY = JSON.parse(\`${JSON.stringify(APPSYNC_ATTACH_QUERY, null, 2)}\`);` );
    CDKFile = CDKFile.replace( "const APPSYNC_ATTACH_MUTATION = [];",        `const APPSYNC_ATTACH_MUTATION = JSON.parse(\`${JSON.stringify(APPSYNC_ATTACH_MUTATION, null, 2)}\`);` );

    if (!quiet) spinner = ora('Creating CDK File ...').start();
    await writeFile(outputFile, CDKFile);
    if (!quiet) spinner.succeed('Created CDK File: ' + yellow(outputFile));

}


export { createAWSpipelineCDK }