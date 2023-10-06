
import axios from 'axios';
import fs  from 'fs';



async function queryNeptune(q, language, host, port) {    
    try {
        let response = null;
        if (language == 'opencypher')
            response = await axios.get(`https://${host}:${port}/opencypher?query=${encodeURIComponent(q)}`);
        else 
            //response = await axios.get(`https://${host}:${port}?gremlin=${encodeURIComponent(q)}`);
            response = await axios.post(`https://${host}:${port}/gremlin`, `{"gremlin":"${q}"}`)

        return response.data;    
    } catch (error) {
        console.error("Http query request failed: ", error.message);            
    }
}


function readJSONFile(fileName) {
    return JSON.parse(fs.readFileSync(fileName, 'utf8'));
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
            test('Resolver query: ' + query.name, async () => {    
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
            const httpResult = await queryNeptune(query.resolved, result.language, host, port);
                
            let data = null;
            if (result.language == 'opencypher')
                data = httpResult.results[0][Object.keys(httpResult.results[0])[0]];
            else {
                const input = httpResult.result.data;
                data = JSON.parse(resolverModule.refactorGremlinqueryOutput(input, result.fieldsAlias));                                            
            }
            
            test('Resolver Neptune result: ' + query.name, async () => {    
                expect(JSON.stringify(data, null, 2)).toBe(JSON.stringify(query.result, null, 2));
            });            
        }
    }
}


export { readJSONFile, checkOutputFilesSize, checkOutputFilesContent, testResolverQueries, testResolverQueriesResults };
