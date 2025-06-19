import { checkFolderContainsFiles } from '../../testLib';
import fs from "fs";

const outputFolderPath = './test/TestCases/Case03/output';

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
});
