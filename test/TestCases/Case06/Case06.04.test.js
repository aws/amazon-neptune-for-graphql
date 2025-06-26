import { checkFolderContainsFiles, unzipAndGetContents } from '../../testLib';
import fs from "fs";
import path from "path";

const outputFolderPath = './test/TestCases/Case06/cdk-pipeline-sdk-resolver-output';

describe('Validate cdk pipeline with sdk resolver output content', () => {
    afterAll(() => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    checkFolderContainsFiles(outputFolderPath, [
        'AirportCDKSDKTestJest.resolver.graphql.js',
        'AirportCDKSDKTestJest.resolver.schema.json.gz',
        'AirportCDKSDKTestJest.schema.graphql',
        'AirportCDKSDKTestJest.source.schema.graphql',
        'AirportCDKSDKTestJest-cdk.js',
        'AirportCDKSDKTestJest.zip'
    ]);

    test('Zip file contains expected files', () => {
        const expectedFiles = [
            'index.mjs',
            'node_modules',
            'output.resolver.graphql.js',
            'output.resolver.schema.json.gz',
            'package-lock.json',
            'package.json',
            'util.mjs'
        ];
        const unzippedFolder = path.join(outputFolderPath, 'cdk-unzipped');
        const actualFiles = unzipAndGetContents(unzippedFolder, path.join(outputFolderPath, 'AirportCDKSDKTestJest.zip'));
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());

        // resolver should be using aws sdk
        const fileContent = fs.readFileSync(path.join(unzippedFolder, 'index.mjs'), 'utf8');
        expect(fileContent).toContain('@aws-sdk/client-neptune');
    });
});
