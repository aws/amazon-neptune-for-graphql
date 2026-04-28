import { readJSONFile } from '../../testLib';
import { main } from "../../../src/main";

const casetest = readJSONFile('./test/TestCases/Case11/case.json');

async function executeUtility() {    
    process.argv = casetest.argv;
    await main();
}

describe('Validate successful execution', () => {
    test('Execute utility: ' + casetest.argv.join(' '), async () => {
        await expect(executeUtility()).resolves.not.toThrow();
    }, 600000);
});
