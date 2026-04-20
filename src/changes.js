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

import { specifiedScalarTypes } from 'graphql';
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
        throw new Error('Invalid JSON in --input-schema-changes-file: ' + err.message);
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
                loggerInfo('Skipping addType entry with missing or non-string value');
            }
        }
    }

    return r;
}


/**
 * Checks that Query/Mutation return types are defined. Line-based, so it
 * misses some edge cases (multi-line directive args, multi-field single-line blocks).
 */
function validateReturnTypes(schema) {
    if (!schema) return;

    const knownTypes = new Set([
        ...specifiedScalarTypes.map(t => t.name),
        ...AWS_APPSYNC_SCALARS
    ]);

    const lines = schema.split('\n').map(l => l.trim());

    // Strip a leading `extend ` so `extend type Foo` behaves like `type Foo`.
    const stripExtend = (line) => line.startsWith('extend ') ? line.slice(7) : line;
    const isTypeDef = (line) => {
        const l = stripExtend(line);
        return l.startsWith('type ') || l.startsWith('enum ') || l.startsWith('input ') ||
               l.startsWith('scalar ') || l.startsWith('interface ') || l.startsWith('union ');
    };

    /**
     * Extracts the return type name from a GraphQL field line by stripping
     * comments, quoted strings, directives, and list/non-null wrappers.
     * Returns null if the line has no return type.
     *
     * Example: "getAirport(code: String): Airport @graphQuery(...) # note" → "Airport"
     */
    const extractReturnType = (fieldLine) => {
        let line = fieldLine
            .replace(/\s#.*$/, '')                          // 1. strip inline comments
            .replace(/"""[\s\S]*?"""/g, '')                 // 2a. strip block strings so content can't match directives
            .replace(/"(?:[^"\\]|\\.)*"/g, '');             // 2b. strip strings so `@` or `:` in values don't confuse extraction

        // 3. strip trailing directives — matches `@` preceded by word char / `]` / `!`
        const atMatch = line.match(/(?<=[\w\]!])\s*@/);
        if (atMatch) line = line.substring(0, atMatch.index);

        // 4. everything after the last `:` is the return type
        const colonPos = line.lastIndexOf(':');
        if (colonPos === -1) return null;

        // 5. strip `}` (single-line declarations) and unwrap list/non-null: [Foo!] → Foo
        return line.substring(colonPos + 1).replace(/[}]/g, '').trim().replace(/[[\]!]/g, '') || null;
    };

    // Check a single field line inside a Query/Mutation block; collect missing types.
    const validateField = (rawFieldLine, errors) => {
        if (!rawFieldLine || rawFieldLine.startsWith('#')) return;

        const returnType = extractReturnType(rawFieldLine);
        if (returnType && !knownTypes.has(returnType) && !errors.includes(returnType)) {
            errors.push(returnType);
        }
    };

    // Returns true if the line is inside (or opens/closes) a triple-quoted description block.
    const isInsideDescription = (line, state) => {
        const tripleQuoteCount = (line.match(/"""/g) || []).length;
        const wasIn = state.inDescription;
        if (tripleQuoteCount % 2 === 1) state.inDescription = !state.inDescription;
        return wasIn || tripleQuoteCount > 0;
    };

    // Pass 1: Collect all defined type/enum/input/scalar names.
    let descState = { inDescription: false };
    for (const line of lines) {
        if (isInsideDescription(line, descState)) continue;
        if (isTypeDef(line)) {
            knownTypes.add(stripExtend(line).split(' ')[1]);
        }
    }

    // Pass 2: Validate return types in Query/Mutation blocks
    let insideQueryOrMutation = false;
    descState = { inDescription: false };
    const errors = [];

    for (const line of lines) {
        if (isInsideDescription(line, descState)) continue;

        const defLine = stripExtend(line);
        const parts = defLine.split(' ');

        if (defLine.startsWith('type ') && (parts[1] == 'Query' || parts[1] == 'Mutation')) {
            insideQueryOrMutation = true;
            // Handle single-line declarations: `type Query { getX: Foo }` — parse the tail after `{`.
            const bracePos = line.indexOf('{');
            if (bracePos !== -1) {
                const tail = line.substring(bracePos + 1).trim();
                if (tail) {
                    // Strip a trailing `}` so a closing brace on the same line also closes the block.
                    const closeBracePos = tail.lastIndexOf('}');
                    const fieldPart = closeBracePos !== -1 ? tail.substring(0, closeBracePos).trim() : tail;
                    validateField(fieldPart, errors);
                    if (closeBracePos !== -1) insideQueryOrMutation = false;
                }
            }
            continue;
        }

        if (line.startsWith('}')) {
            insideQueryOrMutation = false;
            continue;
        }

        if (!insideQueryOrMutation) continue;
        validateField(line, errors);
    }

    if (errors.length > 0) {
        throw new Error('Return types not defined in schema: ' + errors.join(', ') + '. Consider using "action": "addType" to add the missing types.');
    }
}

export { changeGraphQLSchema, validateReturnTypes };
