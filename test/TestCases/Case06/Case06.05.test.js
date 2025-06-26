import { readJSONFile } from '../../testLib';
import { main } from "../../../src/main";

const casetest = readJSONFile('./test/TestCases/Case06/cdk-pipeline-no-name.json');

async function executeUtility() {    
    process.argv = casetest.argv;
    await main();
}

test('Execute utility: ' + casetest.argv.join(' '), async () => {
    expect(await executeUtility()).not.toBe(null);    
}, 600000);
