import { NeptunedataClient, ExecuteOpenCypherQueryCommand, ExecuteGremlinQueryCommand } from "@aws-sdk/client-neptunedata";
import {resolveGraphDBQueryFromAppSyncEvent, refactorGremlinqueryOutput, initSchema} from './output.resolver.graphql.js';
import {readFileSync} from "fs";

const LOGGING_ENABLED = process.env.LOGGING_ENABLED;

const config = {            
    endpoint: `https://${process.env.NEPTUNE_HOST}:${process.env.NEPTUNE_PORT}`
};

let client;

function getClient() {
    if (client) {
        return client;
    } 
  
    try {
        client = new NeptunedataClient(config);
        return client;
    } catch (error) {
        onError('new NeptunedataClient: ', error);
    }
}


function onError (location, error) {
    console.error(location, ': ', error.message);
    return {             
        "error": [{ "message": error.message}]
    };
}
    

export const handler = async(event) => {
    let r = null;
    let result = null;

    if (LOGGING_ENABLED) console.log(event);

    let resolver = { query:'', parameters:{}, language: 'opencypher', fieldsAlias: {} };

    try {
        const schemaDataModelJSON = readFileSync('output.resolver.schema.json', 'utf-8');
        let schemaModel = JSON.parse(schemaDataModelJSON);
        initSchema(schemaModel);
        resolver = resolveGraphDBQueryFromAppSyncEvent(event);
        if (LOGGING_ENABLED) console.log(JSON.stringify(resolver, null, 2));
    } catch (error) {
        onError('Resolver: ', error);
    }
    
    if (resolver.language == 'gremlin') {
        try {
            const input = {
                gremlinQuery: resolver.query            
            };
            const command = new ExecuteGremlinQueryCommand(input);
            const response = await getClient().send(command);
            result = response["result"]["data"];
            const refac = refactorGremlinqueryOutput(result, resolver.fieldsAlias)
            r = JSON.parse(refac);
        } catch (error) {
            onError('Gremlin query: ', error);
        }
    }

    if (resolver.language == 'opencypher') {        
        try {
            const input = {
                openCypherQuery: resolver.query,
                parameters: JSON.stringify(resolver.parameters)
            };
            const command = new ExecuteOpenCypherQueryCommand(input);
            const response = await getClient().send(command);
            result = response.results;
            r = result[0][Object.keys(result[0])];
        } catch (error) {
            onError('openCypher query: ', error);
        }
    }
    
    return r;
};