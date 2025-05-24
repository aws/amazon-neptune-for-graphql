import { readJSONFile, checkOutputFileContent, checkOutputFilesSize } from '../../testLib';
import { sortNeptuneSchema } from './util';
import fs from "fs";

const casetest = readJSONFile('./test/TestCases/Case04/case.json');

checkOutputFilesSize('./test/TestCases/Case04/output', casetest.testOutputFilesSize, './test/TestCases/Case04/outputReference');

const neptuneSchema = readJSONFile('./test/TestCases/Case04/output/output.neptune.schema.json');
const refNeptuneSchema = readJSONFile('./test/TestCases/Case04/outputReference/output.neptune.schema.json');

describe('Validate neptune schema', () => {
    afterAll(async () => {
        fs.rmSync('./test/TestCases/Case04/output', {recursive: true});
    });

    // note that this test can be flaky depending on how the air routes sample data was loaded into neptune
    // for more consistent results, use neptune notebook %seed with gremlin language
    checkOutputFileContent(
    'output.neptune.schema.json',
    sortNeptuneSchema(neptuneSchema),
    sortNeptuneSchema(refNeptuneSchema),
    { checkRefIntegrity: false }
    );
});
