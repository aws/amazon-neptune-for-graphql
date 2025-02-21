import {readJSONFile, testApolloArtifacts} from '../../testLib';
import fs from "fs";
import {parseNeptuneEndpoint} from "../../../src/util.js";

const testCase = readJSONFile('./test/TestCases/Case09/case01.json');
const testDbInfo = parseNeptuneEndpoint(testCase.host + ':' + testCase.port);

const outputFolderPath = './test/TestCases/Case09/output';
describe('Validate Apollo Server Subgraph output artifacts', () => {
    afterAll(async () => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    testApolloArtifacts(outputFolderPath, testDbInfo, true);
});