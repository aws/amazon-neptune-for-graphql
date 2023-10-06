
import { jest } from '@jest/globals';
import { readJSONFile, checkOutputFilesSize, checkOutputFilesContent } from '../../testLib';

const casetest = readJSONFile('./test/TestCases/Case01/case.json');

checkOutputFilesSize('./test/TestCases/Case01/output', casetest.testOutputFilesSize, './test/TestCases/Case01/outputReference');

checkOutputFilesContent('./test/TestCases/Case01/output', casetest.testOutputFilesContent, './test/TestCases/Case01/outputReference');