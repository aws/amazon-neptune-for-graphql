
import axios from 'axios';
import fs  from 'fs';
import AdmZip from 'adm-zip';
import gql from 'graphql-tag';

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


function checkOutputFilesSize(outputFolder, files, referenceFolder) {    
    files.forEach(file => {        
        const stats = fs.statSync(`${outputFolder}/${file}`);
        const referenceStats = fs.statSync(`${referenceFolder}/${file}`);
        test('File size: ' + file, async () => {
            expect.assertions(1);
            expect(stats.size).toBe(referenceStats.size);
        });
    });
}


function checkOutputFilesContent(outputFolder, files, referenceFolder) {    
    files.forEach(file => {        
        const stats = fs.readFileSync(`${outputFolder}/${file}`, 'utf8');
        const referenceStats = fs.readFileSync(`${referenceFolder}/${file}`, 'utf8');        
        checkOutputFileContent(file, stats, referenceStats);
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


async function testResolverQueries(resolverFile, queriesReferenceFolder) {
    const resolverModule = await loadResolver(resolverFile);    
    const queryFiles = fs.readdirSync(queriesReferenceFolder);
    for (const queryFile of queryFiles) {        
        const query = JSON.parse(fs.readFileSync(queriesReferenceFolder + "/" + queryFile));
        if (query.graphql != "") {            
            const result = resolverModule.resolveGraphDBQuery(gql(query.graphql));
            
            if (result.query != query.resolved || JSON.stringify(result.parameters, null, 2) != JSON.stringify(query.parameters, null, 2) )
                console.log(JSON.stringify(result.parameters, null, 2) + '\n' + result.query)
            
            test(`Resolver query, ${queryFile}: ${query.name}`, async () => { 
                expect(JSON.stringify(result.parameters, null, 2)).toBe(JSON.stringify(query.parameters, null, 2));   
                expect(result.query).toBe(query.resolved);
            });
        }
    }
}


async function testResolverQueriesResults(resolverFile, queriesReferenceFolder, host, port) {
    const resolverModule = await loadResolver(resolverFile);
    
    const queryFiles = fs.readdirSync(queriesReferenceFolder);

    for (const queryFile of queryFiles) {
        const query = JSON.parse(fs.readFileSync(queriesReferenceFolder + "/" +queryFile));
        if (query.graphql != "") {
            const result = resolverModule.resolveGraphDBQuery(gql(query.graphql));
            const httpResult = await queryNeptune(query.resolved, result.language, host, port, result.parameters);
                
            let data = null;
            if (result.language == 'opencypher')
                data = httpResult.results[0][Object.keys(httpResult.results[0])[0]];
            else {
                const input = httpResult.result.data;
                data = JSON.parse(resolverModule.refactorGremlinqueryOutput(input, result.fieldsAlias));                                            
            }

            if (JSON.stringify(data, null, 2) != JSON.stringify(query.result, null, 2))
                console.log(JSON.stringify(data, null, 2));
            
            test(`Resolver Neptune result, ${queryFile}: ${query.name}`, async () => {    
                expect(data).toEqual(query.result);
            });            
        }
    }
}


export {
    checkFileContains,
    checkOutputFileContent,
    checkOutputFilesContent,
    checkOutputFilesSize,
    checkOutputZipLambdaUsesSdk,
    loadResolver,
    readJSONFile,
    testResolverQueries,
    testResolverQueriesResults,
};
