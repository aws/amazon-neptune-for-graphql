import { graphDBInferenceSchema } from '../graphdb.js';
import fs from "fs";
import { loggerInit } from "../logger.js";
import * as prettier from "prettier";

test('node with same property and edge label should add underscore prefix', () => {
    expect(graphDBInferenceSchema(readFile('./src/test/node-edge-same-property-neptune-schema.json'))).toContain('_commonName:Commonname');
});

test('should properly replace special chars in schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/special-chars-neptune-schema.json');
    const expected = await loadGraphQLSchema('./src/test/special-chars.graphql');
    expect(actual).toBe(expected);
});

test('should correctly generate mutation input types after replacing special characters in schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/special-chars-neptune-schema.json', { addMutations: true });
    const expected = await loadGraphQLSchema('./src/test/special-chars-mutations.graphql');
    expect(actual).toBe(expected);
});

test('should output airport schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/airports-neptune-schema.json');
    const expected = await loadGraphQLSchema('./src/test/airports.graphql');
    expect(actual).toBe(expected);
});

test('should correctly generate mutation input types after outputting airport schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/airports-neptune-schema.json', { addMutations: true });
    const expected = await loadGraphQLSchema('./src/test/airports-mutations.graphql');
    expect(actual).toBe(expected);
});

test('should correctly generate airport schema with query prefixes', async () => {
    const actual = await inferGraphQLSchema('./src/test/airports-neptune-schema.json', {
        addMutations: true,
        queryPrefix: 'airportsQuery_'
    });
    const expected = await loadGraphQLSchema('./src/test/airports-mutations-query-prefix.graphql');
    expect(actual).toBe(expected);
});

test('should correctly generate airport schema with mutation prefixes', async () => {
    const actual = await inferGraphQLSchema('./src/test/airports-neptune-schema.json', {
        addMutations: true,
        mutationPrefix: 'airportsMutation_'
    });
    const expected = await loadGraphQLSchema('./src/test/airports-mutations-mutation-prefix.graphql');
    expect(actual).toBe(expected);
});

test('should correctly generate airport schema with both query and mutation prefixes', async () => {
    const actual = await inferGraphQLSchema('./src/test/airports-neptune-schema.json', {
        addMutations: true,
        queryPrefix: 'airportsQueryTest_',
        mutationPrefix: 'airportsMutationTest_'
    });
    const expected = await loadGraphQLSchema('./src/test/airports-mutations-with-prefixes.graphql');
    expect(actual).toBe(expected);
});

test('should output dining by friends schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/dining-neptune-schema.json');
    const expected = await loadGraphQLSchema('./src/test/dining.graphql');
    expect(actual).toBe(expected);
});

test('should output epl schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/epl-neptune-schema.json');
    const expected = await loadGraphQLSchema('./src/test/epl.graphql');
    expect(actual).toBe(expected);
});

test('should output fraud graph schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/fraud-neptune-schema.json');
    const expected = await loadGraphQLSchema('./src/test/fraud.graphql');
    expect(actual).toBe(expected);
});

test('should output knowledge graph schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/knowledge-neptune-schema.json');
    const expected = await loadGraphQLSchema('./src/test/knowledge.graphql');
    expect(actual).toBe(expected);
});

test('should output security graph schema', async () => {
    const actual = await inferGraphQLSchema('./src/test/security-neptune-schema.json');
    const expected = await loadGraphQLSchema('./src/test/security.graphql');
    expect(actual).toBe(expected);
});

test('should alias edge with same label as node', async () => {
    loggerInit('./src/test/output', false, 'info');
    const actual = await inferGraphQLSchema('./src/test/node-edge-same-label-neptune-schema.json');
    const expected = await loadGraphQLSchema('./src/test/node-edge-same-label.graphql');
    expect(actual).toBe(expected);
});

test('should handle single one-to-one edge', async () => {
    loggerInit('./src/test/output', false, 'info');
    const actual = await inferGraphQLSchema('./src/test/single-edge-neptune-schema.json', {addMutations: false});
    const expected = await loadGraphQLSchema('./src/test/single-edge.graphql');
    expect(actual).toBe(expected);
});

async function inferGraphQLSchema(neptuneSchemaFilePath, { addMutations = false, queryPrefix = '', mutationPrefix = ''} = {}) {
    let neptuneSchema = readFile(neptuneSchemaFilePath);
    let inferredSchema = graphDBInferenceSchema(neptuneSchema, {addMutations, queryPrefix, mutationPrefix});
    return await sanitizeWhitespace(inferredSchema);
}

async function loadGraphQLSchema(graphQLSchemaFilePath) {
    let expectedSchema = readFile(graphQLSchemaFilePath);
    return await sanitizeWhitespace(expectedSchema);
}

async function sanitizeWhitespace(str) {
    // max printWidth to prevent line wrapping (which tends to wrap in unexpected ways)
    return await prettier.format(str, {parser: "graphql", printWidth: Number.MAX_VALUE});
}

function readFile(fileName) {
    return fs.readFileSync(fileName, 'utf8');
}
