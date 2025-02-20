import {readJSONFile, testApolloArtifacts} from '../../testLib';
import fs from "fs";
import {parseNeptuneEndpoint} from "../../../src/util.js";

const testCase = readJSONFile('./test/TestCases/Case08/case03.json');
const testDbInfo = parseNeptuneEndpoint(testCase.host + ':' + testCase.port);
const outputFolderPath = './test/TestCases/Case08/case08-03-output';

describe('Validate Apollo Server output artifacts are created when using an input schema file', () => {
    afterAll(async () => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });
    
    testApolloArtifacts(outputFolderPath, testDbInfo, false);
});