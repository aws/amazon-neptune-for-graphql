import { testAppSyncQueries } from './testLib.js';

/**
 * Executes queries that are added to the graphQL schema via --input-schema-changes-file air-routes-changes.json.
 */
describe('Execute Custom Air Routes Queries', () => {
    testAppSyncQueries('./test/custom-air-routes-queries.json');
});
