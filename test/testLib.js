
import axios from 'axios';
import fs  from 'fs';
import AdmZip from 'adm-zip';

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


function readJSONFile(fileName) {
    let text = fs.readFileSync(fileName, 'utf8');
    text = text.replace('<AIR_ROUTES_DB_HOST>', process.env.AIR_ROUTES_DB_HOST);
    text = text.replace('<AIR_ROUTES_DB_PORT>', process.env.AIR_ROUTES_DB_PORT);
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
        test('File content: ' + file, async () => {            
            expect(stats).toBe(referenceStats);
        });
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

async function loadResolver(file) {
    return await import(file);
}


async function testResolverQueries(resolverFile, queriesReferenceFolder) {
    const resolverModule = await loadResolver(resolverFile);    
    const queryFiles = fs.readdirSync(queriesReferenceFolder);
    for (const queryFile of queryFiles) {        
        const query = JSON.parse(fs.readFileSync(queriesReferenceFolder + "/" + queryFile));
        if (query.graphql != "") {            
            const result = resolverModule.resolveGraphDBQuery(query.graphql);
            
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
            const result = resolverModule.resolveGraphDBQuery(query.graphql);
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
                expect(JSON.stringify(data, null, 2)).toBe(JSON.stringify(query.result, null, 2));
            });            
        }
    }
}


export { readJSONFile, checkOutputFilesSize, checkOutputFilesContent, testResolverQueries, testResolverQueriesResults, checkOutputZipLambdaUsesSdk };
