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
            reject(`Error reading file: ${err.message}`);
        });

        const gunzip = zlib.createGunzip();
        gunzip.on('error', (err) => {
            reject(`Error decompressing file: ${err.message}`);
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