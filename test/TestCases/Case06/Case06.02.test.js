import { checkFileContains, checkFolderContainsFiles, readJSONFile, unzipAndGetContents } from '../../testLib';
import fs from "fs";
import path from "path";

const casetest = readJSONFile('./test/TestCases/Case06/case01.json');
let neptuneType = 'neptune-db';
if (casetest.host.includes('neptune-graph')) {
    neptuneType = 'neptune-graph';
}
const outputFolderPath = './test/TestCases/Case06/case01-output';

describe('Validate cdk pipeline with http resolver output content', () => {
    afterAll(() => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    checkFolderContainsFiles(outputFolderPath, [
        'AirportCDKTestJest.resolver.graphql.js',
        'AirportCDKTestJest.resolver.schema.json.gz',
        'AirportCDKTestJest.schema.graphql',
        'AirportCDKTestJest.source.schema.graphql',
        'AirportCDKTestJest-cdk.js',
        'AirportCDKTestJest.zip'
    ]);

    test('Zip file contains expected files', () => {
        const expectedFiles = [
            'index.mjs',
            'node_modules',
            'output.resolver.graphql.js',
            'output.resolver.schema.json.gz',
            'package-lock.json',
            'package.json',
            'queryHttpNeptune.mjs',
            'util.mjs'
        ];
        const unzippedFolder = path.join(outputFolderPath, 'cdk-unzipped');
        const actualFiles = unzipAndGetContents(unzippedFolder, path.join(outputFolderPath, 'AirportCDKTestJest.zip'));
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());
        
        // resolver should be using axios http client
        const fileContent = fs.readFileSync(path.join(unzippedFolder, 'index.mjs'), 'utf8');
        expect(fileContent).toContain('axios');
    });


    checkFileContains(path.join(outputFolderPath, 'AirportCDKTestJest-cdk.js'), [
        'const NAME = \'AirportCDKTestJest\';',
        'const NEPTUNE_HOST = \'' + casetest.host + '\';',
        'const NEPTUNE_PORT = \'' + casetest.port + '\';',
        'const NEPTUNE_TYPE = \'' + neptuneType + '\';',
        'vpcSubnets',
        'securityGroups'
    ]);
});
