import { graphDBInferenceSchema } from '../graphdb.js';
import fs from "fs";
import { loggerInit } from "../logger.js";

test('node with same property and edge label should add underscore prefix', () => {
    expect(graphDBInferenceSchema(readFile('./src/test/node-edge-same-property-neptune-schema.json'), false)).toContain('_commonName:Commonname');
});

test('should properly replace special chars in schema', () => {
    const actual = inferGraphQLSchema('./src/test/special-chars-neptune-schema.json');
    const expected = loadGraphQLSchema('./src/test/special-chars.graphql');
    expect(actual).toBe(expected);
});

test('should correctly generate mutation input types after replacing special characters in schema', () => {
    const actual = inferGraphQLSchema('./src/test/special-chars-neptune-schema.json', { addMutations: true });
    const expected = loadGraphQLSchema('./src/test/special-chars-mutations.graphql');
    expect(actual).toBe(expected);
});

test('should output airport schema', () => {
    const actual = inferGraphQLSchema('./src/test/airports-neptune-schema.json');
    const expected = loadGraphQLSchema('./src/test/airports.graphql');
    expect(actual).toBe(expected);
});

test('should correctly generate mutation input types after outputting airport schema', () => {
    const actual = inferGraphQLSchema('./src/test/airports-neptune-schema.json', { addMutations: true });
    const expected = loadGraphQLSchema('./src/test/airports-mutations.graphql');
    expect(actual).toBe(expected);
});

test('should output dining by friends schema', () => {
    const actual = inferGraphQLSchema('./src/test/dining-neptune-schema.json');
    const expected = loadGraphQLSchema('./src/test/dining.graphql');
    expect(actual).toBe(expected);
});

test('should output epl schema', () => {
    const actual = inferGraphQLSchema('./src/test/epl-neptune-schema.json');
    const expected = loadGraphQLSchema('./src/test/epl.graphql');
    expect(actual).toBe(expected);
});

test('should output fraud graph schema', () => {
    const actual = inferGraphQLSchema('./src/test/fraud-neptune-schema.json');
    const expected = loadGraphQLSchema('./src/test/fraud.graphql');
    expect(actual).toBe(expected);
});

test('should output knowledge graph schema', () => {
    const actual = inferGraphQLSchema('./src/test/knowledge-neptune-schema.json');
    const expected = loadGraphQLSchema('./src/test/knowledge.graphql');
    expect(actual).toBe(expected);
});

test('should output security graph schema', () => {
    const actual = inferGraphQLSchema('./src/test/security-neptune-schema.json');
    const expected = loadGraphQLSchema('./src/test/security.graphql');
    expect(actual).toBe(expected);
});

test('should alias edge with same label as node', () => {
    loggerInit('./src/test/output', false, 'info');
    const actual = inferGraphQLSchema('./src/test/node-edge-same-label-neptune-schema.json');
    const expected = loadGraphQLSchema('./src/test/node-edge-same-label.graphql');
    expect(actual).toBe(expected);
});

function inferGraphQLSchema(neptuneSchemaFilePath, options = { addMutations: false }) {
    let neptuneSchema = readFile(neptuneSchemaFilePath);
    let inferredSchema = graphDBInferenceSchema(neptuneSchema, options.addMutations);
    return sanitizeWhitespace(inferredSchema);
}

function loadGraphQLSchema(graphQLSchemaFilePath) {
    let expectedSchema = readFile(graphQLSchemaFilePath);
    return sanitizeWhitespace(expectedSchema);
}

function sanitizeWhitespace(str) {
    return str
        .replace(/\s+/g, ' ') // replace whitespace with a space
        .trim();  // trim leading and trailing whitespace
}

function readFile(fileName) {
    return fs.readFileSync(fileName, 'utf8');
}
