
import { jest } from '@jest/globals';
import { main } from "../main";

test('adds 1 + 2 to equal 3', () => {
    expect(1+2).toBe(3);
});

process.argv = ['--input-schema-file', './samples/airports.source.schema.graphql', '--quiet'];

test('main', async () => {
    expect(await main()).not.toBe(null);
});