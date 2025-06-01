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

import { schemaStringify } from './schemaParser.js';
import { GraphQLID, print } from 'graphql';
import {gql} from 'graphql-tag'
import { loggerInfo, yellow } from "./logger.js";

let quiet = false;
// TODO change variables to local scope instead of global so this module can be used against multiple schemas
const typesToAdd = [];
const queriesToAdd = [];
const mutationsToAdd = [];
const enumTypes = [];
const customScalarTypes = [];

function lowercaseFirstCharacter(inputString) {
    if (inputString.length === 0) {     
      return inputString;
    }  
    const firstChar = inputString.charAt(0);
    const restOfString = inputString.slice(1);
    const lowercasedFirstChar = firstChar.toLowerCase();
    return lowercasedFirstChar + restOfString;
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
    const idField = getIdFieldWithDirective(def);

    // General Input type
    const scalarFields = getInputFields(def);
    typesToAdd.push(`input ${name}Input {\n${print(scalarFields)}\n}`);

    // Create Input type
    const createFields = [];
    for (const field of def.fields) {
        if (isScalarOrEnum(nullable(field.type))) {
            if (field.type?.kind === 'NonNullType' && field.type?.type?.name?.value === GraphQLID.name) {
                const idFieldCopy = {
                    ...field,
                    type: field.type.type
                };
                createFields.push(idFieldCopy);
            } else {
                createFields.push(field);
            }
        }
    }
    typesToAdd.push(`input ${name}CreateInput {\n${print(createFields)}\n}`);

    // Update Input type
    const updateFields = [];
    for (const field of def.fields) {
        if (isScalarOrEnum(nullable(field.type))) {
            if (field.type?.kind === 'NonNullType' && field.type?.type?.name?.value !== GraphQLID.name) {
                const fieldCopy = {
                    ...field,
                    type: field.type.type
                };
                updateFields.push(fieldCopy);
            } else {
                updateFields.push(field);
            }
        }
    }
    typesToAdd.push(`input ${name}UpdateInput {\n${print(updateFields)}\n}`);

    // Sort Input type
    const sortFields = scalarFields.map(scalarField => ({
        ...scalarField,
        type: {
            kind: 'NamedType',
            name: {kind: 'Name', value: 'SortDirection'}
        },
        directives: []
    }));
    typesToAdd.push(`input ${name}Sort {\n${print(sortFields)}\n}`);

    // Create query
    queriesToAdd.push(`getNode${name}(filter: ${name}Input): ${name}\n`);
    queriesToAdd.push(`getNode${name}s(filter: ${name}Input, options: Options, sort: [${name}Sort!]): [${name}]\n`);

    // Create mutation
    mutationsToAdd.push(`createNode${name}(input: ${name}CreateInput!): ${name}\n`);
    mutationsToAdd.push(`updateNode${name}(input: ${name}UpdateInput!): ${name}\n`);
    mutationsToAdd.push(`deleteNode${name}(${print(idFieldToInputValue(idField))}): Boolean\n`);

    loggerInfo(`Added input type: ${yellow(name+'Input')}`);
    loggerInfo(`Added input type: ${yellow(name+'CreateInput')}`);
    loggerInfo(`Added input type: ${yellow(name+'UpdateInput')}`);
    loggerInfo(`Added query: ${yellow('getNode' + name)}`);
    loggerInfo(`Added query: ${yellow('getNode' + name + 's')}`);
    loggerInfo(`Added mutation: ${yellow('createNode' + name)}`);
    loggerInfo(`Added mutation: ${yellow('updateNode' + name)}`);
    loggerInfo(`Added mutation: ${yellow('deleteNode' + name)}`);
}


function addEdge(from, to, edgeName) {    
    if (!typesToAdd.some((str) => str.startsWith(`type ${edgeName}`))) {

        // Create type
        typesToAdd.push(`type ${edgeName} {\n  _id: ID! @id\n}`);

        // Create mutation
        mutationsToAdd.push(`connectNode${from}ToNode${to}Edge${edgeName}(from_id: ID!, to_id: ID!): ${edgeName}\n`);    
        mutationsToAdd.push(`deleteEdge${edgeName}From${from}To${to}(from_id: ID!, to_id: ID!): Boolean\n`);

        loggerInfo(`Added type for edge: ${yellow(edgeName)}`);
        loggerInfo(`Added mutation: ${yellow(`connectNode${from}ToNode${to}Edge${edgeName}`)}`);
        loggerInfo(`Added mutation: ${yellow(`deleteEdge${edgeName}From${from}To${to}`)}`);
    }
}


function addFilterOptionsSortArguments(field) {
    // filter
    field.arguments.push({
        kind: 'InputValueDefinition',
        name: {
            kind: 'Name',
            value: 'filter'
        },
        type: {
            kind: 'NamedType',
            name: {
                kind: 'Name',
                value: field.type.type.name.value + 'Input'
            }
        }
    });

    // options
    field.arguments.push({
        kind: 'InputValueDefinition',
        name: {
            kind: 'Name',
            value: 'options'
        },
        type: {
            kind: 'NamedType',
            name: {
                kind: 'Name',
                value: 'Options'
            }
        }
    });

    // sort
    field.arguments.push({
        kind: 'InputValueDefinition',
        name: {
            kind: 'Name',
            value: 'sort'
        },
        type: {
            kind: 'NamedType',
            name: {
                kind: 'Name',
                value: field.type.type.name.value + 'Sort'
            }
        }
    });
}


function getIdFieldWithDirective(objTypeDef) {
    return objTypeDef.fields.find(
        field =>
            field.directives && field.directives.some(directive => directive.name.value === 'id')
    );
}

function getIdFieldByType(objTypeDef) {
    return objTypeDef.fields.find(field => field.type?.type?.kind === 'NamedType' && field.type?.type?.name?.value === GraphQLID.name);
}

function createIdDirective() {
    return {kind: 'Directive', name: {kind: 'Name', value: 'id'}, arguments: []};
}

function createIdFieldWithDirective() {
    return {
        kind: 'FieldDefinition',
        name: { kind: 'Name', value: '_id' },
        arguments: [],
        type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } } },
        directives: [createIdDirective()]
    };
}


function idFieldToInputValue({ name, type }) {
    return { kind: 'InputValueDefinition', name, type };
}


function getInputFields(objTypeDef) {
    return objTypeDef.fields.filter(field => isScalarOrEnum(nullable(field.type)));
}


function nullable(type) {
    return type.kind === 'NonNullType' ? type.type : type;
}


function isScalarOrEnum(type) {
    const scalarOrEnumTypes = ['String', 'Int', 'Float', 'Boolean', 'ID', ...enumTypes, ...customScalarTypes];
    return type.kind === 'NamedType' && scalarOrEnumTypes.includes(type.name.value);
}


function inferGraphDatabaseDirectives(schemaModel) {
    
    var currentType = '';
    let referencedType = '';
    let edgeName = '';
    schemaModel.definitions
        .filter(definition => definition.kind === 'EnumTypeDefinition')
        .forEach(definition => enumTypes.push(definition.name.value));

    // Generate sort enum
    typesToAdd.push(`enum SortDirection {\nASC\nDESC\n}`);

    schemaModel.definitions
        .filter(definition => definition.kind === 'ScalarTypeDefinition')
        .forEach(definition => customScalarTypes.push(definition.name.value));

    schemaModel.definitions.forEach(def => {
        if (def.kind == 'ObjectTypeDefinition') {
            if (!(def.name.value == 'Query' || def.name.value == 'Mutation')) {
                currentType = def.name.value;

                // Only add _id field to the object type if it doesn't have an ID field already
                if (!getIdFieldWithDirective(def)) {
                    // there is no field with @id directive
                    const idFieldByType = getIdFieldByType(def);
                    if (idFieldByType) {
                        // there is an ID field, add the missing @id directive
                        idFieldByType.directives.unshift(createIdDirective());
                    } else {
                        def.fields.unshift(createIdFieldWithDirective());
                    }
                }

                addNode(def);
                const edgesTypeToAdd = [];

                // add relationships
                def.fields.forEach(field => {                    
                    if (field.type.type !== undefined) {
                        // FIXME handle NonNullType wrapper
                        if (field.type.type.kind === 'NamedType' && field.type.type.name.value !== 'ID')
                        {
                            try {
                                if (field.type.kind === 'ListType')
                                    addFilterOptionsSortArguments(field);
                            }
                            catch {}

                            try {
                                referencedType = field.type.type.name.value;
                                edgeName = referencedType + 'Edge';
                                loggerInfo("Infer graph database directive in type: " + yellow(currentType) + " field: " + yellow(field.name.value) + " referenced type: " + yellow(referencedType) + " graph relationship: " + yellow(edgeName));
                                addRelationshipDirective(field, edgeName, 'OUT');
                                addEdge(currentType, referencedType, edgeName);
                                if (!edgesTypeToAdd.includes(edgeName)) edgesTypeToAdd.push(edgeName);                                
                            }                 
                            catch {}
                        }
                    } else if (field.type.name.value !== 'String' && 
                               field.type.name.value !== 'Int' && 
                               field.type.name.value !== 'Float' && 
                               field.type.name.value !== 'Boolean' &&
                               !enumTypes.includes(field.type.name.value) &&
                               !customScalarTypes.includes(field.type.name.value)) {
                            
                        referencedType = field.type.name.value;
                        edgeName = referencedType + 'Edge';
                        loggerInfo("Infer graph database directive in type: " + yellow(currentType) + " field: " + yellow(field.name.value) + " referenced type: " + yellow(referencedType) + " graph relationship: " + yellow(edgeName));
                        addRelationshipDirective(field, edgeName, 'OUT');
                        addEdge(currentType, referencedType, edgeName);
                        if (!edgesTypeToAdd.includes(edgeName)) edgesTypeToAdd.push(edgeName);
                    }
                });

                // add edges
                edgesTypeToAdd.forEach(edgeName => {
                    def.fields.push({
                        kind: "FieldDefinition",
                        name: { kind: "Name", value: lowercaseFirstCharacter(edgeName) },
                        arguments: [],
                        type: { kind: "NamedType", name: { kind: "Name", value: edgeName } },
                        directives: []
                    });
                });
                
            }
        }
    });

    typesToAdd.push('input Options {\n' +
        '\tlimit: Int\n' +
        '\toffset: Int\n' +
        '}\n');
    typesToAdd.push('input StringScalarFilters {\n' +
        '\teq: String\n' +
        '\tcontains: String\n' +
        '\tendsWith: String\n' +
        '\tstartsWith: String\n' +
        '}\n');

    return injectChanges(schemaModel);
}


function validatedSchemaModel (schemaModel, quietInput) {
    quiet = quietInput;    
    
    if (!isGraphDBDirectives(schemaModel)) {
        loggerInfo("The schema model does not contain any graph database directives.");
        schemaModel = inferGraphDatabaseDirectives(schemaModel);
    }    
 
    return schemaModel;
}


export { validatedSchemaModel };