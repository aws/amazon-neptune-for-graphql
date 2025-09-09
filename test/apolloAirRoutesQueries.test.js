import { testApolloQueries } from "./testLib.js";

/**
 * Executes a standard set of queries against Apollo Server running on localhost:4000.
 */
describe('Execute Standard Air Routes Queries - Apollo Server', () => {
    testApolloQueries('./test/air-routes-queries.json');
});
