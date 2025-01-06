import { graphDBInferenceSchema } from '../graphdb.js';
import fs from "fs";

test('node with same property and edge label should add underscore prefix', () => {
    expect(graphDBInferenceSchema(readJSONFile('./src/test/node-edge-same-property-neptune-schema.json'), false)).toContain('_commonName:Commonname');
});

test('should properly replace special chars in schema', function() {
    let inferredSchema = graphDBInferenceSchema(readJSONFile('./src/test/special-chars-neptune-schema.json'));
    let fileSchema = readJSONFile('./src/test/special-chars.graphql')
    inferredSchema = sanitizeWhitespace(inferredSchema);
    fileSchema = sanitizeWhitespace(fileSchema);
    expect(inferredSchema).toBe(fileSchema);
});

test('should output airport schema', function() {
    let inferredSchema = graphDBInferenceSchema(readJSONFile('./src/test/airports-neptune-schema.json'));
    let fileSchema = readJSONFile('./src/test/airports.graphql')
    inferredSchema = sanitizeWhitespace(inferredSchema);
    fileSchema = sanitizeWhitespace(fileSchema);
    expect(inferredSchema).toBe(fileSchema);
});

test('should output dining by friends schema', function() {
    let inferredSchema = graphDBInferenceSchema(readJSONFile('./src/test/dining-neptune-schema.json'));
    let fileSchema = readJSONFile('./src/test/dining.graphql')
    inferredSchema = sanitizeWhitespace(inferredSchema);
    fileSchema = sanitizeWhitespace(fileSchema);
    expect(inferredSchema).toBe(fileSchema);
});

test('should output epl schema', function() {
    let inferredSchema = graphDBInferenceSchema(readJSONFile('./src/test/epl-neptune-schema.json'));
    let fileSchema = readJSONFile('./src/test/epl.graphql')
    inferredSchema = sanitizeWhitespace(inferredSchema);
    fileSchema = sanitizeWhitespace(fileSchema);
    expect(inferredSchema).toBe(fileSchema);
});

test('should output fraud graph schema', function() {
    let inferredSchema = graphDBInferenceSchema(readJSONFile('./src/test/fraud-neptune-schema.json'));
    let fileSchema = readJSONFile('./src/test/fraud.graphql')
    inferredSchema = sanitizeWhitespace(inferredSchema);
    fileSchema = sanitizeWhitespace(fileSchema);
    expect(inferredSchema).toBe(fileSchema);
});

test('should output knowledge graph schema', function() {
    let inferredSchema = graphDBInferenceSchema(readJSONFile('./src/test/knowledge-neptune-schema.json'));
    let fileSchema = readJSONFile('./src/test/knowledge.graphql')
    inferredSchema = sanitizeWhitespace(inferredSchema);
    fileSchema = sanitizeWhitespace(fileSchema);
    expect(inferredSchema).toBe(fileSchema);
});

test('should output security graph schema', function() {
    let inferredSchema = graphDBInferenceSchema(readJSONFile('./src/test/security-neptune-schema.json'));
    let fileSchema = readJSONFile('./src/test/security.graphql')
    inferredSchema = sanitizeWhitespace(inferredSchema);
    fileSchema = sanitizeWhitespace(fileSchema);
    expect(inferredSchema).toBe(fileSchema);
});

function sanitizeWhitespace(str) {
    return str
        .replace(/\s+/g, ' ') // replace whitespace with a space
        .trim();  // trim leading and trailing whitespace
}

function readJSONFile(fileName) {
    return fs.readFileSync(fileName, 'utf8');
}