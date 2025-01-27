
import { jest } from '@jest/globals';
import { readJSONFile, checkOutputFilesSize, checkOutputFilesContent } from '../../testLib';

const casetest = readJSONFile('./test/TestCases/Case04/case.json');

checkOutputFilesSize('./test/TestCases/Case04/output', casetest.testOutputFilesSize, './test/TestCases/Case04/outputReference');

checkOutputFilesContent('./test/TestCases/Case04/output', casetest.testOutputFilesContent, './test/TestCases/Case04/outputReference');
