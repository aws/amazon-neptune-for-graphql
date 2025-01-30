
import { jest } from '@jest/globals';
import { readJSONFile, checkOutputFilesSize } from '../../testLib';

const casetest = readJSONFile('./test/TestCases/Case03/case.json');

checkOutputFilesSize('./test/TestCases/Case03/output', casetest.testOutputFilesSize, './test/TestCases/Case03/outputReference');
