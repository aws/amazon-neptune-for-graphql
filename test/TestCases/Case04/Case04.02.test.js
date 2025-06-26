import { readJSONFile, checkOutputFileContent, checkFolderContainsFiles } from '../../testLib';
import { sortNeptuneSchema } from './util';
import fs from "fs";
import { parseNeptuneEndpoint } from "../../../src/util.js";

const casetest = readJSONFile('./test/TestCases/Case04/case.json');
const testDbInfo = parseNeptuneEndpoint(casetest.host + ':' + casetest.port);
const outputFolderPath = './test/TestCases/Case04/output';

const schemaFile = `${testDbInfo.graphName}.neptune.schema.json`;
const neptuneSchema = readJSONFile(`./test/TestCases/Case04/output/${schemaFile}`);
const refSchemaFile = `output.neptune.${testDbInfo.neptuneType.replace('neptune-', '')}.schema.json`;
const refNeptuneSchema = readJSONFile(`./test/TestCases/Case04/outputReference/${refSchemaFile}`);

describe('Validate output content', () => {
    afterAll(() => {
        fs.rmSync(outputFolderPath, {recursive: true});
    });

    checkFolderContainsFiles(outputFolderPath, [
        `${testDbInfo.graphName}.resolver.graphql.js`,
        `${testDbInfo.graphName}.resolver.schema.json.gz`,
        `${testDbInfo.graphName}.schema.graphql`,
        `${testDbInfo.graphName}.source.schema.graphql`
    ]);

    // note that this test can be flaky depending on how the air routes sample data was loaded into neptune
    // for more consistent results, use neptune notebook %seed with gremlin language
    checkOutputFileContent(
    schemaFile,
    sortNeptuneSchema(neptuneSchema),
    sortNeptuneSchema(refNeptuneSchema),
    { checkRefIntegrity: false }
    );
});
