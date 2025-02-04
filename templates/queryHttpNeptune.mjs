import axios from "axios";
import * as rax from 'retry-axios';
import {refactorGremlinqueryOutput} from './output.resolver.graphql.js'

/**
 * Sends an opencypher or gremlin query via HTTP to neptune and transforms the response into a graphQL json response.
 *
 * It is expected that the axios http client authentication should be pre-configured before calling this function.
 *
 * @param {string} neptuneUrl the neptune URL to query
 * @param {object} resolvedQuery query object that contains query data
 * @param {string} resolvedQuery.query the query string
 * @param {string} resolvedQuery.language the query language - either opencypher or gremlin
 * @param {object} resolvedQuery.parameters the query parameters object
 * @param {object} resolvedQuery.fieldsAlias alias for the query field - applies only for gremlin queries
 * @param {object} options optional options object
 * @param {boolean} options.loggingEnabled true if non-error logging should be enabled
 * @returns {Promise<{error: [{message}]}|*|null>}
 */
export async function queryNeptune(neptuneUrl, resolvedQuery, options = {loggingEnabled: false}) {
    const loggingEnabled = options?.loggingEnabled;

    try {
        const requestConfig = {
            raxConfig: {
                retry: 5, noResponseRetries: 5, onRetryAttempt: err => {
                    const cfg = rax.getConfig(err);
                    if (loggingEnabled) {
                        console.log(`Retry attempt #${cfg.currentRetryAttempt} Status: ${err.response.statusText}`);
                    }
                }
            }, timeout: 20000
        };

        let response;
        if (resolvedQuery.language === 'opencypher') {
            response = await axios.post(`${neptuneUrl}/opencypher`, {
                query: resolvedQuery.query, parameters: JSON.stringify(resolvedQuery.parameters)
            }, requestConfig);
        } else {
            response = await axios.post(`${neptuneUrl}/gremlin`, {
                gremlin: resolvedQuery.query
            }, requestConfig);
        }
        if (loggingEnabled) {
            console.log("Query result: ", JSON.stringify(response.data, null, 2));
        }

        if (resolvedQuery.language === 'gremlin') {
            const gremlinData = response.data["result"]["data"];
            const jsonData = refactorGremlinqueryOutput(gremlinData, resolvedQuery.fieldsAlias);
            if (loggingEnabled) {
                console.log("Gremlin query json data: ", jsonData);
            }
            return JSON.parse(jsonData);
        }

        if (resolvedQuery.language === 'opencypher') {
            let openCypherData = response.data;
            if (openCypherData.results.length === 0) {
                // this happens if a query for a single entity using match clause with limit 1 does not find any result
                return null;
            }
            let jsonData = openCypherData.results[0][Object.keys(openCypherData.results[0])[0]];
            if (loggingEnabled) {
                console.log("Opencypher query json data: ", jsonData);
            }
            return jsonData;
        }
    } catch (err) {
        console.error("Failed to query neptune")
        console.error(err);
        return {
            "error": [{"message": err}]
        };
    }

}