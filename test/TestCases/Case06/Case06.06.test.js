import { checkFolderContainsFiles, unzipAndGetContents } from '../../testLib';
import path from "path";
import { parseNeptuneEndpoint } from "../../../src/util.js";
import fs from "fs";

const outputFolderPath = './test/TestCases/Case06/case03-output';
const dbHost = process.env['AIR_ROUTES_DB_HOST'];
const dbPort = process.env['AIR_ROUTES_DB_PORT'];
const neptuneInfo = parseNeptuneEndpoint(`${dbHost}:${dbPort}`);
const graphName = neptuneInfo.graphName;
const zipFile = `${graphName}.zip`;

describe('Validate cdk pipeline without specified pipeline name', () => {
    afterAll(() => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    checkFolderContainsFiles(outputFolderPath, [
        `${graphName}.resolver.graphql.js`,
        `${graphName}.resolver.schema.json.gz`,
        `${graphName}.schema.graphql`,
        `${graphName}.source.schema.graphql`,
        `${graphName}-cdk.js`,
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
        const unzippedFolder = path.join(outputFolderPath, 'cdk-unzipped');
        const actualFiles = unzipAndGetContents(unzippedFolder, path.join(outputFolderPath, zipFile));
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());
    });
});
