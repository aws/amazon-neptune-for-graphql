import { checkFolderContainsFiles, readJSONFile, testApolloArtifacts } from '../../testLib';
import fs from "fs";
import {parseNeptuneEndpoint} from "../../../src/util.js";

const testCase = readJSONFile('./test/TestCases/Case09/case01.json');
const testDbInfo = parseNeptuneEndpoint(testCase.host + ':' + testCase.port);

const outputFolderPath = './test/TestCases/Case09/output';
describe('Validate Apollo Server Subgraph output artifacts', () => {
    afterAll(() => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    checkFolderContainsFiles(outputFolderPath, [
        `${testDbInfo.graphName}.neptune.schema.json`,
        `${testDbInfo.graphName}.resolver.graphql.js`,
        `${testDbInfo.graphName}.resolver.schema.json.gz`,
        `${testDbInfo.graphName}.schema.graphql`,
        `${testDbInfo.graphName}.source.schema.graphql`
    ]);

    testApolloArtifacts(outputFolderPath, testDbInfo, true);
});