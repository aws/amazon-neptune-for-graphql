import { checkFolderContainsFiles, executeAppSyncQuery, unzipAndGetContents } from '../../testLib';
import fs from "fs";
import path from "path";

const outputFolderPath = './test/TestCases/Case05/output';

describe('Validate pipeline with prefixes content', () => {
    checkFolderContainsFiles(outputFolderPath, [
        'AirportsJestPrefixTest.resolver.graphql.js',
        'AirportsJestPrefixTest.resolver.schema.json.gz',
        'AirportsJestPrefixTest-resources.json',
        'AirportsJestPrefixTest.schema.graphql',
        'AirportsJestPrefixTest.source.schema.graphql',
        'AirportsJestPrefixTest.zip'
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
        
        
        const unzippedFolder = path.join(outputFolderPath, 'unzipped');
        const actualFiles = unzipAndGetContents(unzippedFolder, path.join(outputFolderPath, 'AirportsJestPrefixTest.zip'));
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());
    });

    test('Can query app sync API successfully with prefixes', async () => {
        const awsResources = JSON.parse(fs.readFileSync(path.join(outputFolderPath, 'AirportsJestPrefixTest-resources.json'), 'utf8'));
        const apiId = awsResources.AppSyncAPI;
        const region = awsResources.region;
        const results = await executeAppSyncQuery(apiId, 'query {airportsQueryPrefix_getContinents {code}}', {}, region);
        const codes = results.data.airportsQueryPrefix_getContinents.map(continent => continent.code).sort();
        expect(codes).toEqual(['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA']);
    }, 600000);

    test('Can execute a create and delete mutation on app sync API successfully with prefix', async () => {
        const awsResources = JSON.parse(fs.readFileSync(path.join(outputFolderPath, 'AirportsJestPrefixTest-resources.json'), 'utf8'));
        const apiId = awsResources.AppSyncAPI;
        const region = awsResources.region;

        const mutation = `mutation {
            airportsMutationPrefix_createAirport(input: {
                code: "TEST"
            }) {
                _id
                code
            }
        }`;

        const results = await executeAppSyncQuery(apiId, mutation, {}, region);
        const createdCode = results.data.airportsMutationPrefix_createAirport.code;
        expect(createdCode).toBe("TEST");

        const deleteMutation = `mutation {airportsMutationPrefix_deleteAirport(_id: "${results.data.airportsMutationPrefix_createAirport._id}")}`;
        const deleteResults = await executeAppSyncQuery(apiId, deleteMutation, {}, region);
        const deleteResult = deleteResults.data.airportsMutationPrefix_deleteAirport;
        expect(deleteResult).toBe(true);
    }, 600000);
});
