import fs from 'fs';
import archiver from 'archiver';
import path from "path";
import { fileURLToPath } from "url";
import zlib from 'zlib';

/**
 * Compresses a string and writes it to a gzip file.
 * @param {string} inputString - The string to compress
 * @param {string} gzipFilePath - The path to the gzip file to write
 * @returns {Promise<void>} - A promise that resolves when the compression is complete
 */
export function compressToGzipFile(inputString, gzipFilePath) {
    return new Promise((resolve, reject) => {
        const buffer = Buffer.from(inputString, 'utf-8');
        zlib.gzip(buffer, (error, compressedBuffer) => {
            if (error) {
                reject(`Error compressing string: ${error.message}`);
                return;
            }
            fs.writeFile(gzipFilePath, compressedBuffer, (writeError) => {
                if (writeError) {
                    reject(`Error writing to file: ${writeError.message}`);
                    return;
                }
                resolve();
            });
        });
    });
}

/**
 * Creates a zip file with specified contents.
 *
 * @param {string} targetZipFilePath path to where the zip should be created
 * @param {object[]} includePaths paths to files or folders that should be included in the zip
 * @param {string} includePaths.source path to the source file or folder
 * @param {string} includePaths.target name of the file or folder to create in the zip. If it is a file and not provided, the source file name will be used. If it is a folder and not provided, the contents will be created in the root of the zip
 * @param {object[]} includeContent additional string contents that should be included in the zip
 * @param {string} includeContent.source string content to include in the zip as a file
 * @param {string} includeContent.target name of the target file to create in the zip that will contain the source content
 * @param {string[]} excludePatterns if any includePaths are a folder, patterns of files to exclude from the folder
 * @returns {Promise<void>}
 */
async function createZip({targetZipFilePath, includePaths = [], includeContent = [], excludePatterns = []}) {
    const output = fs.createWriteStream(targetZipFilePath);
    const archive = archiver('zip', {zlib: {level: 9}});
    const streamingCompletedPromise = new Promise((resolve, reject) => {
        output.on('close', () => resolve());
        archive.on('error', err => reject(err));
    });
    
    archive.pipe(output);

    includePaths.forEach(includePath => {
        const stats = fs.lstatSync(includePath.source);
        if (stats.isDirectory()) {
            archive.glob('**/*', {
                cwd: includePath.source,
                ignore: excludePatterns || [],
                dot: false,  // exclude hidden dotfiles
            }, {
                // if no target specified, add contents to root of archive
                prefix: includePath.target || ''
            });
        } else {
            archive.file(includePath.source, {name: includePath.target ?? path.basename(includePath.source)})
        }
    })
    includeContent.forEach(content => {
        archive.append(content.source, {name: content.target});
    });
    await archive.finalize();
    await streamingCompletedPromise;
}

/**
 * Creates a lambda deployment ZIP package
 *
 * @param outputZipFilePath the path to where the zip should be created
 * @param templateFolderPath the path to the template folder that contains contents to add to the zip
 * @param resolverFilePath the path to the resolver file that should be added to the zip
 * @param resolverSchemaFilePath the path to the resolver schema file that should be added to the zip
 * @returns {Promise<Buffer<ArrayBufferLike>>}
 */
export async function createLambdaDeploymentPackage({outputZipFilePath, templateFolderPath, resolverFilePath, resolverSchemaFilePath}) {
    const modulePath = getModulePath();
    const filePaths = [
        {source: templateFolderPath},
        {source: resolverFilePath, target: 'output.resolver.graphql.js'},
        {source: resolverSchemaFilePath, target: 'output.resolver.schema.json.gz'},
        {source: path.join(modulePath, '/../templates/util.mjs')}
    ];

    if (templateFolderPath.includes('HTTP')) {
        filePaths.push({
            source: path.join(modulePath, '/../templates/queryHttpNeptune.mjs')
        })
    }

    await createZip({
        targetZipFilePath: outputZipFilePath,
        includePaths: filePaths
    });
}

/**
 * Creates a zip package of Apollo Server deployment artifacts.
 *
 * @param zipFilePath the file path where the zip should be created
 * @param resolverFilePath path to the resolver file to include in the zip
 * @param schemaFilePath path to the schema file to include in the zip
 * @param resolverSchemaFilePath path to the resolver schema file to include in the zip
 * @param neptuneInfo object containing neptune db/graph related information such as URL, region, etc
 * @param isSubgraph true if the service should be deployed as a subgraph
 * @returns {Promise<void>}
 */
export async function createApolloDeploymentPackage({zipFilePath, resolverFilePath, schemaFilePath, resolverSchemaFilePath, neptuneInfo, isSubgraph = false}) {
    const envVars = [
        `NEPTUNE_TYPE=${neptuneInfo.neptuneType}`,
        `NEPTUNE_HOST=${neptuneInfo.host}`,
        `NEPTUNE_PORT=${neptuneInfo.port}`,
        `AWS_REGION=${neptuneInfo.region}`,
        'LOGGING_ENABLED=false', // do not log query data by default
        `SUBGRAPH=${isSubgraph}`
    ];
    const modulePath = getModulePath();
    await createZip({
        targetZipFilePath: zipFilePath,
        includePaths: [
            {source: path.join(modulePath, '/../templates/ApolloServer')},
            {source: resolverFilePath, target: 'output.resolver.graphql.js'},
            {source: schemaFilePath, target: 'output.schema.graphql'},
            {source: resolverSchemaFilePath, target: 'output.resolver.schema.json.gz'},
            {source: path.join(modulePath, '/../templates/util.mjs')},
            // querying neptune using SDK not yet supported
            {source: path.join(modulePath, '/../templates/queryHttpNeptune.mjs')}
        ],
        includeContent: [{source: envVars.join('\n'), target: '.env'}],
        // exclude node_modules from apollo package
        excludePatterns: ['**/node_modules/**']
    })
}

export function getModulePath() {
    return path.dirname(fileURLToPath(import.meta.url));
}
