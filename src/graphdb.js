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
import { loggerDebug, loggerInfo } from './logger.js';

let changeCase = true;

function checkForDuplicateNames(schema) {
    let names = [];
    schema.nodeStructures.forEach( node => { 
        let pascalCase = toPascalCase(node.label);
        if (names.includes(pascalCase)) {            
            changeCase = false;
            loggerDebug(`Node label '${node.label}' was detected as a duplicate. It is recommended to resolve duplicate labels.`, {toConsole: true});
        } else {
            names.push(pascalCase);             
        }
    });

    schema.edgeStructures.forEach( edge => { 
        let pascalCase = toPascalCase(edge.label);
        if (names.includes(pascalCase)) {            
            changeCase = false;
            loggerDebug(`Edge label '${edge.label}' was detected as a duplicate. It is recommended to resolve duplicate labels.`, {toConsole: true});
        } else {
            names.push(pascalCase);             
        }
    });

    if (!changeCase)
        loggerInfo('Pascal case is not applicable, duplicate names types.', {toConsole: true});
}


// Write a function that takes an input a string and return the string lowercase except the first character uppercase
function toPascalCase (str) {
    let r = '';
    if (changeCase) {        
        const words = str.split(' ');
        words.forEach(word => {
            r += word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()+ ' ';
        });
    } else {
        r = str;
    }
    return r.trim();
}

// Changes every instance of invalid characters in the given label with the following abbreviations
function cleanseLabel(label) {
    return label
        .replaceAll("!", "_ex_")
        .replaceAll("$", "_dol_")
        .replaceAll("&", "_amp_")
        .replaceAll("(", "_op_")
        .replaceAll(")", "_cp_")
        .replaceAll(".", "_dot_")
        .replaceAll(":", "_cn_")
        .replaceAll("=", "_eq_")
        .replaceAll("@", "_at_")
        .replaceAll("[", "_os_")
        .replaceAll("]", "_cs_")
        .replaceAll("{", "_oc_")
        .replaceAll("|", "_vb_")
        .replaceAll("}", "_cc_")
        .replaceAll("-", "_hy_");
}

/**
 * Extracts node properties, ensuring each node has an ID property and any properties with special characters are 
 * sanitized and aliased accordingly.
 *
 * @param {Object} node - The node object containing properties
 * @param {Array<Object>} node.properties - Array of property objects
 * @param {string} node.properties[].name - Property name
 * @param {string} node.properties[].type - Property type
 * @returns {Array<Object>} Formatted property objects with name, optional alias, and type
 */
function extractNodeProperties(node= {}) {
    if (!node?.properties) {
        return [];
    }
    const nodeProperties = node.properties.map(property => {
        const sanitizedLabel = cleanseLabel(property.name);
        return {
            name: sanitizedLabel,
            alias: property.name !== sanitizedLabel ? property.name : null,
            type: property.name === 'id' ? 'ID' : property.type
        };
    });
    if (!nodeProperties.some(property => property.type === 'ID')) {
        nodeProperties.unshift({
            name: '_id',
            alias: null,
            type: 'ID'
        });
    }
    return nodeProperties;
}

/**
 * Formats an array of property objects into a GraphQL schema string representation.
 * Each property is formatted with its name, type, and optional alias.
 *
 * @param {Array<Object>} [properties=[]] - Array of property objects to format
 * @param {string} properties[].name - The name of the property
 * @param {string} properties[].type - The data type of the property
 * @param {string} [properties[].alias] - Optional alias for the property
 * @param {Map<string, string>} [typeOverrides=new Map()] - Map of type overrides where key is the original type and value is the new type
 * @returns {string} Formatted string with each property on a new line, indented with a tab
 */
function formatProperties(properties = [], typeOverrides = new Map()) {
    return properties.map(({ name, type, alias }) => {
        const resolvedType = typeOverrides.get(type) ?? type;
        const resolvedAlias = alias? ` @alias(property: "${alias}")` : '';
        return `\t${name}: ${resolvedType}${resolvedAlias}\n`;
    }).join('');
}

/**
 * Generates a GraphQL schema for a graph database based on provided node and edge structures.
 *
 * This function takes a graph database schema definition and transforms it into a complete GraphQL schema
 * with types, inputs, queries, and optionally mutations. It handles node and edge relationships,
 * property definitions, filtering, sorting, and pagination.
 *
 * @param {string} graphdbSchema - A JSON string representing the graph database schema with nodeStructures and edgeStructures
 * @param {boolean} addMutations - Whether to include mutation operations in the generated schema
 * @param {string} queryPrefix='' - Prefix to add to all query operation names
 * @param {string} mutationPrefix='' - Prefix to add to all mutation operation names
 *
 * @returns {string} A complete GraphQL schema definition as a string
 */
function graphDBInferenceSchema (graphdbSchema, { addMutations = true, queryPrefix = '', mutationPrefix = ''} = {}) {
    let r = '';
    const gdbs = JSON.parse(graphdbSchema);

    checkForDuplicateNames(gdbs);

    // sorting direction enum
    r += `enum SortingDirection {\n`;
    r += '\tASC\n';
    r += '\tDESC\n';
    r += '}\n\n';

    gdbs.nodeStructures.forEach(node => {
        // node type
        let nodeCase = cleanseLabel(node.label);
        if (changeCase) {
            nodeCase = toPascalCase(nodeCase);
        }

        if (node.label !== nodeCase) {
            r += `type ${nodeCase} @alias(property:"${node.label}") {\n`;
        }
        else {
            r += `type ${nodeCase} {\n`;
        }

        const nodeProperties = extractNodeProperties(node);
        r += formatProperties(nodeProperties, new Map([['ID', 'ID! @id']]));
        
        let edgeTypes = [];
        gdbs.edgeStructures.forEach(edge => {            
            edge.directions.forEach(direction => {
                let fromCase = toPascalCase(cleanseLabel(direction.from));
                let toCase = toPascalCase(cleanseLabel(direction.to));
                let edgeCase = toPascalCase(cleanseLabel(edge.label));

                if (direction.from === node.label && direction.to === node.label){
                    switch (direction.relationship) {
                        case 'MANY-MANY':
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${nodeCase}Input, options: Options, sort: [${nodeCase}Sort!]): [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${nodeCase}Input, options: Options, sort: [${nodeCase}Sort!]): [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                            break;
                        case 'ONE-ONE':
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}Out: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}In: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                            break;
                        default:
                            loggerInfo(`Unknown relationship type for edge from ${direction.from} to ${direction.to}: ${direction.relationship}`, {toConsole: true});
                            break;
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }

                if (direction.from === node.label && direction.to !== node.label) {
                    switch (direction.relationship) {
                        case 'MANY-MANY':
                        case 'ONE-MANY':
                            r += `\t${toCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${toCase}Input, options: Options, sort: [${toCase}Sort!]): [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                            break;
                        case 'MANY-ONE':
                        case 'ONE-ONE':
                            r += `\t${toCase.toLocaleLowerCase() + edgeCase}Out: ${toCase} @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                            break;
                        default:
                            loggerInfo(`Unknown relationship type for edge from ${direction.from} to ${direction.to}: ${direction.relationship}`, {toConsole: true});
                            break;
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);
                }

                if (direction.from !== node.label && direction.to === node.label) {
                    switch (direction.relationship) {
                        case 'MANY-MANY':
                        case 'MANY-ONE':
                            r += `\t${fromCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${fromCase}Input, options: Options, sort: [${fromCase}Sort!]): [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`
                            break;
                        case 'ONE-MANY':
                        case 'ONE-ONE':
                            r += `\t${fromCase.toLocaleLowerCase() + edgeCase}In: ${fromCase} @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                            break;
                        default:
                            loggerInfo(`Unknown relationship type for edge from ${direction.from} to ${direction.to}: ${direction.relationship}`, {toConsole: true});
                            break;
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
            });
        });

        // Add edge field types
        edgeTypes.forEach((edgeType) => {
            // resolve any collision with node properties with the same name by adding an underscore prefix
            const aliasedEdgeType = nodeProperties.some(property => property.name === edgeType)
                ? `_${edgeType}`
                : edgeType;

            // Modify the case if configured
            const caseAdjustedEdgeType = changeCase
                ? toPascalCase(edgeType)
                : edgeType;

            r += `\t${cleanseLabel(aliasedEdgeType)}:${cleanseLabel(caseAdjustedEdgeType)}\n`;
        });

        r += '}\n\n';

        // input for the node type
        r += `input ${nodeCase}Input {\n`;
        r += formatProperties(nodeProperties, new Map([['ID', 'ID @id'], ['String', 'StringScalarFilters']]));
        r += '}\n\n';
        
        if (addMutations) {
            // Create input for mutations
            r += `input ${nodeCase}CreateInput {\n`;
            r += formatProperties(nodeProperties, new Map([['ID', 'ID @id']]));
            r += '}\n\n';

            // Update input for mutations
            r += `input ${nodeCase}UpdateInput {\n`;
            r += formatProperties(nodeProperties, new Map([['ID', 'ID! @id']]));
            r += '}\n\n';
        }

        // sort input
        const sortProperties = nodeProperties.map(prop => ({
            ...prop,
            type: 'SortingDirection'
        }));
        r += `input ${nodeCase}Sort {\n`;
        r += formatProperties(sortProperties);
        r += '}\n\n';
    })

    const nodeLabels = new Set(gdbs.nodeStructures.map((n) => n.label));

    // edge types
    gdbs.edgeStructures.forEach(edge => {
        // edge type

        // resolve potential conflict between the edge label and node label by prefixing with an underscore
        let edgeCase = nodeLabels.has(edge.label)
            ? `_${cleanseLabel(edge.label)}`
            : cleanseLabel(edge.label);

        if (changeCase) {
            edgeCase = toPascalCase(edgeCase);
        }
        if (edge.label !== edgeCase) {
            r += `type ${edgeCase} @alias(property:"${edge.label}") {\n`;  
        }
        else {
            r += `type ${edgeCase} {\n`;
        }
        r += '\t_id: ID! @id\n';

        edge.properties.forEach(property => {
            if (property.name === 'id') {
                r += `\tid: ID\n`;
            }
            else {
                let propertyCase = cleanseLabel(property.name);
                let alias = '';
                if (property.name !== propertyCase) {
                    alias = ` @alias(property: "${property.name}")`;
                }
                r+= `\t${propertyCase}: ${property.type}${alias}\n`;
            }
        });
        r += '}\n\n';

        // input for the edge type
        if (edge.properties.length > 0) {       
            r += `input ${edgeCase}Input {\n`;

            edge.properties.forEach(property => {
                let propertyCase = cleanseLabel(property.name);
                if (property.name !== propertyCase) {
                    r += `\t${propertyCase}: ${property.type} @alias(property: "${property.name}")\n`;
                }
                else {
                    r+= `\t${property.name}: ${property.type}\n`;
                }
            });
            r += '}\n\n';
        }
    });

    // input options
    r += `input Options {\n`;
    r += `\tlimit:Int\n`;
    r += `\toffset:Int\n`;
    r += '}\n\n';
    
    r += 'input StringScalarFilters {\n' +
        '\teq: String\n' +
        '\tcontains: String\n' +
        '\tendsWith: String\n' +
        '\tstartsWith: String\n' +
        '}\n\n';

    // query
    r += `type Query {\n`;
    gdbs.nodeStructures.forEach(node => {
        let nodeCase = toPascalCase(cleanseLabel(node.label));
        r += `\t${queryPrefix}get${nodeCase}(filter: ${nodeCase}Input): ${nodeCase}\n`;
        r += `\t${queryPrefix}get${nodeCase}s(filter: ${nodeCase}Input, options: Options, sort: [${nodeCase}Sort!]): [${nodeCase}]\n`;
    });
    r += '}\n\n';

    // mutation
    if (addMutations) {
        r += `type Mutation {\n`;
        gdbs.nodeStructures.forEach(node => {
            let nodeCase = toPascalCase(cleanseLabel(node.label));
            r += `\t${mutationPrefix}create${nodeCase}(input: ${nodeCase}CreateInput!): ${nodeCase}\n`;
            r += `\t${mutationPrefix}update${nodeCase}(input: ${nodeCase}UpdateInput!): ${nodeCase}\n`;
            r += `\t${mutationPrefix}delete${nodeCase}(_id: ID!): Boolean\n`;
        });    

        gdbs.edgeStructures.forEach(edge => {
            edge.directions.forEach(direction => {
                let fromCase = toPascalCase(cleanseLabel(direction.from));
                let toCase = toPascalCase(cleanseLabel(direction.to));
                let edgeCase = toPascalCase(cleanseLabel(edge.label));

                if (edge.properties.length > 0) {               
                    r += `\t${mutationPrefix}connect${fromCase}To${toCase}Through${edgeCase}(from_id: ID!, to_id: ID!, edge: ${edgeCase}Input!): ${edgeCase}\n`;
                    r += `\t${mutationPrefix}update${edgeCase}ConnectionFrom${fromCase}To${toCase}(from_id: ID!, to_id: ID!, edge: ${edgeCase}Input!): ${edgeCase}\n`;
                } else {
                    r += `\t${mutationPrefix}connect${fromCase}To${toCase}Through${edgeCase}(from_id: ID!, to_id: ID!): ${edgeCase}\n`;
                }
                r += `\t${mutationPrefix}delete${edgeCase}ConnectionFrom${fromCase}To${toCase}(from_id: ID!, to_id: ID!): Boolean\n`;
            });
        });
        r += '}\n\n';
    }

    if (addMutations) {
        r += `schema {
            query: Query
            mutation: Mutation
        }`;
    } else {
        r += `schema {
            query: Query            
        }`;
    }
    
    return r;
}


export { graphDBInferenceSchema };