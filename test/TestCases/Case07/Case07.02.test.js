import {checkOutputFilesContent, checkOutputFilesSize, checkOutputZipLambdaUsesSdk, readJSONFile} from '../../testLib';

const casetest = readJSONFile('./test/TestCases/Case07/case01.json');
checkOutputFilesSize('./test/TestCases/Case07/output', casetest.testOutputFilesSize, './test/TestCases/Case07/outputReference');
checkOutputFilesContent('./test/TestCases/Case07/output', casetest.testOutputFilesContent, './test/TestCases/Case07/outputReference');
checkOutputZipLambdaUsesSdk('./test/TestCases/Case07/output', './test/TestCases/Case07/output/AirportsJestSDKTest.zip');
