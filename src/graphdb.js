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

// Changes every instance of invalid characters in the given label with the following delimiters
function replaceCleanseLabel(label) {
    const delimiterExclamation = "_exclamationmark_";
    const delimiterDollar = "_dollarsign_";
    const delimiterAmpersand = "_ampersand_";
    const delimiterOpenBracket = "_openbracket_";
    const delimiterCloseBracket = "_closebracket_";
    const delimiterPeriod = "_period_";
    const delimiterColon = "_colon_";
    const delimiterEqual = "_equal_";
    const delimiterAt = "_at_";
    const delimiterOpenSquareBracket = "_opensquarebracket_";
    const delimiterCloseSquareBracket = "_closesquarebracket_";
    const delimiterOpenCurlyBracket = "_opencurlybracket_";
    const delimiterVerticalBar = "_verticalbar_";
    const delimiterCloseCurlyBracket = "_closecurlybracket_";
    const delimiterHyphen = "_hyphen_";

    return label
        .replaceAll("!", delimiterExclamation)
        .replaceAll("$", delimiterDollar)
        .replaceAll("&", delimiterAmpersand)
        .replaceAll("(", delimiterOpenBracket)
        .replaceAll(")", delimiterCloseBracket)
        .replaceAll(".", delimiterPeriod)
        .replaceAll(":", delimiterColon)
        .replaceAll("=", delimiterEqual)
        .replaceAll("@", delimiterAt)
        .replaceAll("[", delimiterOpenSquareBracket)
        .replaceAll("]", delimiterCloseSquareBracket)
        .replaceAll("{", delimiterOpenCurlyBracket)
        .replaceAll("|", delimiterVerticalBar)
        .replaceAll("}", delimiterCloseCurlyBracket)
        .replaceAll("-", delimiterHyphen);
}

function checkInvalidChar(label) {
    let identify = /[:.-]/;
    return identify.test(label);
}


function graphDBInferenceSchema (graphbSchema, addMutations) {
    let r = '';
    let invalidNode = false;
    const gdbs = JSON.parse(graphbSchema);

    checkForDuplicateNames(gdbs);

    gdbs.nodeStructures.forEach(node => {
        // node type
        invalidNode = checkInvalidChar(node.label);
        let nodeCase = invalidNode ? replaceCleanseLabel(node.label) : node.label;
        if (changeCase && invalidNode || changeCase) {
            r += `type ${toPascalCase(nodeCase)} @alias(property:"${node.label}") {\n`;
        }
        else if (invalidNode) {
            r += `type ${nodeCase} @alias(property:"${node.label}") {\n`;
        }
        else {
            r += `type ${nodeCase} {\n`;
        }
        
        r += '\t_id: ID! @id\n';

        node.properties.forEach(property => {
            if (property.name == 'id')
                r+= `\tid: ID\n`;
            else if (checkInvalidChar(property.name)) {
                r+= `\t${replaceCleanseLabel(property.name)}: ${property.type} @alias(property: "${property.name}")\n`;
            }
            else
                r+= `\t${property.name}: ${property.type}\n`;
        });
        
        let edgeTypes = [];
        gdbs.edgeStructures.forEach(edge => {            
            edge.directions.forEach(direction => {
                invalidNode = checkInvalidChar(node.label);
                let invalidDirFrom = checkInvalidChar(direction.from);
                let invalidDirTo = checkInvalidChar(direction.to);
                let invalidEdge = checkInvalidChar(edge.label);

                let nodeCase = invalidNode ? replaceCleanseLabel(node.label) : node.label;
                nodeCase = toPascalCase(nodeCase);
                let fromCase = invalidDirFrom ? replaceCleanseLabel(direction.from) : direction.from;
                fromCase = toPascalCase(fromCase);
                let toCase = invalidDirTo ? replaceCleanseLabel(direction.to) : direction.to;
                toCase = toPascalCase(toCase);
                let edgeCase = invalidEdge ? replaceCleanseLabel(edge.label) : edge.label;
                edgeCase = toPascalCase(edgeCase);

                if (direction.from == node.label && direction.to == node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        if (invalidNode || invalidEdge) {
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${nodeCase}Input, options: Options): [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:OUT) @alias(property: "${node.label.toLocaleLowerCase() + toPascalCase(edge.label)}sOut")\n`;
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${nodeCase}Input, options: Options): [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:IN) @alias(property: "${node.label.toLocaleLowerCase() + toPascalCase(edge.label)}sIn")\n`;
                        }
                        else {
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${nodeCase}Input, options: Options): [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${nodeCase}Input, options: Options): [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                        }
                    }
                    if (direction.relationship == 'ONE-ONE') {
                        if (invalidNode || invalidEdge) {
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}Out: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:OUT) @alias(property: "${node.label.toLocaleLowerCase() + toPascalCase(edge.label)}Out")\n`;
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}In: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:IN) @alias(property: "${node.label.toLocaleLowerCase() + toPascalCase(edge.label)}In")\n`;
                        }
                        else {
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}Out: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                            r += `\t${nodeCase.toLocaleLowerCase() + edgeCase}In: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                        }
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
                
                if (direction.from == node.label && direction.to != node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        if (invalidDirTo || invalidEdge) {
                            r += `\t${toCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${toCase}Input, options: Options): [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT) @alias(property: "${toPascalCase(direction.to).toLocaleLowerCase() + toPascalCase(edge.label)}sOut")\n`;
                        }
                        else {
                            r += `\t${toCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${toCase}Input, options: Options): [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                        }
                    }
                    if (direction.relationship == 'ONE-MANY') {
                        if (invalidDirTo || invalidEdge) {
                            r += `\t${toCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${toCase}Input, options: Options): [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT) @alias(property: "${toPascalCase(direction.to).toLocaleLowerCase() + toPascalCase(edge.label)}sOut")\n`;
                        }
                        else {
                            r += `\t${toCase.toLocaleLowerCase() + edgeCase}sOut(filter: ${toCase}Input, options: Options): [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                        }
                    }
                    if (direction.relationship == 'MANY-ONE') {
                        if (invalidDirTo || invalidEdge) {
                            r += `\t${toCase.toLocaleLowerCase() + edgeCase}Out: ${toCase} @relationship(edgeType:"${edge.label}", direction:OUT) @alias(property: "${toPascalCase(direction.to).toLocaleLowerCase() + toPascalCase(edge.label)}Out")\n`;
                        }
                        else {
                            r += `\t${toCase.toLocaleLowerCase() + edgeCase}Out: ${toCase} @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                        }
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
                
                if (direction.from != node.label && direction.to == node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        if (invalidDirFrom || invalidEdge) {
                            r += `\t${fromCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${fromCase}Input, options: Options): [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN) @alias(property: "${toPascalCase(direction.from).toLocaleLowerCase() + toPascalCase(edge.label)}sIn")\n`                       
                        }
                        else {
                            r += `\t${fromCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${fromCase}Input, options: Options): [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`                       
                        }
                    }
                    if (direction.relationship == 'ONE-MANY') {
                        if (invalidDirFrom || invalidEdge) {
                            r += `\t${fromCase.toLocaleLowerCase() + edgeCase}In: ${fromCase} @relationship(edgeType:"${edge.label}", direction:IN) @alias(property: "${toPascalCase(direction.from).toLocaleLowerCase() + toPascalCase(edge.label)}In")\n`;
                        }
                        else {
                            r += `\t${fromCase.toLocaleLowerCase() + edgeCase}In: ${fromCase} @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                        }
                    }
                    if (direction.relationship == 'MANY-ONE') {
                        if (invalidDirFrom || invalidEdge) {
                            r += `\t${fromCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${fromCase}Input, options: Options): [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN) @alias(property: "${toPascalCase(direction.from).toLocaleLowerCase() + toPascalCase(edge.label)}sIn")\n`;
                        }
                        else {
                            r += `\t${fromCase.toLocaleLowerCase() + edgeCase}sIn(filter: ${fromCase}Input, options: Options): [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                        }
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

            r += `\t${aliasedEdgeType}:${caseAdjustedEdgeType}`;
        });

        r += '}\n\n';

        // input for the node type
        let invalidNode2 = checkInvalidChar(node.label);
        let nodeCase2 = invalidNode2 ? replaceCleanseLabel(node.label) : node.label;

        if (invalidNode2) {
            r += `input ${toPascalCase(nodeCase2)}Input @alias(property: "${node.label}") {\n`;
        }
        else {
            r += `input ${toPascalCase(nodeCase2)}Input {\n`;
        }
        r += '\t_id: ID @id\n';
        node.properties.forEach(property => {
            if (checkInvalidChar(property.name)) {
                r+= `\t${replaceCleanseLabel(property.name)}: ${property.type} @alias(property: "${property.name}")\n`;
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
        let invalidEdge = checkInvalidChar(edge.label);
        let edgeCase = invalidEdge ? replaceCleanseLabel(edge.label) : edge.label;
        if (changeCase && invalidEdge || changeCase) {
            edgeCase = toPascalCase(edgeCase);
            r += `type ${edgeCase} @alias(property:"${edge.label}") {\n`;  
        }
        else if (invalidEdge) {
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
            else if (checkInvalidChar(property.name)) {
                r += `\t${replaceCleanseLabel(property.name)}: ${property.type} @alias(property: "${property.name}")\n`;
            }
            else {
                r += `\t${property.name}: ${property.type}\n`;
            }
        });
        r += '}\n\n';

        // input for the edge type
        if (edge.properties.length > 0) {       
            let invalidEdge = checkInvalidChar(edge.label);
            let edgeCase = invalidEdge ? replaceCleanseLabel(edge.label) : edge.label;

            if (invalidEdge) {
                r += `input ${toPascalCase(edgeCase)}Input @alias(property: "${edge.label}") {\n`;
            }
            else {
                r += `input ${toPascalCase(edgeCase)}Input {\n`;
            }
            edge.properties.forEach(property => {
                if (checkInvalidChar(property.name)) {
                    r += `\t${replaceCleanseLabel(property.name)}: ${property.type} @alias(property: "${property.name}")\n`;
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
        let invalidNode = checkInvalidChar(node.label);
        let nodeCase = invalidNode ? replaceCleanseLabel(node.label) : node.label;
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
            let invalidNode = checkInvalidChar(node.label);
            let nodeCase = invalidNode ? replaceCleanseLabel(node.label) : node.label;
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
                let invalidDir = checkInvalidChar(direction.from) || checkInvalidChar(direction.to) || checkInvalidChar(edge.label);

                let fromCase = checkInvalidChar(direction.from) ? replaceCleanseLabel(direction.from) : direction.from;
                fromCase = toPascalCase(fromCase);
                let toCase = checkInvalidChar(direction.to) ? replaceCleanseLabel(direction.to) : direction.to;
                toCase = toPascalCase(toCase);
                let edgeCase = checkInvalidChar(edge.label) ? replaceCleanseLabel(edge.label) : edge.label;
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


export { graphDBInferenceSchema };