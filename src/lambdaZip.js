import fs from 'fs';
import archiver from 'archiver';

async function createLmbdaDeploymentPackage(templatePath, zipFilePath) {            
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(templatePath, false);
    archive.file('./output/output.resolver.graphql.js', { name: 'output.resolver.graphql.js' })
    await archive.finalize();
}

export { createLmbdaDeploymentPackage }