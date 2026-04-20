import { checkFolderContainsFiles, compareFileContents } from '../../testLib';
import fs from "fs";
import path from "path";

const outputFolderPath = './test/TestCases/Case11/output';
const referenceFolderPath = './test/TestCases/Case11/outputReference';

describe('Validate output content', () => {
    afterAll(() => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    checkFolderContainsFiles(outputFolderPath, [
        'output.resolver.graphql.js',
        'output.resolver.schema.json.gz',
        'output.schema.graphql',
        'output.source.schema.graphql'
    ]);

    compareFileContents([{
        expected: path.join(referenceFolderPath, 'output.schema.graphql'),
        actual: path.join(outputFolderPath, 'output.schema.graphql')
    }, {
        expected: path.join(referenceFolderPath, 'output.source.schema.graphql'),
        actual: path.join(outputFolderPath, 'output.source.schema.graphql')
    }]);
});
