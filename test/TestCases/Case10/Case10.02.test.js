import { checkFolderContainsFiles, unzipAndGetContents } from '../../testLib';
import path from "path";
import { parseNeptuneEndpoint } from "../../../src/util.js";
import fs from "fs";

const outputFolderPath = './test/TestCases/Case10/pipeline-no-name-output';
const dbHost = process.env['AIR_ROUTES_DB_HOST'];
const dbPort = process.env['AIR_ROUTES_DB_PORT'];
const neptuneInfo = parseNeptuneEndpoint(`${dbHost}:${dbPort}`);
const graphName = neptuneInfo.graphName;

describe('Validate pipeline output files created without specifying pipeline name', () => {
    afterAll(async () => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    // db graph name should be used to prefix the output files if the user didn't specify a pipeline name
    const zipFile = `${graphName}.lambda.zip`;
    checkFolderContainsFiles(outputFolderPath, [
        `${graphName}.resolver.graphql.js`,
        `${graphName}.resolver.schema.json.gz`,
        `${graphName}.schema.graphql`,
        `${graphName}.source.schema.graphql`,
        zipFile
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
        const actualFiles = unzipAndGetContents(unzippedFolder, path.join(outputFolderPath, zipFile));
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());
    });
});
