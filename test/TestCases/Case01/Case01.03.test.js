import { readJSONFile, testResolverQueriesResults } from '../../testLib';
import fs from "fs";

const casetest = readJSONFile('./test/TestCases/Case01/case.json');

try {
    await testResolverQueriesResults(   './TestCases/Case01/output/output.resolver.graphql.js',
        './test/TestCases/Case01/queries',
        './test/TestCases/Case01/output/output.resolver.schema.json.gz',
        casetest.host,
        casetest.port);
} finally {
    fs.rmSync('./test/TestCases/Case01/output', {recursive: true});
}