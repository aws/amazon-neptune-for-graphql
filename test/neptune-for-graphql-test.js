
const axios = require('axios');
const { exec } = require('child_process');
const vm  = require('vm');
const utils = require('util');
const fs = require('fs');
const graphql = require('graphql-tag');
const { Console } = require('console');
const async = require('async');


async function queryNeptune(q, host, port) {    
    try {
        const language ='opencypher';
        const response = await axios.get(`https://${host}:${port}/${language}?query=${encodeURIComponent(q)}`);        
        return response.data;    
    } catch (error) {
        console.error("Http query request failed: ", error.message);            
    }
}


async function testUtilitySchemaInputExecution(command) {
    const execute = utils.promisify(exec);

    const log = await execute(command);

    if (log.stdout.includes('Error')) {
        console.error("FAILD: Running the utility");
        console.error(log);
        return;     
    } else {
        console.log("PASSED: Running the utility");
    }
}


function checkOutputFilesSize(files, referenceFolder) {    
    files.forEach(file => {        
        const stats = fs.statSync(`./output/${file}`);
        const referenceStats = fs.statSync(`./${referenceFolder}/${file}`);
        if (stats.size != referenceStats) {
            console.log(`PASSED: File ${file} size`);
        } else {
            console.error(`FAILED: File ${file} size`);
        }        
    });
}


function checkOutputFilesContent(files, referenceFolder) {    
    files.forEach(file => {        
        const stats = fs.readFileSync(`./output/${file}`, 'utf8');
        const referenceStats = fs.readFileSync(`./${referenceFolder}/${file}`, 'utf8');
        if (stats == referenceStats) {
            console.log(`PASSED: File ${file} content`);
        } else {
            console.error(`FAILED: File ${file} content`);
        }        
    });
}


async function testResolver(codeFile, queriesReferenceFolder, testNeptuneResult, host, port) {
    let code = fs.readFileSync(codeFile, 'utf8');
    code = code.replace("module.exports = { resolveGraphDBQueryFromAppSyncEvent, resolveGraphDBQueryFromApolloQueryEvent, resolveGraphDBQuery, refactorGremlinqueryOutput };", "" );
    const context = {require, graphql, console};
    vm.createContext(context);
    vm.runInNewContext(code, context);
    
    const queryFiles = fs.readdirSync(queriesReferenceFolder);

    for (const queryFile of queryFiles) {
        const query = JSON.parse(fs.readFileSync(queriesReferenceFolder + "/" +queryFile));
        if (query.graphql != "") {
            const result = context.resolveGraphDBQuery(query.graphql);
            if (result.query == query.resolved) {
                console.log(`PASSED: Resolved query: ${queryFile}`);
                
                if (testNeptuneResult) {
                    const httpResult = await queryNeptune(query.resolved, host, port);
                    const data = httpResult.results[0][Object.keys(httpResult.results[0])[0]];
                    if (JSON.stringify(data, null, 2) == JSON.stringify(query.result, null, 2))
                        console.log(`PASSED: Neptune result query: ${queryFile}`);
                    else
                        console.error(`FAILED: Neptune result query: ${queryFile}`);
                }

            }
            else 
                console.error(`FAILED: Resolving query: ${queryFile}, name: ${query.name}`);
        }
    }
}


async function runTestCase(testCaseFolder) {     
    const testCase = JSON.parse(fs.readFileSync(testCaseFolder + '/case.json', 'utf8'));
    console.log(`Running test case: ${testCase.name}`);

    await testUtilitySchemaInputExecution(testCase.utilityCommand);

    checkOutputFilesSize(testCase.testOutputFilesSize, testCaseFolder + '/output');
    
    checkOutputFilesContent(testCase.testOutputFilesContent, testCaseFolder + '/output');

    await testResolver('./output/output.resolver.graphql.js', testCaseFolder + '/queries', true, testCase.host, testCase.port);
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