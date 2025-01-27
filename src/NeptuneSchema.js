/*
Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at
    http://www.apache.org/licenses/LICENSE-2.0
or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
*/

import axios from "axios";
import { aws4Interceptor } from "aws4-axios";
import { fromNodeProviderChain  } from "@aws-sdk/credential-providers";
import { NeptunedataClient, ExecuteOpenCypherQueryCommand } from "@aws-sdk/client-neptunedata";
import { loggerDebug, loggerError, loggerInfo, yellow } from "./logger.js";
import { mapAll } from "./util-promise.js";
import { ExecuteQueryCommand, NeptuneGraphClient } from "@aws-sdk/client-neptune-graph";

const NEPTUNE_DB = 'neptune-db';
const NEPTUNE_GRAPH = 'neptune-graph';
const NEPTUNE_GRAPH_PROTOCOL = 'https';
const HTTP_LANGUAGE = 'openCypher';
const NEPTUNE_GRAPH_LANGUAGE = 'OPEN_CYPHER';
let HOST = '';
let PORT = 8182;
let REGION = '';
let DOMAIN = '';
let SAMPLE = 5000;
let NEPTUNE_TYPE = NEPTUNE_DB;
let NAME = '';
let useSDK = false;
let neptuneGraphClient;
let neptunedataClient;

async function getAWSCredentials() {
    const credentialProvider = fromNodeProviderChain();
    const cred = await credentialProvider();

    const interceptor = aws4Interceptor({
        options: {
            region: REGION,
            service: NEPTUNE_TYPE,
        },
        credentials: cred
    });

    axios.interceptors.request.use(interceptor);
}


const schema = {
    nodeStructures:[],
    edgeStructures:[]
};

function sanitize(text) {
    return `\`${text}\``;
}

/**
 * Executes a neptune query using HTTP or SDK.
 * @param query the query to execute
 * @param params optional query params
 */
async function queryNeptune(query, params = {}) {
    if (useSDK) {
        return await queryNeptuneSdk(query, params);
    } else {
        try {
            let data = {
                query: query,
                parameters: JSON.stringify(params)
            };
            const response = await axios.post(`https://${HOST}:${PORT}/${HTTP_LANGUAGE}`, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        return response.data;
        } catch (error) {
            loggerError('Http query request failed', error);
            loggerInfo('Trying with the AWS SDK', {toConsole: true});
            const response = await queryNeptuneSdk(query, params);
            loggerInfo('Querying via AWS SDK was successful, will use SDK for future queries')
            useSDK = true;
            return response;
        }
    }
}

/**
 * Queries neptune using an SDK.
 */
async function queryNeptuneSdk(query, params = {}) {
    if (NEPTUNE_TYPE === NEPTUNE_DB) {
        return await queryNeptuneDbSDK(query, params);
    } else {
        return await queryNeptuneGraphSDK(query, params);
    }
}

/**
 * Queries neptune db using SDK (not to be used for neptune analytics).
 */
async function queryNeptuneDbSDK(query, params = {}) {
    try {
        const client = getNeptunedataClient();
        const input = {
            openCypherQuery: query,
            parameters: JSON.stringify(params)
        };
        const command = new ExecuteOpenCypherQueryCommand(input);
        const response = await client.send(command);        
        return response;

    } catch (error) {
        loggerError(NEPTUNE_DB + ' SDK query request failed', error);
        process.exit(1);
    }
}

/**
 * Queries neptune analytics graph using SDK (not to be used for neptune db).
 */
async function queryNeptuneGraphSDK(query, params = {}) {
    try {
        const client = getNeptuneGraphClient();
        const command = new ExecuteQueryCommand({
            graphIdentifier: NAME,
            queryString: query,
            language: NEPTUNE_GRAPH_LANGUAGE,
            parameters: params
        });
        const response = await client.send(command);
        return await new Response(response.payload).json();
    } catch (error) {
        loggerError(NEPTUNE_GRAPH + ' SDK query request failed', error);
        process.exit(1);
    }
}


async function getNodesNames() {
    let query = `MATCH (a) RETURN labels(a), count(a)`;
    let response = await queryNeptune(query);
    loggerInfo('Getting nodes names');

    try {
        response.results.forEach(result => {
            schema.nodeStructures.push({ label: result['labels(a)'][0], properties: []});
            loggerDebug('Found Node: ' + yellow(result['labels(a)'][0]), {toConsole: true});
        });        
    }
    catch (e)  {
        loggerError('No nodes found', e);
    }
}


async function getEdgesNames() {
    let query = `MATCH ()-[e]->() RETURN type(e), count(e)`;
    let response = await queryNeptune(query);
    loggerInfo('Getting edges names');

    try {
        response.results.forEach(result => {
            schema.edgeStructures.push({ label: result['type(e)'], directions: [], properties:[]});
            loggerDebug('Found Edge: ' + yellow(result['type(e)']), {toConsole: true});
        });
    }
    catch (e)  {
        loggerError('No edges found', e);
    }

}


async function findFromAndToLabels(edgeStructure) {
    let query = `MATCH (from)-[r:${sanitize(edgeStructure.label)}]->(to) RETURN DISTINCT labels(from) as fromLabel, labels(to) as toLabel`;
    let response = await queryNeptune(query);
    for (let result of response.results) {
        for (let fromLabel of result.fromLabel) {
            for (let toLabel of result.toLabel) {
                edgeStructure.directions.push({from:fromLabel, to:toLabel});
                loggerDebug('Found edge: ' + yellow(edgeStructure.label) + '  direction: ' + yellow(fromLabel) + ' -> ' + yellow(toLabel), {toConsole: true});
            }
        }
    }
}


async function getEdgesDirections() {
    await mapAll(schema.edgeStructures, findFromAndToLabels);
}


function CastGraphQLType(value) {
    let propertyType = 'String';

    if (typeof value === 'number') {
        propertyType = Number.isInteger(value) ? 'Int' : 'Float';
    }

    if (typeof value === 'boolean') propertyType = 'Boolean';
    if (value instanceof Date) propertyType = 'Date';
    return propertyType;
}


function addUpdateNodeProperty(nodeName, name, value) {
    let node = schema.nodeStructures.find(node => node.label === nodeName);
    let property = node.properties.find(p => p.name === name);
    if (property === undefined) {
        let propertyType = CastGraphQLType(value);        
        node.properties.push({name: name, type: propertyType});
        loggerDebug(`Added property to node: ${yellow(nodeName)} property: ${yellow(name)} type: ${yellow(propertyType)}`, {toConsole: true});
    }    
}


function addUpdateEdgeProperty(edgeName, name, value) {
    let edge = schema.edgeStructures.find(edge => edge.label === edgeName);
    let property = edge.properties.find(p => p.name === name);
    if (property === undefined) {
        let propertyType = CastGraphQLType(value);        
        edge.properties.push({name: name, type: propertyType});
        loggerDebug('Added property to edge: ' + yellow(edgeName) + ' property: ' + yellow(name) + ' type: ' + yellow(propertyType), {toConsole: true});
    }
}


async function getEdgeProperties(edge) {
    let query = `MATCH ()-[n:${sanitize(edge.label)}]->() RETURN properties(n) as properties LIMIT $sample`;
    let parameters = {sample: SAMPLE};
    loggerDebug(`Getting properties for edge: ${query}`);
    try {
        let response = await queryNeptune(query, parameters);
        let result = response.results;
        result.forEach(e => {                                
            Object.keys(e.properties).forEach(key => {
                addUpdateEdgeProperty(edge.label, key, e.properties[key]);
            });                            
        });            
    }
    catch (e)  {
        loggerError('No properties found for edge: ' + edge.label, e);
    }    
}


async function getEdgesProperties() {
    loggerInfo('Retrieving edge properties');
    await mapAll(schema.edgeStructures, getEdgeProperties);
}


async function getNodeProperties(node) {
    let query = `MATCH (n:${sanitize(node.label)}) RETURN properties(n) as properties LIMIT $sample`;
    let parameters = {sample: SAMPLE};
    loggerDebug(`Getting properties for node: ${query}`);
    try {
        let response = await queryNeptune(query, parameters);
        let result = response.results;
        result.forEach(e => {                                
            Object.keys(e.properties).forEach(key => {
                addUpdateNodeProperty(node.label, key, e.properties[key]);
            });                            
        });            
    }
    catch (e)  {
        loggerError('No properties found for node: ' + node.label, e);
    }    
}


async function getNodesProperties() {
    loggerInfo('Retrieving node properties');
    await mapAll(schema.nodeStructures, getNodeProperties);
}


async function checkEdgeDirectionCardinality(d) {
    let queryFrom = `MATCH (from:${sanitize(d.from)})-[r:${sanitize(d.edge.label)}]->(to:${sanitize(d.to)}) WITH to, count(from) as rels WHERE rels > 1 RETURN rels LIMIT 1`;
    loggerDebug(`Checking edge direction cardinality: ${queryFrom}`);
    let responseFrom = await queryNeptune(queryFrom);
    let resultFrom = responseFrom.results[0];
    let queryTo = `MATCH (from:${sanitize(d.from)})-[r:${sanitize(d.edge.label)}]->(to:${sanitize(d.to)}) WITH from, count(to) as rels WHERE rels > 1 RETURN rels LIMIT 1`;
    loggerDebug(`Checking edge direction cardinality: ${queryTo}`)
    let responseTo = await queryNeptune(queryTo);
    let resultTo = responseTo.results[0];
    let c = '';
    
    if (resultFrom !== undefined) {
        c = 'MANY-'
    } else {
        c = 'ONE-'
    }

    if (resultTo !== undefined) {
        c += 'MANY'
    } else {
        c += 'ONE'
    }

    Object.assign(d.direction, {relationship: c});
    loggerDebug('Found edge: ' + yellow(d.edge.label) + '  direction: ' + yellow(d.from) + ' -> ' + yellow(d.to) + ' relationship: ' + yellow(c), {toConsole: true});
}


async function getEdgesDirectionsCardinality() {
    let possibleDirections = [];
    for (const edge of schema.edgeStructures) {
        for (const direction of edge.directions) {
            possibleDirections.push({edge:edge, direction:direction, from:direction.from, to:direction.to});
        }
    }
    
    await mapAll(possibleDirections, checkEdgeDirectionCardinality);
}


function setGetNeptuneSchemaParameters(neptuneInfo) {
    HOST = neptuneInfo.host;
    PORT = neptuneInfo.port;
    REGION = neptuneInfo.region;
    NEPTUNE_TYPE = neptuneInfo.neptuneType;
    NAME = neptuneInfo.graphName;
    DOMAIN = neptuneInfo.domain;
}

function getNeptunedataClient() {
    if (!neptunedataClient) {
        loggerInfo('Instantiating NeptunedataClient')
        neptunedataClient = new NeptunedataClient({
            endpoint: `https://${HOST}:${PORT}`
        });
    }
    return neptunedataClient;
}

function getNeptuneGraphClient() {
    if (!neptuneGraphClient) {
        loggerInfo('Instantiating NeptuneGraphClient')
        neptuneGraphClient = new NeptuneGraphClient({
            port: PORT,
            host: DOMAIN,
            region: REGION,
            protocol: NEPTUNE_GRAPH_PROTOCOL,
        });
    }
    return neptuneGraphClient;
}

/**
 * Get a summary of a neptune analytics graph
 */
async function getNeptuneGraphSummary() {
    loggerInfo('Retrieving ' + NEPTUNE_GRAPH + ' summary')
    let response = await axios.get(`https://${HOST}:${PORT}/summary`, {
        params: {
            mode: 'detailed'
        }
    });
    loggerInfo('Retrieved ' + NEPTUNE_GRAPH + ' summary')
    return response.data.graphSummary;
}

/**
 * Get a summary of a neptune db graph
 */
async function getNeptuneDbSummary() {
    loggerInfo('Retrieving ' + NEPTUNE_DB + ' summary')
    let response = await axios.get(`https://${HOST}:${PORT}/propertygraph/statistics/summary`, {
        params: {
            mode: 'detailed'
        }
    });
    loggerInfo('Retrieved ' + NEPTUNE_DB + ' summary')
    return response.data.payload.graphSummary;
}

/**
 * Load the neptune schema by querying the summary API
 */
async function loadSchemaViaSummary() {
    try {
        let graphSummary;
        if (NEPTUNE_TYPE === NEPTUNE_DB) {
            graphSummary = await getNeptuneDbSummary();
        } else {
            graphSummary = await getNeptuneGraphSummary();
        }
        graphSummary.nodeLabels.forEach(label => {
            schema.nodeStructures.push({label:label, properties:[]});
            loggerDebug('Found node: ' + yellow(label), {toConsole: true});
        });

        graphSummary.edgeLabels.forEach(label => {
            schema.edgeStructures.push({label:label, properties:[], directions:[]});
            loggerDebug('Found edge: ' + yellow(label), {toConsole: true});
        });

        return true;

    } catch (error) {
        loggerError('Getting the schema via Neptune Summary API failed', error);
        return false;
    }    
}


async function getNeptuneSchema() {
    
    try {
        await getAWSCredentials();
    } catch (error) {
        loggerError('There are no AWS credentials configured. Getting the schema from an Amazon Neptune database with IAM authentication works only with AWS credentials.', error);
    }

    if (await loadSchemaViaSummary()) {
        loggerInfo("Got nodes and edges via Neptune Summary API.", {toConsole: true});
    } else {
        loggerInfo("Getting nodes via queries.", {toConsole: true});
        await getNodesNames();
        loggerInfo("Getting edges via queries.", {toConsole: true});
        await getEdgesNames();
    }
                
    await getNodesProperties();
    
    await getEdgesProperties();
    
    await getEdgesDirections();
    
    await getEdgesDirectionsCardinality();

    return JSON.stringify(schema, null, 2);
}


export { getNeptuneSchema, setGetNeptuneSchemaParameters };