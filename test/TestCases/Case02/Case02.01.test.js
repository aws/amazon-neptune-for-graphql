
import { readJSONFile } from '../../testLib';
import { main } from "../../../src/main";
import fs from "fs";

const casetest = readJSONFile('./test/TestCases/Case02/case.json');

async function executeUtility() {    
    process.argv = casetest.argv;
    await main();
}

describe('Validate successful execution', () => {
    test('Execute utility: ' + casetest.argv.join(' '), async () => {
        expect(await executeUtility()).not.toBe(null);
    }, 600000);
});
