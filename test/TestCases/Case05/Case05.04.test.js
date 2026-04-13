
import { jest } from '@jest/globals';
import { readJSONFile, getTestArgv } from '../../testLib';
import { main } from "../../../src/main";

const casetest = readJSONFile('./test/TestCases/Case05/pipeline-with-prefixes.json');

async function executeUtility() {    
    process.argv = getTestArgv(casetest);
    await main();
}

test('Execute utility: ' + casetest.argv.join(' '), async () => {
    expect(await executeUtility()).not.toBe(null);    
}, 600000);
