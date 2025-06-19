import { checkFolderContainsFiles, compareFileContents, executeAppSyncQuery, unzipAndGetContents } from '../../testLib';
import path from "path";
import fs from "fs";

const outputFolderPath = './test/TestCases/Case07/output';
const referenceFolder = './test/TestCases/Case07/outputReference';

describe('Validate pipeline with sdk resolver output content', () => {
    const expectedFiles = [
        'AirportsJestSDKTest.resolver.schema.json.gz',
        'AirportsJestSDKTest.zip',
        'AirportsJestSDKTest-resources.json',
        'sdk.resolver.graphql.js',
        'sdk.schema.graphql',
        'sdk.source.schema.graphql'
    ];
    checkFolderContainsFiles(outputFolderPath, expectedFiles);
    compareFileContents([{
        expected: path.join(referenceFolder, 'output.schema.graphql'),
        actual: path.join(outputFolderPath, 'sdk.schema.graphql')
    }, {
        expected: path.join(referenceFolder, 'output.source.schema.graphql'),
        actual: path.join(outputFolderPath, 'sdk.source.schema.graphql')
    }]);
    
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


        const unzippedFolder = path.join(outputFolderPath, 'unzipped');
        const actualFiles = unzipAndGetContents(unzippedFolder, path.join(outputFolderPath, 'AirportsJestSDKTest.zip'));
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());

        // resolver should be using aws sdk
        const fileContent = fs.readFileSync(path.join(unzippedFolder, 'index.mjs'), 'utf8');
        expect(fileContent).toContain('@aws-sdk/client-neptune');
    });

    test('Can query app sync API successfully', async () => {
        const awsResources = JSON.parse(fs.readFileSync(path.join(outputFolderPath, 'AirportsJestSDKTest-resources.json'), 'utf8'));
        const apiId = awsResources.AppSyncAPI;
        const region = awsResources.region;
        const results = await executeAppSyncQuery(apiId, 'query {getNodeContinents {code}}', {}, region);
        const codes = results.data.getNodeContinents.map(continent => continent.code).sort();
        expect(codes).toEqual(['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA']);
    }, 600000);
});