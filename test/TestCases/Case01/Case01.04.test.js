
import { jest } from '@jest/globals';
import { readJSONFile, testResolverQueriesResults } from '../../testLib';

const casetest = readJSONFile('./test/TestCases/Case01/case.json');

await testResolverQueriesResults(   './TestCases/Case01/output/output.resolver.graphql.js',
                                    './test/TestCases/Case01/queries',
                                    casetest.host,
                                    casetest.port);