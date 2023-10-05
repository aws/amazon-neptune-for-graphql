
import { jest } from '@jest/globals';
import { main } from "../main";

test('adds 1 + 2 to equal 3', () => {
    expect(1+2).toBe(3);
});


async function mainTest() {
    process.argv = ['--input-schema-file', './samples/airports.source.schema.graphql', '--quiet', '--output-lambda-resolver-zip-file', './output/SDKJestTest.zip'];
    await main();
}

test('main', async () => {
    expect(await mainTest()).not.toBe(null);    
});


async function mainTestHttps() {
    process.argv = ['--input-schema-file', './samples/airports.source.schema.graphql', '--quiet', '--output-resolver-query-https', '--output-lambda-resolver-zip-file', './output/HTTPSJestTest.zip'];
    await main();
}

test('main https', async () => {
    expect(await mainTestHttps()).not.toBe(null);
});