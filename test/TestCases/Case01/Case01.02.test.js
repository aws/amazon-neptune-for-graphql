import { readJSONFile, checkOutputFilesSize, checkOutputFilesContent, checkFolderContainsFiles } from '../../testLib';

const casetest = readJSONFile('./test/TestCases/Case01/case.json');

describe('Validate output files', () => {
    const expectedFiles = [
        'output.resolver.graphql.js',
        'output.jsresolver.graphql.js',
        'output.resolver.schema.json',
        'output.schema.graphql',
        'output.source.schema.graphql'
    ];
    checkFolderContainsFiles('./test/TestCases/Case01/output', expectedFiles);
    checkOutputFilesSize('./test/TestCases/Case01/output', casetest.testOutputFilesSize, './test/TestCases/Case01/outputReference');
    checkOutputFilesContent('./test/TestCases/Case01/output', casetest.testOutputFilesContent, './test/TestCases/Case01/outputReference');
});