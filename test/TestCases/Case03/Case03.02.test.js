import { checkFolderContainsFiles } from '../../testLib';
import fs from "fs";

const outputFolderPath = './test/TestCases/Case03/output';

describe('Validate output content', () => {
    afterAll(async () => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });
    
    checkFolderContainsFiles(outputFolderPath, [
        'output.resolver.graphql.js',
        'output.resolver.schema.json',
        'output.schema.graphql',
        'output.source.schema.graphql'
    ]);
});
