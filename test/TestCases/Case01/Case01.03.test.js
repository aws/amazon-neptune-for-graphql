
import { jest } from '@jest/globals';
import { testResolverQueries } from '../../testLib';


await testResolverQueries('./TestCases/Case01/output/output.resolver.graphql.cjs', './test/TestCases/Case01/queries');