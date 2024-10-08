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
import { parseNeptuneDomain, parseNeptuneGraphName } from "./util.js";
import { ExecuteQueryCommand, GetGraphSummaryCommand, NeptuneGraphClient } from "@aws-sdk/client-neptune-graph";

const NEPTUNE_DB = 'neptune-db';
const NEPTUNE_GRAPH_PROTOCOL = 'https';
const HTTP_LANGUAGE = 'openCypher';
const NEPTUNE_GRAPH_LANGUAGE = 'OPEN_CYPHER';
let HOST = '';
let PORT = 8182;
let REGION = ''
let SAMPLE = 5000;
let VERBOSE = false;
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


function yellow(text) {
    return '\x1b[33m' + text + '\x1b[0m';
}


function consoleOut(text) {
    if (VERBOSE) {
        console.log(text);
    }
}


/**
 * Executes a neptune query using HTTP or SDK.
 * @param query the query to execute
 * @param params optional query params
 * @returns {Promise<ExecuteOpenCypherQueryCommandOutput|any>}
 */
async function queryNeptune(query, params = '{}') {
    if (useSDK) {
        return await queryNeptuneSdk(query, params);
    } else {
        try {
            let data = {
                query: query,
                parameters: params
            };
            const response = await axios.post(`https://${HOST}:${PORT}/${HTTP_LANGUAGE}`, data);
        return response.data;
        } catch (error) {
            console.error("Http query request failed: ", error.message);
            consoleOut("Trying with the AWS SDK");
            const response = await queryNeptuneSdk(query, params);
            console.log('Querying via AWS SDK was successful, will use SDK for future queries')
            useSDK = true;
            return response;
        }
    }
}

/**
 * Queries neptune using an SDK.
 */
async function queryNeptuneSdk(query, params = '{}') {
    if (NEPTUNE_TYPE === NEPTUNE_DB) {
        return await queryNeptuneDbSDK(query, params);
    } else {
        return await queryNeptuneGraphSDK(query, params);
    }
}

/**
 * Queries neptune db using SDK (not to be used for neptune analytics).
 */
async function queryNeptuneDbSDK(query, params = '{}') {
    try {
        const client = getNeptunedataClient();
        const input = {
            openCypherQuery: query,
            parameters: params
        };
        const command = new ExecuteOpenCypherQueryCommand(input);
        const response = await client.send(command);        
        return response;

    } catch (error) {
        console.error("Neptune db SDK query request failed: ", error.message);
        process.exit(1);
    }
}

/**
 * Queries neptune analytics graph using SDK (not to be used for neptune db).
 */
async function queryNeptuneGraphSDK(query, params = '{}') {
    try {
        const client = getNeptuneGraphClient();
        const command = new ExecuteQueryCommand({
            graphIdentifier: NAME,
            queryString: query,
            language: NEPTUNE_GRAPH_LANGUAGE,
            parameters: JSON.parse(params)
        });
        const response = await client.send(command);
        return await new Response(response.payload).json();
    } catch (error) {
        console.error('Neptune graph SDK query request failed:' + JSON.stringify(error));
        process.exit(1);
    }
}


async function getNodesNames() {
    let query = `MATCH (a) RETURN labels(a), count(a)`;
    let response = await queryNeptune(query);

    try {
        response.results.forEach(result => {
            schema.nodeStructures.push({ label: result['labels(a)'][0], properties: []});
            consoleOut('  Found Node: ' + yellow(result['labels(a)'][0]));
        });        
    }
    catch (e)  {
        consoleOut("  No nodes found");
        return;
    }
}


async function getEdgesNames() {
    let query = `MATCH ()-[e]->() RETURN type(e), count(e)`;
    let response = await queryNeptune(query);

    try {
        response.results.forEach(result => {
            schema.edgeStructures.push({ label: result['type(e)'], directions: [], properties:[]});
            consoleOut('  Found Edge: ' + yellow(result['type(e)']));
        });
    }
    catch (e)  {
        consoleOut("  No edges found");
        return;
    }

}


async function findFromAndToLabels(edgeStructure) {
    let query = `MATCH (from)-[r:${edgeStructure.label}]->(to) RETURN DISTINCT labels(from) as fromLabel, labels(to) as toLabel`;
    let response = await queryNeptune(query);
    for (let result of response.results) {
        for (let fromLabel of result.fromLabel) {
            for (let toLabel of result.toLabel) {
                edgeStructure.directions.push({from:fromLabel, to:toLabel});
                consoleOut('  Found edge: ' + yellow(edgeStructure.label) + '  direction: ' + yellow(fromLabel) + ' -> ' + yellow(toLabel));
            }
        }
    }
}


async function getEdgesDirections() {
    await Promise.all(schema.edgeStructures.map(findFromAndToLabels))
}


function CastGraphQLType(value) {
    let propertyType = 'String';

    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            propertyType = 'Int';
        }
        propertyType = 'Float';
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
        consoleOut(`  Added property to node: ${yellow(nodeName)} property: ${yellow(name)} type: ${yellow(propertyType)}`);
    }    
}


function addUpdateEdgeProperty(edgeName, name, value) {
    let edge = schema.edgeStructures.find(edge => edge.label === edgeName);
    let property = edge.properties.find(p => p.name === name);
    if (property === undefined) {
        let propertyType = CastGraphQLType(value);        
        edge.properties.push({name: name, type: propertyType});
        consoleOut('  Added property to edge: ' + yellow(edgeName) + ' property: ' + yellow(name) + ' type: ' + yellow(propertyType));
    }
}


async function getEdgeProperties(edge) {
    let query = `MATCH ()-[n:${edge.label}]->() RETURN properties(n) as properties LIMIT ${SAMPLE}`;
    try {
        let response = await queryNeptune(query);
        let result = response.results;
        result.forEach(e => {                                
            Object.keys(e.properties).forEach(key => {
                addUpdateEdgeProperty(edge.label, key, e.properties[key]);
            });                            
        });            
    }
    catch (e)  {
        consoleOut("  No properties found for edge: " + edge.label);
    }    
}


async function getEdgesProperties() {
    await Promise.all(schema.edgeStructures.map(async (edge) => {
        await getEdgeProperties(edge);
      }));
}


async function getNodeProperties(node) {
    let query = `MATCH (n:${node.label}) RETURN properties(n) as properties LIMIT ${SAMPLE}`;
    try {
        let response = await queryNeptune(query);
        let result = response.results;
        result.forEach(e => {                                
            Object.keys(e.properties).forEach(key => {
                addUpdateNodeProperty(node.label, key, e.properties[key]);
            });                            
        });            
    }
    catch (e)  {
        consoleOut("  No properties found for node: " + node.label);
    }    
}


async function getNodesProperties() {    
    await Promise.all(schema.nodeStructures.map(async (node) => {
        await getNodeProperties(node);
      }));
}


async function checkEdgeDirectionCardinality(d) {
    let queryFrom = `MATCH (from:${d.from})-[r:${d.edge.label}]->(to:${d.to}) WITH to, count(from) as rels WHERE rels > 1 RETURN rels LIMIT 1`;
    let responseFrom = await queryNeptune(queryFrom);
    let resultFrom = responseFrom.results[0];
    let queryTo = `MATCH (from:${d.from})-[r:${d.edge.label}]->(to:${d.to}) WITH from, count(to) as rels WHERE rels > 1 RETURN rels LIMIT 1`;
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
    consoleOut('  Found edge: ' + yellow(d.edge.label) + '  direction: ' + yellow(d.from) + ' -> ' + yellow(d.to) + ' relationship: ' + yellow(c));
}


async function getEdgesDirectionsCardinality() {
    let possibleDirections = [];
    for (const edge of schema.edgeStructures) {
        for (const direction of edge.directions) {
            possibleDirections.push({edge:edge, direction:direction, from:direction.from, to:direction.to});
        }
    }
    
    await Promise.all(possibleDirections.map(async (d) => {
        await checkEdgeDirectionCardinality(d);     
    }));    
}


function setGetNeptuneSchemaParameters(host, port, region, verbose = false, neptuneType) {
    HOST = host;
    PORT = port;
    REGION = region;
    VERBOSE = verbose;
    NEPTUNE_TYPE = neptuneType;
    NAME = parseNeptuneGraphName(host);
}

function getNeptunedataClient() {
    if (!neptunedataClient) {
        console.log('Instantiating NeptunedataClient')
        neptunedataClient = new NeptunedataClient({
            endpoint: `https://${HOST}:${PORT}`
        });
    }
    return neptunedataClient;
}

function getNeptuneGraphClient() {
    if (!neptuneGraphClient) {
        console.log('Instantiating NeptuneGraphClient')
        neptuneGraphClient = new NeptuneGraphClient({
            port: PORT,
            host: parseNeptuneDomain(HOST),
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
    console.log('Retrieving neptune graph summary')
    const client = getNeptuneGraphClient();
    const command = new GetGraphSummaryCommand({
        graphIdentifier: NAME,
        mode: 'detailed'
    });
    const response = await client.send(command);
    console.log('Retrieved neptune graph summary')
    return response.graphSummary;
}

/**
 * Get a summary of a neptune db graph
 */
async function getNeptuneDbSummary() {
    console.log('Retrieving neptune db summary')
    let response = await axios.get(`https://${HOST}:${PORT}/propertygraph/statistics/summary`, {
        params: {
            mode: 'detailed'
        }
    });
    console.log('Retrieved neptune db summary')
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
            consoleOut('  Found node: ' + yellow(label));
        });

        graphSummary.edgeLabels.forEach(label => {
            schema.edgeStructures.push({label:label, properties:[], directions:[]});
            consoleOut('  Found edge: ' + yellow(label));
        });

        return true;

    } catch (error) {
        console.error(`Getting the schema via Neptune Summary API failed: ${JSON.stringify(error)}`);
        return false;
    }    
}


async function getNeptuneSchema(quiet) {

    VERBOSE = !quiet;
    
    try {
        await getAWSCredentials();
    } catch (error) {
        consoleOut("There are no AWS credetials configured. \nGetting the schema from an Amazon Neptune database with IAM authentication works only with AWS credentials.");
    }

    if (await loadSchemaViaSummary()) {
        consoleOut("Got nodes and edges via Neptune Summary API.");
    } else {
        consoleOut("Getting nodes via queries.");
        await getNodesNames();
        consoleOut("Getting edges via queries.");
        await getEdgesNames();
    }
                
    await getNodesProperties();
    
    await getEdgesProperties();
    
    await getEdgesDirections();
    
    await getEdgesDirectionsCardinality();
    
    return JSON.stringify(schema, null, 2);
}


export { getNeptuneSchema, setGetNeptuneSchemaParameters };