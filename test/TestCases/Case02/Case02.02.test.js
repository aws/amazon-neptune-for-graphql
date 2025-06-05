import { checkFolderContainsFiles } from '../../testLib';
import fs from "fs";

const outputFolderPath = './test/TestCases/Case02/output';

describe('Validate output content', () => {
    afterAll(async () => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });
    
    checkFolderContainsFiles(outputFolderPath, [
        'output.jsresolver.graphql.js',
        'output.neptune.schema.json',
        'output.resolver.graphql.js',
        'output.resolver.schema.json',
        'output.schema.graphql',
        'output.source.schema.graphql'
    ]);
});
