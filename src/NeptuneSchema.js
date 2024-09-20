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
import { loggerLog } from "./logger.js";

let HOST = '';
let PORT = 8182;
let REGION = ''
let SAMPLE = 5000;
let VERBOSE = false;
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


function consoleOut(text) {
    loggerLog(text, VERBOSE);
}


async function queryNeptune(q) {    
    if (useSDK) {
        const response = await queryNeptuneSDK(q);
        return response; 
    } else {
        try {        
        const response = await axios.post(`https://${HOST}:${PORT}/${language}`, `query=${encodeURIComponent(q)}`);
        return response.data;    
        } catch (error) {
            msg = `Http query request failed: ${error.message}`;
            console.error(msg);
            loggerLog(msg + ': ' + JSON.stringify(error));
            
            if (NEPTUNE_TYPE == 'neptune-db') {
                consoleOut("Trying with the AWS SDK");            
                const response = await queryNeptuneSDK(q);
                useSDK = true;
                return response; 
            }
            
            throw new Error('AWS SDK for Neptune Analytics is not available, yet.');
        }
    } 
}


async function queryNeptuneSDK(q) {
    try {
        const config = {            
            endpoint: `https://${HOST}:${PORT}`
        };
        const client = new NeptunedataClient(config);
        const input = {
            openCypherQuery: q            
        };
        const command = new ExecuteOpenCypherQueryCommand(input);
        const response = await client.send(command);        
        return response;

    } catch (error) {        
        msg = `SDK query request failed: ${error.message}`;
        console.error(msg);
        loggerLog(msg + ': ' + JSON.stringify(error));        
        process.exit(1);
    }
}


async function getNodesNames() {
    let query = `MATCH (a) RETURN labels(a), count(a)`;
    let response = await queryNeptune(query);    
    loggerLog('Getting nodes names');    

    try {
        response.results.forEach(result => {
            schema.nodeStructures.push({ label: result['labels(a)'][0], properties: []});            
            consoleOut('  Found Node: ' + yellow(result['labels(a)'][0]));
        });        
    }
    catch (e)  {
        msg = "  No nodes found";
        consoleOut(msg);
        loggerLog(msg + ': ' + JSON.stringify(e));
        return;
    }
}


async function getEdgesNames() {
    let query = `MATCH ()-[e]->() RETURN type(e), count(e)`;
    let response = await queryNeptune(query);
    loggerLog('Getting edges names');

    try {
        response.results.forEach(result => {
            schema.edgeStructures.push({ label: result['type(e)'], directions: [], properties:[]});
            consoleOut('  Found Edge: ' + yellow(result['type(e)']));
        });
    }
    catch (e)  {
        msg = "  No edges found";
        consoleOut(msg);
        loggerLog(msg + ': ' + JSON.stringify(e));
        return;
    }

}


async function checkEdgeDirection(direction) {
    let query = `MATCH (from:${direction.from})-[r:${direction.edge.label}]->(to:${direction.to}) RETURN r as edge LIMIT 1`;
    let response = await queryNeptune(query);
    let result = response.results[0];
    if (result !== undefined) {                    
        direction.edge.directions.push({from:direction.from, to:direction.to});
        consoleOut('  Found edge: ' + yellow(direction.edge.label) + '  direction: ' + yellow(direction.from) + ' -> ' + yellow(direction.to));
    }
}


async function getEdgesDirections() {
    let possibleDirections = [];
    for (const edge of schema.edgeStructures) {        
        for (const fromNode of schema.nodeStructures) {
            for (const toNode of schema.nodeStructures) {
                possibleDirections.push({edge:edge, from:fromNode.label, to:toNode.label});            
            }
        }
    }

    await Promise.all(possibleDirections.map(checkEdgeDirection))
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
    loggerLog(`Getting properties for edge: ${query}`);        
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
        msg = "  No properties found for edge: " + edge.label;
        consoleOut(msg);
        loggerLog(msg + ': ' + JSON.stringify(e));
    }    
}


async function getEdgesProperties() {
    await Promise.all(schema.edgeStructures.map(async (edge) => {
        await getEdgeProperties(edge);
      }));
}


async function getNodeProperties(node) {
    let query = `MATCH (n:${node.label}) RETURN properties(n) as properties LIMIT ${SAMPLE}`;
    loggerLog(`Getting properties for node: ${query}`);
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
        msg = "  No properties found for node: " + node.label;
        consoleOut(msg);
        loggerLog(msg + ': ' + JSON.stringify(e));
    }    
}


async function getNodesProperties() {    
    await Promise.all(schema.nodeStructures.map(async (node) => {
        await getNodeProperties(node);
      }));
}


async function checkEdgeDirectionCardinality(d) {
    let queryFrom = `MATCH (from:${d.from})-[r:${d.edge.label}]->(to:${d.to}) WITH to, count(from) as rels WHERE rels > 1 RETURN rels LIMIT 1`;
    loggerLog(`Checking edge direction cardinality: ${queryFrom}`);     
    let responseFrom = await queryNeptune(queryFrom);
    let resultFrom = responseFrom.results[0];
    let queryTo = `MATCH (from:${d.from})-[r:${d.edge.label}]->(to:${d.to}) WITH from, count(to) as rels WHERE rels > 1 RETURN rels LIMIT 1`;
    loggerLog(`Checking edge direction cardinality: ${queryTo}`);
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
}


async function getSchemaViaSummaryAPI() {
    try {
        const response = await axios.get(`https://${HOST}:${PORT}/propertygraph/statistics/summary?mode=detailed`);
        response.data.payload.graphSummary.nodeLabels.forEach(label => {
            schema.nodeStructures.push({label:label, properties:[]});
            consoleOut('  Found node: ' + yellow(label));
        });

        response.data.payload.graphSummary.edgeLabels.forEach(label => {
            schema.edgeStructures.push({label:label, properties:[], directions:[]});
            consoleOut('  Found edge: ' + yellow(label));
        });

        return true;

    } catch (error) {
        loggerLog(`Getting the schema via Neptune Summary API failed: ${JSON.stringify(error)}`);
        return false;
    }    
}


async function getNeptuneSchema(quiet) {    
    
    VERBOSE = !quiet;
    
    try {
        await getAWSCredentials();
    } catch (error) {
        msg = "There are no AWS credentials configured. \nGetting the schema from an Amazon Neptune database with IAM authentication works only with AWS credentials.";        
        consoleOut(msg);
        loggerLog(msg + ': ' + JSON.stringify(error));
    }

    if (await getSchemaViaSummaryAPI()) {
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