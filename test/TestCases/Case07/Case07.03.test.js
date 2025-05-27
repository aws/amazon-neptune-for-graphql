import { readJSONFile } from '../../testLib';
import { main } from "../../../src/main";
import fs from "fs";

const casetest = readJSONFile('./test/TestCases/Case07/case02.json');

async function executeUtility() {    
    process.argv = casetest.argv;
    await main();
}
describe('Cleanup resources', () => {
    afterAll(async () => {
        fs.rmSync('./test/TestCases/Case07/output', {recursive: true});
    });
    
    test('Execute utility: ' + casetest.argv.join(' '), async () => {
        expect(await executeUtility()).not.toBe(null);
    }, 600000);    
});
