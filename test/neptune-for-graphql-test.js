
import axios from 'axios';
import { exec } from 'child_process';
import utils from 'util';
import fs  from 'fs';
import ora from 'ora';

let spinner = null;

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


async function testUtilitySchemaInputExecution(command) {
    const execute = utils.promisify(exec);

    const log = await execute(command);

    if (log.stdout.includes('Error')) {        
        spinner.fail("FAILD: Running the utility");
        console.error(log);
        return;     
    } else {        
        spinner.succeed("PASSED: Running the utility");
    }
}


function checkOutputFilesSize(files, referenceFolder) {    
    files.forEach(file => {
        spinner.start(`Checking file ${file} size`);        
        const stats = fs.statSync(`./output/${file}`);
        const referenceStats = fs.statSync(`./${referenceFolder}/${file}`);
        if (stats.size == referenceStats.size)            
            spinner.succeed(`PASSED: File ${file} size`);
         else             
            spinner.fail(`FAILED: File ${file} size`);
                
    });
}


function checkOutputFilesContent(files, referenceFolder) {    
    files.forEach(file => {
        spinner.start(`Checking file ${file} content`);        
        const stats = fs.readFileSync(`./output/${file}`, 'utf8');
        const referenceStats = fs.readFileSync(`./${referenceFolder}/${file}`, 'utf8');
        if (stats == referenceStats)            
            spinner.succeed(`PASSED: File ${file} content`);
         else             
            spinner.fail(`FAILED: File ${file} content`);
    });
}

async function loadResolver() {
    return await import('./output/output.resolver.graphql.cjs');
}


async function testResolver(queriesReferenceFolder, testNeptuneResult, host, port) {
    const resolverModule = await loadResolver();
    
    const queryFiles = fs.readdirSync(queriesReferenceFolder);

    for (const queryFile of queryFiles) {
        const query = JSON.parse(fs.readFileSync(queriesReferenceFolder + "/" +queryFile));
        if (query.graphql != "") {
            const result = resolverModule.resolveGraphDBQuery(query.graphql);
            spinner.start(`Checking query: ${query.name}`);
            if (result.query == query.resolved) {                
                spinner.succeed(`PASSED: Resolved query: ${query.name}`);
                
                if (testNeptuneResult) {
                    spinner.start(`Checking Neptune result query: ${query.name}`);
                    const httpResult = await queryNeptune(query.resolved, result.language, host, port);
                    
                    let data = null;
                    if (result.language == 'opencypher')
                        data = httpResult.results[0][Object.keys(httpResult.results[0])[0]];
                    else {
                        const input = httpResult.result.data;
                        data = JSON.parse(resolverModule.refactorGremlinqueryOutput(input, result.fieldsAlias));                                            
                    }
                    
                    if (JSON.stringify(data, null, 2) == JSON.stringify(query.result, null, 2))                        
                        spinner.succeed(`PASSED: Neptune result query: ${query.name}`);
                    else {                       
                        spinner.fail(`FAILED: Neptune result query: ${queryFile}, ${query.name}`);
                        console.log(JSON.stringify(data, null, 2));
                    }
                }

            }
            else {
                spinner.fail(`FAILED: Resolving query: ${queryFile}, name: ${query.name}`);
                console.log(result.query);
            }
        }
    }
}


async function runTestCase(testCaseFolder) {     
    const testCase = JSON.parse(fs.readFileSync(testCaseFolder + '/case.json', 'utf8'));
    console.log(`Running test case: ${testCase.name}`);

    //console.log(`Running utility: ${testCase.utilityCommand}`);
    spinner = ora(`Running utility: ${testCase.utilityCommand}`).start()
    await testUtilitySchemaInputExecution(testCase.utilityCommand);

    checkOutputFilesSize(testCase.testOutputFilesSize, testCaseFolder + '/output');
    
    checkOutputFilesContent(testCase.testOutputFilesContent, testCaseFolder + '/output');

    await testResolver(testCaseFolder + '/queries', true, testCase.host, testCase.port);
}


async function runAllTestCases(testCasesFolder) {
    const testCases = fs.readdirSync(testCasesFolder);
    for (const testCase of testCases) {
        await runTestCase(testCasesFolder + "/" + testCase);
        console.log("------------------------------------------------------------------------------------");
    }
}


async function main() {
    await runAllTestCases('./TestCases');
}


main();