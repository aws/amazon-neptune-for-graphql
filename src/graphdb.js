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
import { loggerInfo } from './logger.js';

let changeCase = true;

function checkForDuplicateNames(schema) {
    let names = [];
    schema.nodeStructures.forEach( node => { 
        let pascalCase = toPascalCase(node.label);
        if (names.includes(pascalCase)) {            
            changeCase = false;
        } else {
            names.push(pascalCase);             
        }
    });

    schema.edgeStructures.forEach( edge => { 
        let pascalCase = toPascalCase(edge.label);
        if (names.includes(pascalCase)) {            
            changeCase = false;
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
function replaceCleanseLabel(label) {
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

function graphDBInferenceSchema (graphbSchema, addMutations) {
    let r = '';
    const gdbs = JSON.parse(graphbSchema);

    checkForDuplicateNames(gdbs);

    gdbs.nodeStructures.forEach(node => {
        // node type
        let nodeCase = replaceCleanseLabel(node.label);
        if (changeCase) {
            nodeCase = toPascalCase(nodeCase);
        }

        if (node.label !== nodeCase) {
            r += `type ${nodeCase} @alias(property:"${node.label}") {\n`;
        }
        else {
            r += `type ${nodeCase} {\n`;
        }
        
        r += '\t_id: ID! @id\n';

        node.properties.forEach(property => {
            if (property.name == 'id') {
                r+= `\tid: ID\n`;
            }
            else {
                let propertyCase = replaceCleanseLabel(property.name);
                let alias = '';
                if (property.name !== propertyCase) {
                    alias = ` @alias(property: "${property.name}")`;
                }
                r+= `\t${propertyCase}: ${property.type}${alias}\n`;
            }
        });
        
        let edgeTypes = [];
        gdbs.edgeStructures.forEach(edge => {            
            edge.directions.forEach(direction => {
                let fromCase = replaceCleanseLabel(direction.from);
                fromCase = toPascalCase(fromCase);
                let toCase = replaceCleanseLabel(direction.to);
                toCase = toPascalCase(toCase);
                let edgeCase = replaceCleanseLabel(edge.label);
                edgeCase = toPascalCase(edgeCase);

                if (direction.from == node.label && direction.to == node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${nodeCase}Input, options: Options): [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                        r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${nodeCase}Input, options: Options): [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                    }
                    if (direction.relationship == 'ONE-ONE') {
                        r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}Out: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                        r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}In: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
                
                if (direction.from == node.label && direction.to != node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        r += `\t${toCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${toCase}Input, options: Options): [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                    }
                    if (direction.relationship == 'ONE-MANY') {
                        r += `\t${toCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${toCase}Input, options: Options): [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                    }
                    if (direction.relationship == 'MANY-ONE') {
                        r += `\t${toCase.toLocaleLowerCase() + edgeCase}Out: ${toCase} @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
                
                if (direction.from != node.label && direction.to == node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        r += `\t${fromCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${fromCase}Input, options: Options): [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`                       
                    }
                    if (direction.relationship == 'ONE-MANY') {
                        r += `\t${fromCase.toLocaleLowerCase() + edgeCase}In: ${fromCase} @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                    }
                    if (direction.relationship == 'MANY-ONE') {
                        r += `\t${fromCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${fromCase}Input, options: Options): [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
            });
        });

        const nodePropertyNames = new Set(node.properties.map((p) => p.name));

        // Add edge types
        edgeTypes.forEach((edgeType) => {
            // resolve any collision with node properties with the same name by adding an underscore prefix
            const aliasedEdgeType = nodePropertyNames.has(edgeType)
                ? `_${edgeType}`
                : edgeType;

            // Modify the case if configured
            const caseAdjustedEdgeType = changeCase
                ? toPascalCase(edgeType)
                : edgeType;

            r += `\t${replaceCleanseLabel(aliasedEdgeType)}:${replaceCleanseLabel(caseAdjustedEdgeType)}\n`;
        });

        r += '}\n\n';

        // input for the node type
        nodeCase = replaceCleanseLabel(node.label);
        r += `input ${toPascalCase(nodeCase)}Input {\n`;
        r += '\t_id: ID @id\n';
        node.properties.forEach(property => {
            let propertyCase = replaceCleanseLabel(property.name);
            if (property.name !== propertyCase) {
                r+= `\t${propertyCase}: ${property.type} @alias(property: "${property.name}")\n`;
            }
            else {
                r+= `\t${property.name}: ${property.type}\n`;
            }
        });
        r += '}\n\n';
    })

    // edge types
    gdbs.edgeStructures.forEach(edge => {
        // edge type
        let edgeCase = replaceCleanseLabel(edge.label);
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
            if (property.name == 'id') {
                r += `\tid: ID\n`;
            }
            else {
                let propertyCase = replaceCleanseLabel(property.name);
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
            let edgeCase = replaceCleanseLabel(edge.label);

            if (edge.label !== edgeCase) {
                r += `input ${toPascalCase(edgeCase)}Input @alias(property: "${edge.label}") {\n`;
            }
            else {
                r += `input ${toPascalCase(edgeCase)}Input {\n`;
            }
            edge.properties.forEach(property => {
                let propertyCase = replaceCleanseLabel(property.name);
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
    r += '}\n\n';

    // query
    r += `type Query {\n`;
    gdbs.nodeStructures.forEach(node => {
        let nodeCase = replaceCleanseLabel(node.label);
        let invalidNode = node.label !== nodeCase ? true : false;
        nodeCase = toPascalCase(nodeCase);
        
        if (invalidNode) {
            r += `\tgetNode${nodeCase}(filter: ${nodeCase}Input): ${nodeCase} @alias(property: "getNode${toPascalCase(node.label)}")\n`;
            r += `\tgetNode${nodeCase}s(filter: ${nodeCase}Input, options: Options): [${nodeCase}] @alias(property: "getNodes${toPascalCase(node.label)}")\n`;
        }
        else {
            r += `\tgetNode${nodeCase}(filter: ${nodeCase}Input): ${nodeCase}\n`;
            r += `\tgetNode${nodeCase}s(filter: ${nodeCase}Input, options: Options): [${nodeCase}]\n`;
        }
    });
    r += '}\n\n';

    // mutation
    if (addMutations) {
        r += `type Mutation {\n`;
        gdbs.nodeStructures.forEach(node => {
            let nodeCase = replaceCleanseLabel(node.label);
            let invalidNode = node.label !== nodeCase ? true : false;
            nodeCase = toPascalCase(nodeCase);
            if (invalidNode) {
                r += `\tcreateNode${nodeCase}(input: ${nodeCase}Input!): ${nodeCase} @alias(property: "createNode${node.label}")\n`;
                r += `\tupdateNode${nodeCase}(input: ${nodeCase}Input!): ${nodeCase} @alias(property: "updateNode${node.label}")\n`;
                r += `\tdeleteNode${nodeCase}(_id: ID!): Boolean @alias(property: "deleteNode${node.label}")\n`;
            }
            else {
                r += `\tcreateNode${nodeCase}(input: ${nodeCase}Input!): ${nodeCase}\n`;
                r += `\tupdateNode${nodeCase}(input: ${nodeCase}Input!): ${nodeCase}\n`;
                r += `\tdeleteNode${nodeCase}(_id: ID!): Boolean\n`;
            }
        });    

        gdbs.edgeStructures.forEach(edge => {
            edge.directions.forEach(direction => {
                let fromCase = replaceCleanseLabel(direction.from);
                let toCase = replaceCleanseLabel(direction.to);
                let edgeCase = replaceCleanseLabel(edge.label);
                let invalidDir = direction.from !== fromCase || direction.to !== toCase || edge.label !== edgeCase ? true : false;
                fromCase = toPascalCase(fromCase);
                toCase = toPascalCase(toCase);
                edgeCase = toPascalCase(edgeCase);

                if (edge.properties.length > 0) {               
                    if (invalidDir) {
                        r += `\tconnectNode${fromCase}ToNode${toCase}Edge${edgeCase}(from_id: ID!, to_id: ID!, edge: ${edgeCase}Input!): ${edgeCase} @alias(property: "connectNode${direction.from}ToNode${direction.to}Edge${edge.label}")\n`;
                        r += `\tupdateEdge${edgeCase}From${fromCase}To${toCase}(from_id: ID!, to_id: ID!, edge: ${edgeCase}Input!): ${edgeCase} @alias(property: "updateEdge${edge.label}From${direction.from}To${direction.to}")\n`;
                    }
                    else {
                        r += `\tconnectNode${fromCase}ToNode${toCase}Edge${edgeCase}(from_id: ID!, to_id: ID!, edge: ${edgeCase}Input!): ${edgeCase}\n`;
                        r += `\tupdateEdge${edgeCase}From${fromCase}To${toCase}(from_id: ID!, to_id: ID!, edge: ${edgeCase}Input!): ${edgeCase}\n`;
                    } 
                } else {
                    if (invalidDir) {
                        r += `\tconnectNode${fromCase}ToNode${toCase}Edge${edgeCase}(from_id: ID!, to_id: ID!): ${edgeCase} @alias(property: "connectNode${direction.from}ToNode${direction.to}Edge${edge.label}")\n`;
                    }
                    else {
                        r += `\tconnectNode${fromCase}ToNode${toCase}Edge${edgeCase}(from_id: ID!, to_id: ID!): ${edgeCase}\n`;
                    }
                }
                if (invalidDir) {
                    r += `\tdeleteEdge${edgeCase}From${fromCase}To${toCase}(from_id: ID!, to_id: ID!): Boolean @alias(property: "deleteEdge${edge.label}From${direction.from}To${direction.to}")\n`;
                }
                else {
                    r += `\tdeleteEdge${edgeCase}From${fromCase}To${toCase}(from_id: ID!, to_id: ID!): Boolean\n`;
                }
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


export { graphDBInferenceSchema, replaceCleanseLabel };