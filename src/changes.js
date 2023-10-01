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

function addChanges(changesDirectives, currentType) {
    /* Alternative 
    return changesDirectives
     .filter(change => change.type === currentType && change.action == "acc")
     .map(change => change.value)
     .join("\n")
      + "\n" 
    */
    let r = '';
    changesDirectives.forEach(change => {
        if (change.type == currentType && change.action == 'add') {
            r += change.value + '\n';
        }
    });
    return r;
}


function removeChanges(changesDirectives, currentType, line) {
    let r = line;

    changesDirectives.forEach(change => {
        if (change.type == currentType && change.action == 'remove' && line.startsWith(change.field)) {
            r = '*** REMOVE ***';
        }
    });

    return r;
}


function changeGraphQLSchema(schema, changes) {
    const changesDirectives = JSON.parse(changes);


    let lines = schema.split('\n');
    let r = ''; 

    let currentType = '';
    for (const linel of lines) {
        let line = linel.trim();
        let parts = line.split(' ');
        
        if (line.startsWith('type ')) {
            currentType = parts[1];
        }

        if (line.startsWith('}')) {
            r += addChanges(changesDirectives, currentType);            
            currentType = '';
        }
        
        line = removeChanges(changesDirectives, currentType, line);
        
        if (line != '*** REMOVE ***') {
            r += line + '\n';
        }
    }

    return r;
}


export { changeGraphQLSchema}