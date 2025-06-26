import {readJSONFile, testApolloArtifacts} from '../../testLib';
import fs from "fs";
import {parseNeptuneEndpoint} from "../../../src/util.js";

const testCase = readJSONFile('./test/TestCases/Case09/apollo-subgraph-input-schema.json');
const testDbInfo = parseNeptuneEndpoint(testCase.host + ':' + testCase.port);
const outputFolderPath = './test/TestCases/Case09/apollo-subgraph-input-schema-output';

describe('Validate Apollo Server Subgraph output artifacts are created when using an input schema file', () => {
    afterAll(async () => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });
    
    testApolloArtifacts(outputFolderPath, testDbInfo, true);
});