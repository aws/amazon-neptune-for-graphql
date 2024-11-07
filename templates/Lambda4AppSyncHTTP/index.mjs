import axios from "axios";
import * as rax from 'retry-axios';
import { aws4Interceptor } from "aws4-axios";
import {resolveGraphDBQueryFromAppSyncEvent, refactorGremlinqueryOutput} from './output.resolver.graphql.js';

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
    let r = null;
    let resolver = { query:'', parameters: {}, language: 'opencypher', fieldsAlias: {} };
    let result = null;

    // Create Neptune query from GraphQL query
    try {
        if (LOGGING_ENABLED) console.log("Event: ", event);
        resolver = resolveGraphDBQueryFromAppSyncEvent(event);
        if (LOGGING_ENABLED) console.log("Resolver: ", resolver);

        const myConfig = {
            raxConfig: {
              retry: 5, 
              noResponseRetries: 5,
              onRetryAttempt: err => {
                const cfg = rax.getConfig(err);
                console.log(`Retry attempt #${cfg.currentRetryAttempt} Status: ${err.response.statusText}`); 
              }
            },
            timeout: 20000
        };
        
        if (resolver.language === 'opencypher') {
            result = await axios.post(`https://${process.env.NEPTUNE_HOST}:${process.env.NEPTUNE_PORT}/opencypher`, {
                query: resolver.query,
                parameters: JSON.stringify(resolver.parameters)
            }, myConfig);
        } else {
            result = await axios.post(`https://${process.env.NEPTUNE_HOST}:${process.env.NEPTUNE_PORT}/gremlin`, {
                gremlin: resolver.query
            }, myConfig);
        }
        if (LOGGING_ENABLED) console.log("Result: ", JSON.stringify(result.data, null, 2));
    } catch (err) {
        if (LOGGING_ENABLED) console.error(err);
        return {
            "error": [{ "message": err}]
        };
    }
    
    if (LOGGING_ENABLED) console.log("Got data.");

    // Based on Neptune query type
    if (resolver.language == 'gremlin') {
        const input = result.data["result"]["data"];
        const refac = refactorGremlinqueryOutput(input, resolver.fieldsAlias);
        if (LOGGING_ENABLED) console.log("Refac: ", refac);
        r = JSON.parse(refac);        
    } 

    if (resolver.language == 'opencypher') {
        let data = result.data;
        if (data.results.length == 0) {
            return null;
        }        
        r = data.results[0][Object.keys(data.results[0])[0]];
    }

    return r;
};