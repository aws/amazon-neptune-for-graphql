import {checkFolderContainsFiles, checkOutputFilesContent, checkOutputZipLambdaUsesSdk, readJSONFile} from '../../testLib';

describe('Validate output files', () => {
    const casetest = readJSONFile('./test/TestCases/Case07/case01.json');
    const expectedFiles = [
        'AirportsJestSDKTest.resolver.schema.json',
        'AirportsJestSDKTest.zip',
        'AirportsJestSDKTest-resources.json',
        'output.resolver.graphql.js',
        'output.schema.graphql',
        'output.source.schema.graphql'
    ];
    checkFolderContainsFiles('./test/TestCases/Case07/output', expectedFiles);
    checkOutputFilesContent('./test/TestCases/Case07/output', casetest.testOutputFilesContent, './test/TestCases/Case07/outputReference');
    checkOutputZipLambdaUsesSdk('./test/TestCases/Case07/output', './test/TestCases/Case07/output/AirportsJestSDKTest.zip');
});