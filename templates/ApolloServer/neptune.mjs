import axios from 'axios';
import * as rax from 'retry-axios';
import {aws4Interceptor} from 'aws4-axios';
import {fromNodeProviderChain} from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';
import {queryNeptune} from './queryHttpNeptune.mjs'
import {resolveGraphDBQueryFromEvent} from "./output.resolver.graphql.js";


dotenv.config();

const loggingEnabled = process.env.LOGGING_ENABLED === 'true';
const credentialProvider = fromNodeProviderChain();
const credentials = await credentialProvider();
const interceptor = aws4Interceptor({
    options: {
        region: process.env.AWS_REGION,
        service: process.env.NEPTUNE_TYPE,
    },
    credentials: credentials
});
axios.interceptors.request.use(interceptor);
rax.attach();

export async function resolveEvent(event) {
    const resolved = resolveGraphDBQueryFromEvent(event);
    try {
        return queryNeptune(`https://${process.env.NEPTUNE_HOST}:${process.env.NEPTUNE_PORT}`, resolved, {loggingEnabled: loggingEnabled});
    } catch (err) {
        if (loggingEnabled) {
            console.error(err);
        }
        return {
            "error": [{"message": err}]
        };
    }

}