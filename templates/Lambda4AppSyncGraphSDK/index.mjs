import {ExecuteQueryCommand, NeptuneGraphClient} from "@aws-sdk/client-neptune-graph";
import {resolveGraphDBQueryFromAppSyncEvent} from './output.resolver.graphql.js';

const PROTOCOL = 'https';
const QUERY_LANGUAGE = 'OPEN_CYPHER';
const RESOLVER_LANGUAGE = 'opencypher';

let client;

function getClient() {
    if (!client) {
        try {
            log('Instantiating NeptuneGraphClient')
            client = new NeptuneGraphClient({
                port: process.env.NEPTUNE_PORT,
                host: process.env.NEPTUNE_DOMAIN,
                region: process.env.NEPTUNE_REGION,
                protocol: PROTOCOL,
            });
        } catch (error) {
            return onError('Error instantiating NeptuneGraphClient: ', error);
        }
    }
    return client;
}

function onError(context, error) {
    let msg;
    if (error) {
        msg = context + ':' + error.message;
    } else {
        msg = context;
    }
    console.error(msg);
    if (error) {
        throw error;
    }
    throw new Error(msg);
}

function log(message) {
    if (process.env.LOGGING_ENABLED) {
        console.log(message);
    }
}

/**
 * Converts graphQL query to open cypher.
 */
function resolveGraphQuery(event) {
    try {
        let resolver = resolveGraphDBQueryFromAppSyncEvent(event);
        if (resolver.language !== RESOLVER_LANGUAGE) {
            return onError('Unsupported resolver language:' + resolver.language)
        }
        log('Resolved ' + resolver.language + ' query successfully');
        return resolver;
    } catch (error) {
        return onError('Error resolving graphQL query', error);
    }
}

/**
 * Converts incoming graphQL query into open cypher format and sends the query to neptune analytics query API.
 */
export const handler = async (event) => {
    let resolver = resolveGraphQuery(event);

    try {
        const command = new ExecuteQueryCommand({
            graphIdentifier: process.env.NEPTUNE_DB_NAME,
            queryString: resolver.query,
            language: QUERY_LANGUAGE,
            parameters: resolver.parameters
        });
        const response = await getClient().send(command);
        log('Received query response');
        let data = await new Response(response.payload).json();
        // query result should have result array of single item or an empty array
        // {"results": [{ ... }]}
        if (data.results.length === 0) {
            log('Query produced no results');
            return [];
        }
        if (data.results.length !== 1) {
            return onError('Expected 1 query result but received ' + data.results.length);
        }
        log('Obtained data from query response');
        return data.results[0][Object.keys(data.results[0])[0]];
    } catch (error) {
        return onError('Error executing ' + QUERY_LANGUAGE + ' query: ', error);
    }
};