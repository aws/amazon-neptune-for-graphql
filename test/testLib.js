import axios from 'axios';
import fs, {readFileSync} from 'fs';
import AdmZip from 'adm-zip';
import gql from 'graphql-tag';
import path from 'path';

const HOST_PLACEHOLDER = '<AIR_ROUTES_DB_HOST>';
const PORT_PLACEHOLDER = '<AIR_ROUTES_DB_PORT>';

async function queryNeptune(q, language, host, port, param) {    
    try {
        let response = null;
        if (language == 'opencypher')
            response = await axios.post(`https://${host}:${port}/opencypher`, `query=${encodeURIComponent(q)}&parameters=${encodeURIComponent(JSON.stringify(param))}`);
        else             
            response = await axios.post(`https://${host}:${port}/gremlin`, `{"gremlin":"${q}"}`)

        return response.data;    
    } catch (error) {
        console.error("Http query request failed: ", error.message);            
    }
}

/**
 * Searches the given text for a placeholder text and if found replaces it with an environment variable value of the same name.
 * It is expected that the placeholder text is surrounded by angle brackets and the environment variable name is the placeholder text without the angle brackets.
 *
 * @param text the text to search and replace the placeholder
 * @param placeholder the placeholder text to search for
 * @returns text with replaced placeholder if found
 * @throws error if the placeholder text is found but the environment variable is not set
 */
function replacePlaceholderWithEnvironmentVariable(text, placeholder) {
    if (text.includes(placeholder)) {
        // remove angle brackets
        let envVarName = placeholder.replace(/[<>]/g, '');
        if (process.env[envVarName]) {
            return text.replaceAll(placeholder, process.env[envVarName]);
        }
        throw new Error('Expected environment variable ' + envVarName + ' is not set');
    }
    return text;
}

function readJSONFile(fileName) {
    let text = fs.readFileSync(fileName, 'utf8');
    text = replacePlaceholderWithEnvironmentVariable(text, HOST_PLACEHOLDER);
    text = replacePlaceholderWithEnvironmentVariable(text, PORT_PLACEHOLDER);
    return JSON.parse(text);
}

/**
 * Checks that a given folder contains expected files.
 * @param {string} folderPath the folder to check for files
 * @param {string[]} fileNames the names of the files that are expected to be in the given folder
 */
function checkFolderContainsFiles(folderPath, fileNames= []) {
    fileNames.forEach(fileName => {
        test(`File ${fileName} exists in output folder ${folderPath}`, async () => {
            const filePath = path.join(folderPath, fileName);
            expect(fs.existsSync(filePath)).toBe(true);
        });
    });
}

/**
 * Compares the contents of files which are expected to be the same
 * @param {object[]} files array of files to compare
 * @param {string} files.expected path to the file with expected content
 * @param {string} files.actual path to the file with actual content to compare with the associated expected file
 */
function compareFileContents(files = [{expected: '', actual: ''}]) {
    files.forEach(file => {
        const expectedStats = fs.readFileSync(file.expected, 'utf8');
        const actualStats = fs.readFileSync(file.actual, 'utf8');
        checkOutputFileContent(file, expectedStats, actualStats);
    });
}


function checkOutputFileContent(file, actual, expected, options = {}) {
    test(`File content: ${file}`, () => {
        const matchers = expect(actual);

        if (options.checkRefIntegrity ?? true) {
            matchers.toBe(expected);
        } else {
            matchers.toEqual(expected);
        }
    });
}


/**
 * Unzips the given zip file and checks that the lambda uses the aws sdk
 */
function checkOutputZipLambdaUsesSdk(outputFolder, zipFile) {
    const zip = new AdmZip(zipFile);
    const lambdaFile = 'index.mjs';
    zip.extractEntryTo(lambdaFile, outputFolder + '/unzip', true, true);

    const lambdaContent = fs.readFileSync(outputFolder + '/unzip/' + lambdaFile, 'utf8');
    test('Lambda uses SDK: ' + lambdaFile, async () => {
        expect(lambdaContent).toContain('@aws-sdk/client-neptune')
    });
}

function checkFileContains(outputFile, expectedContent = []) {
    const fileContent = fs.readFileSync(outputFile, 'utf8');
    expectedContent.forEach(expected => {
        test(outputFile + ' contains text ' + expected, async () => {
            expect(fileContent).toContain(expected);
        });
    })
}

/**
 * Unzips a given file and returns its contents.
 *
 * @param outputFolder the folder to unzip contents to
 * @param zipFile the file to unzip
 * @returns {string[]} array of file names that were extracted from the zip
 */
export function unzipAndGetContents(outputFolder, zipFile) {
    const zip = new AdmZip(zipFile);
    zip.extractAllTo(outputFolder, true);
    return fs.readdirSync(outputFolder);
}

async function loadResolver(file) {
    return await import(file);
}

async function testResolverQueriesResults(resolverFile, queriesReferenceFolder, schemaFile, host, port) {
    const resolverModule = await loadResolver(resolverFile);
    const schemaDataModelJSON = readFileSync(schemaFile, 'utf-8');
    let schemaModel = JSON.parse(schemaDataModelJSON);
    resolverModule.initSchema(schemaModel);
    const queryFiles = fs.readdirSync(queriesReferenceFolder);

    for (const queryFile of queryFiles) {
        const query = JSON.parse(fs.readFileSync(queriesReferenceFolder + "/" +queryFile));
        if (query.graphql) {
            const result = resolverModule.resolveGraphDBQuery({queryObjOrStr: gql(query.graphql)});
            const httpResult = await queryNeptune(result.query, result.language, host, port, result.parameters);
                
            let data = null;
            if (result.language === 'opencypher')
                data = httpResult.results[0][Object.keys(httpResult.results[0])[0]];
            else {
                const input = httpResult.result.data;
                data = JSON.parse(resolverModule.refactorGremlinqueryOutput(input, result.fieldsAlias));                                            
            }

            if (JSON.stringify(data, null, 2) !== JSON.stringify(query.result, null, 2))
                console.log(JSON.stringify(data, null, 2));
            
            test(`Resolver Neptune result, ${queryFile}: ${query.name}`, async () => {
                if (Object.keys(query.result).length === 1 && Array.isArray(Object.values(query.result)[0])) { 
                    // expected result is an object with a single field with an array value
                    const resultFieldName = Object.keys(query.result)[0];
                    expect(data[resultFieldName]).toEqual(expect.arrayContaining(query.result[resultFieldName]));
                } else { 
                    expect(data).toEqual(query.result);
                }
            });            
        }
    }
}

/**
 * Validates that an apollo zip contains the correct content.
 * 
 * @param {string} outputFolderPath the test output folder path that contains the apollo zip file to validate
 * @param {object} testDbInfo object that contains info about the neptune db/graph used to generate the apollo zip file
 * @param {string} testDbInfo.graphName neptune db/graph name
 * @param {string} testDbInfo.neptuneType neptune-db or neptune-graph
 * @param {string} testDbInfo.host neptune host
 * @param {int} testDbInfo.port neptune port
 * @param {string} testDbInfo.region neptune region
 * @param {boolean} subgraph true if the apollo zip contents should be for a subgraph
 * @returns {Promise<void>}
 */
async function testApolloArtifacts(outputFolderPath, testDbInfo, subgraph = false) {
    test('Validate Apollo zip contents', () => {
        const expectedFiles = [
            '.env',
            'index.mjs',
            'output.resolver.graphql.js',
            'output.resolver.schema.json',
            'package.json',
            'package-lock.json',
            'output.schema.graphql',
            'neptune.mjs',
            'queryHttpNeptune.mjs'
        ];

        const files = fs.readdirSync(outputFolderPath);
        const apolloZips = files.filter(file => file.startsWith(`apollo-server-${testDbInfo.graphName}-`) && file.endsWith('.zip'));
        expect(apolloZips.length).toEqual(1);

        const actualFiles = unzipAndGetContents(path.join(outputFolderPath, 'unzipped'), path.join(outputFolderPath, apolloZips[0]));
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());

        const expectedEnvContent = [
            `NEPTUNE_TYPE=${testDbInfo.neptuneType}`,
            `NEPTUNE_HOST=${testDbInfo.host}`,
            `NEPTUNE_PORT=${testDbInfo.port}`,
            `AWS_REGION=${testDbInfo.region}`,
            'LOGGING_ENABLED=false',
            `SUBGRAPH=${subgraph}`
        ];
        const actualEnvContent = fs.readFileSync(path.join(outputFolderPath, 'unzipped', '.env'), 'utf8');
        expect(actualEnvContent).toEqual(expectedEnvContent.join('\n'));
    });
}

export {
    checkFileContains,
    checkFolderContainsFiles,
    checkOutputFileContent,
    checkOutputZipLambdaUsesSdk,
    compareFileContents,
    loadResolver,
    readJSONFile,
    testApolloArtifacts,
    testResolverQueriesResults,
};
