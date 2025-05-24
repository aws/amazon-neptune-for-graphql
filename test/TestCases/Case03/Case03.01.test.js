import { readJSONFile } from '../../testLib';
import { main } from "../../../src/main";
import fs from "fs";

const casetest = readJSONFile('./test/TestCases/Case03/case.json');

async function executeUtility() {    
    process.argv = casetest.argv;
    await main();
}

describe('Validate successful execution', () => {
    afterAll(async () => {
        fs.rmSync('./test/TestCases/Case03/output', {recursive: true});
    });

    test('Execute utility: ' + casetest.argv.join(' '), async () => {
        expect(await executeUtility()).not.toBe(null);
    }, 600000);
});
