import { createReadStream } from "fs";
import zlib from "zlib";

/**
 * Unzips a gzip file and returns its contents as a string
 *
 * @param {string} inputFilePath - Path to the gzipped file to be decompressed
 * @returns {Promise<string>} - The decompressed file contents as a string
 */
export function decompressGzipToString(inputFilePath) {
    return new Promise((resolve, reject) => {
        const readStream = createReadStream(inputFilePath);
        readStream.on('error', (err) => {
            reject(`Error reading gzip file: ${err.message}`);
        });

        const gunzip = zlib.createGunzip();
        gunzip.on('error', (err) => {
            reject(`Error decompressing gzip file: ${err.message}`);
        });

        // Collect the decompressed data chunks
        const chunks = [];
        gunzip.on('data', (chunk) => {
            chunks.push(chunk);
        });

        // When decompression is complete, return the string
        gunzip.on('end', () => {
            const result = Buffer.concat(chunks).toString('utf-8');
            resolve(result);
        });

        readStream.pipe(gunzip);
    });
}

/**
 * Injects AWS scalar type definitions into a GraphQL schema model.
 *
 * This function adds predefined AWS AppSync scalar types to the schema's definitions array.
 *
 * @param {Object} schemaModel - The GraphQL schema model object that contains a definitions array
 */
export function injectAwsScalarDefinitions(schemaModel) {
    const awsScalarTypes = [
        'AWSDate',
        'AWSTime',
        'AWSDateTime',
        'AWSTimestamp',
        'AWSEmail',
        'AWSJSON',
        'AWSPhone',
        'AWSURL',
        'AWSIPAddress'
    ];

    const awsScalars = awsScalarTypes
        .map(scalarName => ({
            kind: "ScalarTypeDefinition",
            name: {
                kind: "Name",
                value: scalarName
            },
            directives: []
        }));

    // Add to the definitions array
    schemaModel.definitions.push(...awsScalars);
}