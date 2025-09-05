import axios from 'axios';
import * as rax from 'retry-axios';
import { aws4Interceptor } from 'aws4-axios';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';
import { queryNeptune } from './queryHttpNeptune.mjs'
import { initSchema, resolveGraphDBQueryFromEvent } from "./output.resolver.graphql.js";
import { decompressGzipToString } from './util.mjs';

dotenv.config();

const loggingEnabled = process.env.LOGGING_ENABLED === 'true';

// wrapper that aws4Interceptor can use to obtain credentials
const credentialsProviderWrapper = {
    getCredentials: async () => {
        // uses the default node provider chain
        // see aws documentation for configuration options
        // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/#fromnodeproviderchain
        const credentialProvider = fromNodeProviderChain();
        return await credentialProvider();
    }
};

const interceptor = aws4Interceptor({
    options: {
        region: process.env.AWS_REGION,
        service: process.env.NEPTUNE_TYPE,
    },
    credentials: credentialsProviderWrapper
});
axios.interceptors.request.use(interceptor);
rax.attach();

const schemaDataModelJSON = await decompressGzipToString('output.resolver.schema.json.gz');
const schemaModel = JSON.parse(schemaDataModelJSON);
initSchema(schemaModel);

export async function resolveEvent(event) {
    const resolved = resolveGraphDBQueryFromEvent(event);
    try {
        return queryNeptune(`https://${process.env.NEPTUNE_HOST}:${process.env.NEPTUNE_PORT}`, resolved, {loggingEnabled: loggingEnabled});
    } catch (err) {
        if (loggingEnabled) {
            console.error(err);
        }
        throw new Error(`Failed to query Neptune: ${err.message || err}`);
    }

}