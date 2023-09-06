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
        console.log('Pascal case is not applicable, duplicate names types.');                        
}


// Write a function that takes an input a string and return the string lowercase except the first charachter uppercase
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


function graphDBInferenceSchema (graphbSchema, addMutations) {
    let r = '';
    const gdbs = JSON.parse(graphbSchema);

    checkForDuplicateNames(gdbs);

    gdbs.nodeStructures.forEach(node => {
        // node type
        let nodeCase = node.label;
        if (changeCase) {
            nodeCase = toPascalCase(node.label); 
            r += `type ${nodeCase} @alias(property:"${node.label}") {\n`;
        } else {
            r += `type ${nodeCase} {\n`;
        }
        
        r += '\tid: ID!\n';

        node.properties.forEach(property => {
            r+= `\t${property.name}: ${property.type}\n`;
        });

        let edgeTypes = [];
        gdbs.edgeStructures.forEach(edge => {            
            edge.directions.forEach(direction => {
                let fromCase = toPascalCase(direction.from);
                let toCase = toPascalCase(direction.to);
                if (direction.from == node.label && direction.to == node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        r += `\t${nodeCase.toLocaleLowerCase()}sOut: [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                        r += `\t${nodeCase.toLocaleLowerCase()}sIn: [${nodeCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`;                    
                    }
                    if (direction.relationship == 'ONE-ONE') {
                        r += `\t${nodeCase.toLocaleLowerCase()}Out: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:OUT)\n`;
                        r += `\t${nodeCase.toLocaleLowerCase()}In: ${nodeCase} @relationship(edgeType:"${edge.label}", direction:IN)\n`;
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
                
                if (direction.from == node.label && direction.to != node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        r += `\t${toCase.toLocaleLowerCase()}sOut: [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`
                    }
                    if (direction.relationship == 'ONE-MANY') {
                        r += `\t${toCase.toLocaleLowerCase()}sOut: [${toCase}] @relationship(edgeType:"${edge.label}", direction:OUT)\n`
                    }
                    if (direction.relationship == 'MANY-ONE') {
                        r += `\t${toCase.toLocaleLowerCase()}Out: ${toCase} @relationship(edgeType:"${edge.label}", direction:OUT)\n`
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
                
                if (direction.from != node.label && direction.to == node.label){
                    if (direction.relationship == 'MANY-MANY') {
                        r += `\t${fromCase.toLocaleLowerCase()}sIn: [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`                       
                    }
                    if (direction.relationship == 'ONE-MANY') {
                        r += `\t${fromCase.toLocaleLowerCase()}In: ${fromCase} @relationship(edgeType:"${edge.label}", direction:IN)\n` 
                    }
                    if (direction.relationship == 'MANY-ONE') {
                        r += `\t${fromCase.toLocaleLowerCase()}sIn: [${fromCase}] @relationship(edgeType:"${edge.label}", direction:IN)\n`
                    }
                    if (!edgeTypes.includes(edge.label))
                        edgeTypes.push(edge.label);                                      
                }
            });
        });

        // Add edge types
        edgeTypes.forEach(edgeType => {
            if (changeCase) {
                r += `\t${edgeType}:${toPascalCase(edgeType)}`
            } else {
                r += `\t${edgeType}:${edgeType}`
            }
        });

        r += '}\n\n';

        // input for the node type
        r += `input ${nodeCase}Input {\n`;        
        node.properties.forEach(property => {
            r+= `\t${property.name}: ${property.type}\n`;
        });
        r += '}\n\n';
    })

    // edge types
    gdbs.edgeStructures.forEach(edge => {
        // edge type
        let edgeCase = edge.label;
        if (changeCase) {
            edgeCase = toPascalCase(edge.label);
            r += `type ${edgeCase} @alias(property:"${edge.label}") {\n`;        
        } else {
            r += `type ${edgeCase} {\n`;
        }
        r += '\tid: ID!\n';

        edge.properties.forEach(property => {
            r+= `\t${property.name}: ${property.type}\n`;
        });
        r += '}\n\n';

        // input for the edge type
        if (edge.properties.length > 0) {            
            r += `input ${edgeCase}Input {\n`;        
            edge.properties.forEach(property => {
                r+= `\t${property.name}: ${property.type}\n`;
            });
            r += '}\n\n';
        }
    });

    // query
    r += `type Query {\n`;
    gdbs.nodeStructures.forEach(node => {
        let nodeCase = toPascalCase(node.label); 
        r += `\tgetNode${nodeCase}(id: ID, filter: ${nodeCase}Input): ${nodeCase}\n`;
        r += `\tgetNode${nodeCase}s(filter: ${nodeCase}Input): [${nodeCase}]\n`;
    });
    r += '}\n\n';

    // mutation
    if (addMutations) {        
        r += `type Mutation {\n`;
        gdbs.nodeStructures.forEach(node => {
            let nodeCase = toPascalCase(node.label);         
            r += `\tcreateNode${nodeCase}(input: ${nodeCase}Input!): ${nodeCase}\n`;
            r += `\tupdateNode${nodeCase}(id: ID!, input: ${nodeCase}Input!): ${nodeCase}\n`;
            r += `\tdeleteNode${nodeCase}(id: ID!): Boolean\n`;
        });    

        gdbs.edgeStructures.forEach(edge => {
            edge.directions.forEach(direction => {
            let edgeCase = toPascalCase(edge.label);
            let fromCase = toPascalCase(direction.from);
            let toCase = toPascalCase(direction.to);    
            if (edge.properties.length > 0) {                                            
                r += `\tconnectNode${fromCase}ToNode${toCase}Edge${edgeCase}(from: ID!, to: ID!, edge: ${edgeCase}Input!): ${edgeCase}\n`;
                r += `\tupdateEdge${edgeCase}From${fromCase}To${toCase}(from: ID!, to: ID!, edge: ${edgeCase}Input!): ${edgeCase}\n`;
            } else {
                r += `\tconnectNode${fromCase}ToNode${toCase}Edge${edgeCase}(from: ID!, to: ID!): ${edgeCase}\n`;            
            }
            r += `\tdeleteEdge${edgeCase}From${fromCase}To${toCase}(from: ID!, to: ID!): Boolean\n`;
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