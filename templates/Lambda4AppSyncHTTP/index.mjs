import axios from "axios";
import * as rax from 'retry-axios';
import { aws4Interceptor } from "aws4-axios";
import {resolveGraphDBQueryFromAppSyncEvent} from './output.resolver.graphql.js';
import {queryNeptune} from "./queryHttpNeptune.mjs";

const LOGGING_ENABLED = process.env.LOGGING_ENABLED;

const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN,
    AWS_REGION
} = process.env;


if (process.env.NEPTUNE_IAM_AUTH_ENABLED === 'true') {
    let serviceName;
    if (process.env.NEPTUNE_TYPE) {
        serviceName = process.env.NEPTUNE_TYPE;
    } else {
        console.log('NEPTUNE_TYPE environment variable is not set - defaulting to neptune-db');
        serviceName = 'neptune-db';
    }
    const interceptor = aws4Interceptor({
        options: {
            region: AWS_REGION,
            service: serviceName,
        },
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            sessionToken: AWS_SESSION_TOKEN
        }
    });

    axios.interceptors.request.use(interceptor);
}

rax.attach();

export const handler = async (event) => {
    // Create Neptune query from GraphQL query
    try {
        if (LOGGING_ENABLED) console.log("Event: ", event);
        const resolver = resolveGraphDBQueryFromAppSyncEvent(event);
        if (LOGGING_ENABLED) console.log("Resolver: ", resolver);
        return queryNeptune(`https://${process.env.NEPTUNE_HOST}:${process.env.NEPTUNE_PORT}`, resolver, {loggingEnabled: LOGGING_ENABLED})
    } catch (err) {
        if (LOGGING_ENABLED) console.error(err);
        return {
            "error": [{ "message": err}]
        };
    }

};