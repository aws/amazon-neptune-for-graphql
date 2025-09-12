import { testAppSyncQueries } from './testLib.js';

/**
 * Executes a standard set of queries against an AppSync API.
 */
describe('Execute Standard Air Routes Queries', () => {
    testAppSyncQueries('./test/air-routes-queries.json');
});
