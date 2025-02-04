import {readJSONFile, unzipAndGetContents} from '../../testLib';
import fs from "fs";
import {parseNeptuneEndpoint} from "../../../src/util.js";

const testCase = readJSONFile('./test/TestCases/Case08/case02.json');
const testDbInfo = parseNeptuneEndpoint(testCase.host + ':' + testCase.port);

describe('Validate Apollo Server output artifacts are created when using customized output arguments', () => {

    afterAll(async () => {
        fs.rmSync('./test/TestCases/Case08/case08-02-output', {recursive: true});
    });

    // the zip contents should be the same regardless of the customized output arguments
    test('Validate zip contents', () => {
        const expectedFiles = [
            '.env',
            'index.mjs',
            'output.resolver.graphql.js',
            'package.json',
            'package-lock.json',
            'schema.graphql',
            'neptune.mjs',
            'queryHttpNeptune.mjs'
        ];

        const files = fs.readdirSync('./test/TestCases/Case08/case08-02-output');
        const apolloZips = files.filter(file => file.startsWith(`apollo-server-${testDbInfo.graphName}-`) && file.endsWith('.zip'));
        expect(apolloZips.length).toEqual(1);

        const actualFiles = unzipAndGetContents('./test/TestCases/Case08/case08-02-output/unzipped', `./test/TestCases/Case08/case08-02-output/${apolloZips[0]}`);
        expect(actualFiles.toSorted()).toEqual(expectedFiles.toSorted());
    });

    // the .env values should be the same regardless of the customized output arguments
    test('Validate .env values', () => {
        const expectedContent = [
            `NEPTUNE_TYPE=${testDbInfo.neptuneType}`,
            `NEPTUNE_HOST=${testCase.host}`,
            `NEPTUNE_PORT=${testCase.port}`,
            `AWS_REGION=${testDbInfo.region}`,
            'LOGGING_ENABLED=false',
            'SUBGRAPH=false'
        ];
        const actualContent = fs.readFileSync('./test/TestCases/Case08/case08-02-output/unzipped/.env', 'utf8');
        expect(actualContent).toEqual(expectedContent.join('\n'));
    });

});