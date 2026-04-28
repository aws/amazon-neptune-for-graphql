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

import { specifiedScalarTypes, isTypeDefinitionNode } from 'graphql';
import { AWS_APPSYNC_SCALARS } from './util.js';
import { loggerInfo } from './logger.js';

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
        if (change.type == currentType && change.action == 'remove' &&
            (line.startsWith(change.field + ':') ||
             line.startsWith(change.field + '(') ||
             line.startsWith(change.field + ' '))) {
            r = '*** REMOVE ***';
        }
    });

    return r;
}


function changeGraphQLSchema(schema, changes) {
    let changesDirectives;
    try {
        changesDirectives = JSON.parse(changes);
    } catch (err) {
        throw new Error('Invalid JSON in --input-schema-changes-file: ' + err.message, { cause: err });
    }
    if (!Array.isArray(changesDirectives)) {
        throw new Error('--input-schema-changes-file must be a JSON array');
    }


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

    for (const change of changesDirectives) {
        if (change.action == 'addType') {
            if (typeof change.value === 'string' && change.value.trim()) {
                r += change.value + '\n';
            } else {
                loggerInfo('Skipping addType entry with missing or non-string value', {toConsole: true});
            }
        }
    }

    return r;
}


/**
 * Checks that every return type referenced by Query/Mutation fields is
 * defined in the schema. Throws if any are missing.
 */
function validateReturnTypes(schemaModel) {
    if (!schemaModel || !schemaModel.definitions) return;

    const knownTypes = new Set([
        ...specifiedScalarTypes.map(t => t.name),
        ...AWS_APPSYNC_SCALARS
    ]);
    for (const def of schemaModel.definitions) {
        if (isTypeDefinitionNode(def) && def.name) knownTypes.add(def.name.value);
    }

    // Unwrap NonNull/List wrappers (e.g. [Foo!]! → Foo) to get the named type.
    const baseTypeName = (type) => {
        while (type.kind === 'NonNullType' || type.kind === 'ListType') type = type.type;
        return type.name.value;
    };

    const errors = new Set();
    for (const def of schemaModel.definitions) {
        if (def.kind !== 'ObjectTypeDefinition' && def.kind !== 'ObjectTypeExtension') continue;
        if (def.name.value !== 'Query' && def.name.value !== 'Mutation') continue;
        for (const field of def.fields || []) {
            const name = baseTypeName(field.type);
            if (!knownTypes.has(name)) errors.add(name);
        }
    }

    if (errors.size > 0) {
        throw new Error('Return types not defined in schema: ' + [...errors].join(', ') + '. Use "action": "addType" in the changes file to add the missing types.');
    }
}

export { changeGraphQLSchema, validateReturnTypes };
