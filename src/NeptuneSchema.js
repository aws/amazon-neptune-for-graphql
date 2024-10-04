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
import { loggerError, loggerInfo } from "./logger.js";

let HOST = '';
let PORT = 8182;
let REGION = ''
let SAMPLE = 5000;
let NEPTUNE_TYPE = 'neptune-db'; 
let language = 'openCypher';
let useSDK = false;
let msg = '';

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


function sanitize(text) {
    // TODO implement sanitization logic
    return text;
}

function sanitize(text) {
    // TODO implement sanitization logic
    return text;
}

/**
 * Executes a neptune query
 * @param query the query to execute
 * @param params optional query params
 * @returns {Promise<ExecuteOpenCypherQueryCommandOutput|any>}
 */
async function queryNeptune(query, params) {
    if (useSDK) {
        const response = await queryNeptuneSDK(query, params);
        return response;
    } else {
        try {
            let data = {
                ...{query: query},
                ...(params) && {parameters: params}
            };
            const response = await axios.post(`https://${HOST}:${PORT}/${language}`, data);
        return response.data;
        } catch (error) {
            loggerError(`Http query request failed` + ': ' + JSON.stringify(error));

            if (NEPTUNE_TYPE == 'neptune-db') {
                loggerInfo("Trying with the AWS SDK");
                const response = await queryNeptuneSDK(query, params);
                useSDK = true;
                return response;
            }

            throw new Error('AWS SDK for Neptune Analytics is not available, yet.');
        }
    } 
}


async function queryNeptuneSDK(query, params) {
    try {
        const config = {            
            endpoint: `https://${HOST}:${PORT}`
        };
        const client = new NeptunedataClient(config);
        const input = {
            ...{openCypherQuery: query},
            ...(params) && {parameters: params}
        };
        const command = new ExecuteOpenCypherQueryCommand(input);
        const response = await client.send(command);        
        return response;

    } catch (error) {
        loggerError('SDK query request failed: ' + JSON.stringify(error));
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
            loggerInfo('Found Node: ' + yellow(result['labels(a)'][0]));
        });        
    }
    catch (e)  {
        loggerError('No nodes found: ' + JSON.stringify(e));
    }
}


async function getEdgesNames() {
    let query = `MATCH ()-[e]->() RETURN type(e), count(e)`;
    let response = await queryNeptune(query);
    loggerInfo('Getting edges names');

    try {
        response.results.forEach(result => {
            schema.edgeStructures.push({ label: result['type(e)'], directions: [], properties:[]});
            loggerInfo('Found Edge: ' + yellow(result['type(e)']));
        });
    }
    catch (e)  {
        loggerError('No edges found: ' + JSON.stringify(e));
    }

}


async function findFromAndToLabels(edgeStructure) {
    let query = `MATCH (from)-[r:${sanitize(edgeStructure.label)}]->(to) RETURN DISTINCT labels(from) as fromLabel, labels(to) as toLabel`;
    let response = await queryNeptune(query);
    for (let result of response.results) {
        for (let fromLabel of result.fromLabel) {
            for (let toLabel of result.toLabel) {
                edgeStructure.directions.push({from:fromLabel, to:toLabel});
                loggerInfo('Found edge: ' + yellow(edgeStructure.label) + '  direction: ' + yellow(fromLabel) + ' -> ' + yellow(toLabel));
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
        loggerInfo(`Added property to node: ${yellow(nodeName)} property: ${yellow(name)} type: ${yellow(propertyType)}`);
    }    
}


function addUpdateEdgeProperty(edgeName, name, value) {
    let edge = schema.edgeStructures.find(edge => edge.label === edgeName);
    let property = edge.properties.find(p => p.name === name);
    if (property === undefined) {
        let propertyType = CastGraphQLType(value);        
        edge.properties.push({name: name, type: propertyType});
        loggerInfo('Added property to edge: ' + yellow(edgeName) + ' property: ' + yellow(name) + ' type: ' + yellow(propertyType));
    }
}


async function getEdgeProperties(edge) {
    let query = `MATCH ()-[n:${sanitize(edge.label)}]->() RETURN properties(n) as properties LIMIT $sample`;
    let parameters = `{"sample": ${SAMPLE}}`;
    loggerInfo('Getting properties for edge');
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
        loggerError('No properties found for edge: ' + edge.label + ': ' + JSON.stringify(e));
    }    
}


async function getEdgesProperties() {
    await Promise.all(schema.edgeStructures.map(async (edge) => {
        await getEdgeProperties(edge);
      }));
}


async function getNodeProperties(node) {
    let query = `MATCH (n:${sanitize(node.label)}) RETURN properties(n) as properties LIMIT $sample`;
    let parameters = `{"sample": ${SAMPLE}}`;
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
        loggerError('No properties found for node: ' + node.label + ': ' + JSON.stringify(e));
    }    
}


async function getNodesProperties() {    
    await Promise.all(schema.nodeStructures.map(async (node) => {
        await getNodeProperties(node);
      }));
}


async function checkEdgeDirectionCardinality(d) {
    let queryFrom = `MATCH (from:${sanitize(d.from)})-[r:${sanitize(d.edge.label)}]->(to:${sanitize(d.to)}) WITH to, count(from) as rels WHERE rels > 1 RETURN rels LIMIT 1`;
    loggerInfo('Checking from edge cardinality')
    let responseFrom = await queryNeptune(queryFrom);
    let resultFrom = responseFrom.results[0];
    let queryTo = `MATCH (from:${sanitize(d.from)})-[r:${sanitize(d.edge.label)}]->(to:${sanitize(d.to)}) WITH from, count(to) as rels WHERE rels > 1 RETURN rels LIMIT 1`;
    loggerInfo('Checking to edge cardinality')
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
    loggerInfo('Found edge: ' + yellow(d.edge.label) + '  direction: ' + yellow(d.from) + ' -> ' + yellow(d.to) + ' relationship: ' + yellow(c));
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


function setGetNeptuneSchemaParameters(host, port, region, neptuneType) {
    HOST = host;
    PORT = port;
    REGION = region;
    NEPTUNE_TYPE = neptuneType;
}


async function getSchemaViaSummaryAPI() {
    try {
        const response = await axios.get(`https://${HOST}:${PORT}/propertygraph/statistics/summary?mode=detailed`);
        response.data.payload.graphSummary.nodeLabels.forEach(label => {
            schema.nodeStructures.push({label:label, properties:[]});
            loggerInfo('Found node: ' + yellow(label));
        });

        response.data.payload.graphSummary.edgeLabels.forEach(label => {
            schema.edgeStructures.push({label:label, properties:[], directions:[]});
            loggerInfo('Found edge: ' + yellow(label));
        });

        return true;

    } catch (error) {
        loggerError(`Getting the schema via Neptune Summary API failed: ${JSON.stringify(error)}`);
        return false;
    }    
}


async function getNeptuneSchema() {
    
    try {
        await getAWSCredentials();
    } catch (error) {
        msg = "There are no AWS credentials configured. Getting the schema from an Amazon Neptune database with IAM authentication works only with AWS credentials.";
        loggerError(msg + ': ' + JSON.stringify(error));
    }

    if (await getSchemaViaSummaryAPI()) {
        loggerInfo("Got nodes and edges via Neptune Summary API.");
    } else {
        loggerInfo("Getting nodes via queries.");
        await getNodesNames();
        loggerInfo("Getting edges via queries.");
        await getEdgesNames();
    }
                
    await getNodesProperties();
    
    await getEdgesProperties();
    
    await getEdgesDirections();
    
    await getEdgesDirectionsCardinality();
    
    return JSON.stringify(schema, null, 2);
}


export { getNeptuneSchema, setGetNeptuneSchemaParameters };