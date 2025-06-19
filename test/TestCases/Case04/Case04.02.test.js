import { readJSONFile, checkOutputFileContent, checkFolderContainsFiles } from '../../testLib';
import { sortNeptuneSchema } from './util';
import fs from "fs";
import { parseNeptuneEndpoint } from "../../../src/util.js";

const casetest = readJSONFile('./test/TestCases/Case04/case.json');
const testDbInfo = parseNeptuneEndpoint(casetest.host + ':' + casetest.port);
const outputFolderPath = './test/TestCases/Case04/output';

const neptuneSchema = readJSONFile(`./test/TestCases/Case04/output/${testDbInfo.graphName}.output.neptune.schema.json`);
const refNeptuneSchema = readJSONFile(`./test/TestCases/Case04/outputReference/output.neptune.schema.json`);

describe('Validate output content', () => {
    afterAll(() => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    checkFolderContainsFiles(outputFolderPath, [
        `${testDbInfo.graphName}.output.resolver.graphql.js`,
        `${testDbInfo.graphName}.output.resolver.schema.json.gz`,
        `${testDbInfo.graphName}.output.schema.graphql`,
        `${testDbInfo.graphName}.output.source.schema.graphql`
    ]);

    // note that this test can be flaky depending on how the air routes sample data was loaded into neptune
    // for more consistent results, use neptune notebook %seed with gremlin language
    checkOutputFileContent(
    `${testDbInfo.graphName}.output.neptune.schema.json.gz`,
    sortNeptuneSchema(neptuneSchema),
    sortNeptuneSchema(refNeptuneSchema),
    { checkRefIntegrity: false }
    );
});
