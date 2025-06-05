import { checkFolderContainsFiles, compareFileContents } from '../../testLib';
import path from "path";

describe('Validate output files', () => {
    const expectedFiles = [
        'output.resolver.graphql.js',
        'output.jsresolver.graphql.js',
        'output.resolver.schema.json',
        'output.schema.graphql',
        'output.source.schema.graphql'
    ];
    const outputFolder = './test/TestCases/Case01/output';
    checkFolderContainsFiles(outputFolder, expectedFiles);
    const referenceFolder = './test/TestCases/Case01/outputReference';
    compareFileContents([{
        expected: path.join(referenceFolder, 'output.schema.graphql'),
        actual: path.join(outputFolder, 'output.schema.graphql')
    }, {
        expected: path.join(referenceFolder, 'output.source.schema.graphql'),
        actual: path.join(outputFolder, 'output.source.schema.graphql')
    }]);
});