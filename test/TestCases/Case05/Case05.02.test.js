import { checkFolderContainsFiles, unzipAndGetContents } from '../../testLib';
import fs from "fs";
import path from "path";

const outputFolderPath = './test/TestCases/Case05/output';

describe('Validate pipeline with http resolver output content', () => {
    checkFolderContainsFiles(outputFolderPath, [
        'AirportsJestTest.resolver.graphql.js',
        'AirportsJestTest.resolver.schema.json',
        'AirportsJestTest-resources.json',
        'AirportsJestTest.schema.graphql',
        'AirportsJestTest.source.schema.graphql',
        'AirportsJestTest.zip'
    ]);

    test('Zip file contains expected files', () => {
        const expectedFiles = [
            'index.mjs',
            'node_modules',
            'output.resolver.graphql.js',
            'output.resolver.schema.json',
            'package-lock.json',
            'package.json',
            'queryHttpNeptune.mjs'
        ];
        
        
        const unzippedFolder = path.join(outputFolderPath, 'unzipped');
        const actualFiles = unzipAndGetContents(unzippedFolder, path.join(outputFolderPath, 'AirportsJestTest.zip'));
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());

        // resolver should be using axios http client
        const fileContent = fs.readFileSync(path.join(unzippedFolder, 'index.mjs'), 'utf8');
        expect(fileContent).toContain('axios');
    });
});
