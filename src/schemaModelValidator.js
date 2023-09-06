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

import { schemaParser, schemaStringify } from './schemaParser.js';
import {gql} from 'graphql-tag'

let quite = false;
const typesToAdd = [];
const queriesToAdd = [];
const mutationsToAdd = [];

function yellow(text) {
    return '\x1b[33m' + text + '\x1b[0m';
}


function isGraphDBDirectives(schemaModel) {
    let r = false;
    schemaModel.definitions.forEach(def => {
        if (def.kind == 'ObjectTypeDefinition') {
            def.fields.forEach(field => {
                if (field.directives) {
                    field.directives.forEach(directive => {
                        if (directive.name.value == 'cypher') {
                            r = true;
                        }
                        if (directive.name.value == 'graphQuery') {
                            r = true;
                        }
                        if (directive.name.value == 'relationship') {
                            r = true;
                        }
                    });
                }
            });
        }
    });
    return r;
}


function addRelationshipDirective(field, type, direction) {
    field.directives.push({
        kind: 'Directive',
        name: {
            kind: 'Name',
            value: 'relationship'
        },
        arguments: [
        {
            kind: 'Argument',
            name: {
                kind: 'Name',
                value: 'type'
            },
            value: {
                kind: 'StringValue',
                value: type,
                block: false
            }
        },
        {
            kind: 'Argument',
            name: {
                kind: 'Name',
                value: 'direction'
            },
            value: {
                kind: 'EnumValue',
                value: direction
            }
        }
    ]
    });

}


function injectChanges(schemaModel) {
    let r = '';
    
    let stringModel = schemaStringify(schemaModel, true);

    stringModel += '\n';

    typesToAdd.forEach(type => {
        stringModel += '\n' + type + '\n';        
    });
        
    if (!stringModel.includes('type Query {'))
        stringModel += '\ntype Query {\n}\n';

    if (!stringModel.includes('type Mutation {'))
        stringModel += '\ntype Mutation {\n}\n';

    if (!stringModel.includes('schema {'))
        stringModel += '\nschema {\n    query: Query\n    mutation: Mutation\n}\n';

    const lines = stringModel.split('\n');
    
    lines.forEach(line => {
        r += line + '\n';
        if (line.includes('type Query {')) {
            queriesToAdd.forEach(query => {
                r += "  " + query;            
            });
        }

        if (line.includes('type Mutation {')) {
            mutationsToAdd.forEach(mutation => {
                r += "  " + mutation;            
            });
        }
    });

    return gql(r);
}


function addNode(def) {
    let name = def.name.value;
    
    // Input fields    
    let inputFields = '';
    def.fields.forEach(field => {
        try {
            if (field.type.name.value === 'String' || field.type.name.value === 'Int' || field.type.name.value === 'Float' || field.type.name.value === 'Boolean')
                inputFields += `\n  ${field.name.value}: ${field.type.name.value}`;            
        } catch {}
    });

    // Create Input type
    typesToAdd.push(`input ${name}Input {${inputFields}\n}`);    

    // Create query
    queriesToAdd.push(`getNode${name}(id: ID, filter: ${name}Input): ${name}\n`);
    queriesToAdd.push(`getNode${name}s(filter: ${name}Input): [${name}]\n`);

    // Create mutation
    mutationsToAdd.push(`createNode${name}(input: ${name}Input!): ${name}\n`);
    mutationsToAdd.push(`updateNode${name}(id: ID!, input: ${name}Input!): ${name}\n`);
    mutationsToAdd.push(`deleteNode${name}(id: ID!): Boolean\n`);

    if (!quite) console.log(`Added input type: ${yellow(name+'Input')}`);
    if (!quite) console.log(`Added query: ${yellow('getNode' + name)}`);
    if (!quite) console.log(`Added query: ${yellow('getNode' + name + 's')}`);
    if (!quite) console.log(`Added mutation: ${yellow('createNode' + name)}`);
    if (!quite) console.log(`Added mutation: ${yellow('updateNode' + name)}`);
    if (!quite) console.log(`Added mutation: ${yellow('deleteNode' + name)}`);
}


function addEdge(from, to, edgeName) {
    // Create type
    typesToAdd.push(`type ${edgeName} {\n  id:ID! \n}`);

    // Create mutation
    mutationsToAdd.push(`connectNode${from}ToNode${to}Edge${edgeName}(from: ID!, to: ID!): ${edgeName}\n`);    
    mutationsToAdd.push(`deleteEdge${edgeName}From${from}To${to}(from: ID!, to: ID!): Boolean\n`);

    if (!quite) console.log(`Added type for edge: ${yellow(edgeName)}`);
    if (!quite) console.log(`Added mutation: ${yellow(`connectNode${from}ToNode${to}Edge${edgeName}`)}`);
    if (!quite) console.log(`Added mutation: ${yellow(`deleteEdge${edgeName}From${from}To${to}`)}`);
}


function inferGraphDatabaseDirectives(schemaModel) {
    
    var currentType = '';

    schemaModel.definitions.forEach(def => {
        if (def.kind == 'ObjectTypeDefinition') {
            if (!(def.name.value == 'Query' || def.name.value == 'Mutation')) {
                currentType = def.name.value;
                addNode(def);
                def.fields.forEach(field => {
                    if (field.type.type !== undefined) {
                        if (field.type.type.kind == 'NamedType' && field.type.type.name.value != 'ID')
                        {
                            try {
                                var referencedType = field.type.type.name.value;
                                const edgeName = referencedType + 'Edge';
                                if (!quite) console.log("Infer graph database directive in type: " + yellow(currentType) + " field: " + yellow(field.name.value) + " referenced type: " + yellow(referencedType) + " graph relationship: " + yellow(edgeName));                                
                                addRelationshipDirective(field, edgeName, 'OUT');
                                addEdge(currentType, referencedType, edgeName);                   
                            }
                        catch {}
                        }
                    }
                });
            }
        }
    });

    return injectChanges(schemaModel);
}


function validatedSchemaModel (schemaModel, quite) {
    quite = quite;    
    
    if (!isGraphDBDirectives(schemaModel)) {
        console.log("The schema model does not contain any graph database directives.");
        schemaModel = inferGraphDatabaseDirectives(schemaModel);
    }    
 
    return schemaModel;
}


export { validatedSchemaModel };