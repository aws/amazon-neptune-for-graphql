
import { jest } from '@jest/globals';
import { readJSONFile, checkOutputFileContent, checkOutputFilesSize } from '../../testLib';
import { sortNeptuneSchema } from './util';

const casetest = readJSONFile('./test/TestCases/Case04/case.json');

checkOutputFilesSize('./test/TestCases/Case04/output', casetest.testOutputFilesSize, './test/TestCases/Case04/outputReference');

const neptuneSchema = readJSONFile('./test/TestCases/Case04/output/output.neptune.schema.json');
const refNeptuneSchema = readJSONFile('./test/TestCases/Case04/outputReference/output.neptune.schema.json');

checkOutputFileContent(
    'output.neptune.schema.json',
    sortNeptuneSchema(neptuneSchema),
    sortNeptuneSchema(refNeptuneSchema),
    { checkRefIntegrity: false }
);
