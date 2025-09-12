import { testApolloQueries } from "./testLib.js";

/**
 * Executes queries that are added to the graphQL schema via --input-schema-changes-file air-routes-changes.json.
 * Tests against Apollo Server running on localhost:4000.
 */
describe('Execute Custom Air Routes Queries - Apollo Server', () => {
    testApolloQueries('./test/custom-air-routes-queries.json');
});
