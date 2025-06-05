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

import { astFromValue, buildASTSchema, GraphQLError, GraphQLID, GraphQLInputObjectType, typeFromAST } from 'graphql';
import { gql } from 'graphql-tag'; // GraphQL library to parse the GraphQL query

const useCallSubquery = false;

let schemaDataModel;
let schema;

/**
 * Initializes the schema from a given file path
 *
 * @param {object} schemaModel the path to the JSON schema data mode
 */
export function initSchema(schemaModel) {
    schemaDataModel = schemaModel;
    schema = buildASTSchema(schemaDataModel, { assumeValidSDL: true });
}

/**
 * Resolves a graph db query from a given App Sync graphQL query event.
 *
 * @param {string} event.field the graphQL field being queried
 * @param {object} event.arguments arguments that were passed into the query
 * @param {string} event.selectionSetGraphQL string representation of the graphQL selection set, formatted as GraphQL schema definition language (SDL)
 * @returns {string} the resolved graph db query
 */
export function resolveGraphDBQueryFromAppSyncEvent(event) {
    return resolveGraphDBQueryFromEvent({
        field: event.field,
        arguments: event.arguments,
        // fragments not yet supported in app sync - see https://github.com/aws-samples/appsync-with-postgraphile-rds/issues/18
        fragments: {},
        variables: event.variables,
        selectionSet: event.selectionSetGraphQL ? gql`${event.selectionSetGraphQL}`.definitions[0].selectionSet : {}
    });
}

/**
 * Resolves a graph db query from a given graphQL query event.
 *
 * @param {string} event.field the graphQL field being queried
 * @param {object} event.arguments arguments that were passed into the query
 * @param {object} event.selectionSet the graphQL AST selection set
 * @param {object} event.variables optional query variables
 * @param {object} event.fragments optional query fragments
 * @returns {string} the resolved graph db query
 */
export function resolveGraphDBQueryFromEvent(event) {
    const fieldDef = getFieldDef(event.field);

    const args = [];
    for (const inputDef of fieldDef.arguments ?? []) {
        const value = event.arguments[inputDef.name.value];

        if (value) {
            const inputType = typeFromAST(schema, inputDef.type);
            const astValue = astFromValue(value, inputType);
            if (inputType instanceof GraphQLInputObjectType) {
                // retrieve an ID field which may not necessarily be named 'id'
                const idField = Object.values(inputType.getFields()).find(field => field.type.name === GraphQLID.name);
                if (idField) {
                    // check if id was an input arg
                    const idValue = astValue.fields.find(f => f.name.value === idField.name);
                    if (idValue?.value?.kind === 'IntValue') {
                        // graphql astFromValue function can convert ID integer strings into integer type
                        // if input args contain an id and the graphql library has interpreted the value as an int, change it to treat the value as a string
                        idValue.value.kind = 'StringValue';
                    }
                }
            }
            args.push({
                kind: 'Argument',
                name: { kind: 'Name', value: inputDef.name.value },
                value: astValue
            });
        }
    }

    const fieldNode = {
        kind: 'Field',
        name: { kind: 'Name', value: event.field },
        arguments: args,
        selectionSet: event.selectionSet
    };
    const queryDocument = {
        kind: 'Document',
        definitions: [
            {
                kind: 'OperationDefinition',
                operation: 'query',
                selectionSet: {
                    kind: 'SelectionSet',
                    selections: [fieldNode]
                }
            }
        ]
    };

    const graphQuery = resolveGraphDBQuery({
        queryObjOrStr: queryDocument, 
        variables: event.variables, 
        fragments: event.fragments
    });
    return graphQuery;
}

const matchStatements = []; // openCypher match statements
const withStatements = [];  // openCypher with statements
const returnString = [];    // openCypher return statements
let parameters = {};      // openCypher query parameters


function getRootTypeDefs() {
    return getTypeDefs(['Query', 'Mutation']);
}


function getTypeDefs(typeNameOrNames) {
    if (!Array.isArray(typeNameOrNames)) {
        typeNameOrNames = [typeNameOrNames];
    }

    return schemaDataModel.definitions.filter(
        def => def.kind === 'ObjectTypeDefinition' && typeNameOrNames.includes(def.name.value)
    );
}


function getFieldDef(fieldName) {
    const rootTypeDefs = getRootTypeDefs();

    for (const rootDef of rootTypeDefs) {
        const fieldDef = rootDef.fields.find(def => def.name.value === fieldName);

        if (fieldDef) {
            return fieldDef;
        }
    }
}


function getTypeAlias(typeName) {
    let alias = null;
    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value == typeName) {
                if (def.directives.length > 0) {
                    def.directives.forEach(directive => {
                        if (directive.name.value === 'alias') {
                            alias = directive.arguments[0].value.value;
                        }
                    });
                }
            }
        }
    });

    if (alias == null)
        return typeName
    else
        return alias;
}

function getSchemaInputTypeArgs (inputType, schemaInfo) {

    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'InputObjectTypeDefinition') {
            if (def.name.value == inputType) {
                def.fields.forEach(field => {
                    let arg = {name: '', type:''};
                    let alias = null;

                    arg.name = field.name.value;

                    if (field.type.kind === 'ListType') {
                        arg.type = field.type.type.name.value;
                    }

                    if (field.type.kind === 'NamedType') {
                        arg.type = field.type.name.value;
                    }

                    if (field.type.kind === 'NonNullType') {
                        arg.type = field.type.type.name.value;
                    }

                    if (field.directives.length > 0) {
                        field.directives.forEach(directive => {
                            if (directive.name.value === 'alias') {
                                alias = directive.arguments[0].value.value;
                            }
                            if (directive.name.value === 'id') {
                                schemaInfo.graphDBIdArgName = arg.name;
                            }
                        });
                    }

                    if (alias != null)
                        Object.assign(arg, {alias: alias});

                    schemaInfo.args.push(arg);
                });
            }
        }
    });
}


function getSchemaQueryInfo(name) {
    const r = {
        type: '', // rename functionType
        name: name,
        returnType: '',
        returnTypeAlias: '',
        pathName: '',
        returnIsArray: false,
        graphQuery: null,
        args: [],
        graphDBIdArgName: '',
        argOptionsLimit: null,
        argOptionsOffset: null,
        argOptionsOrderBy: null,
    };

    schemaDataModel.definitions.forEach(def => {
        if (def.kind != 'ObjectTypeDefinition') {
            return;
        }

        if (!(def.name.value === 'Query' || def.name.value === 'Mutation')) {
            return;
        }

        def.fields.forEach(field => {
            if (field.name.value != name) {
                return;
            }

            r.type = def.name.value;
            r.name = field.name.value;

            // Return type              
            if (field.type.kind === 'ListType') {
                r.returnIsArray = true;
                r.returnType = field.type.type.name.value;
            }

            if (field.type.kind === 'NamedType') {
                r.returnIsArray = false;
                r.returnType = field.type.name.value;
            }

            if (field.type.kind === 'NonNullType') {
                if (field.type.type.kind === 'NamedType') {
                    r.returnIsArray = false;
                    r.returnType = field.type.type.name.value;
                }
            }

            r.returnTypeAlias = getTypeAlias(r.returnType);
            r.pathName = r.name + '_' + r.returnType;

            // graphQuery
            if (field.directives.length > 0) {
                field.directives.forEach(directive => {
                    if (directive.name.value === 'graphQuery' || directive.name.value === 'Cypher' || directive.name.value === 'cypher')
                        r.graphQuery = directive.arguments[0].value.value;
                });
            }

            // args
            if (field.arguments.length > 0) {
                field.arguments.forEach(arg => {
                    if (arg.type.kind === 'NamedType') {
                        getSchemaInputTypeArgs(arg.type.name.value, r);
                    } else if (arg.type.kind === 'NonNullType') {
                        getSchemaInputTypeArgs(arg.type.type.name.value, r);
                    } else if (arg.type.type.name.value === 'String' || arg.type.type.name.value === 'Int' || arg.type.type.name.value === 'ID') {
                        r.args.push({name: arg.name.value, type: arg.type.type.name.value});
                    } else {
                        // GraphQL type input                        
                    }
                });
            }
        });

    });

    if (r.returnType == '') {
        console.error('GraphQL query not found.');

    }

    return r;
}


function getSchemaTypeInfo(lastTypeName, typeName, pathName) {
    const r = {
        name: typeName,
        type: '',
        typeAlias: '',
        pathName: pathName + '_' + typeName,
        isArray: false,
        isRelationship: false,
        relationship: {edgeType: '', direction: 'IN'},
        graphQuery: null
    };

    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value === lastTypeName) {
                def.fields.forEach(field => {
                    if (field.name.value === typeName) {
                        // isArray
                        if (field.type.kind === 'ListType') {
                            r.isArray = true;
                            r.type = field.type.type.name.value;
                        }
                        if (field.type.kind === 'NamedType') {
                            r.isArray = false;
                            r.type = field.type.name.value;
                        }
                        // isRelationship
                        if (field.directives.length > 0) {
                            field.directives.forEach(directive => {
                                if (directive.name.value === 'relationship') {
                                    r.isRelationship = true;
                                    directive.arguments.forEach(arg => {
                                        if (arg.name.value === 'type' || arg.name.value === 'edgeType') {
                                            r.relationship.edgeType = arg.value.value;
                                        }
                                        if (arg.name.value === 'direction') {
                                            r.relationship.direction = arg.value.value;
                                        }
                                    });
                                }
                            });
                        }
                    }
                });

            }
        }
    });

    r.typeAlias = getTypeAlias(r.type);

    return r;
}


function getSchemaFieldInfo(typeName, fieldName, pathName) {
    const r = {
        name: fieldName,
        alias: '',
        type: '',
        isSchemaType: false,
        pathName: '',
        isId: false,
        isArray: false,
        isRequired: false,
        graphQuery: null,
        relationship: null,
        args:[],
        graphDBIdArgName: '',
        argOptionsLimit: null,
        argOptionsOffset: null,
        argOptionsOrderBy: null,
    }

    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value === typeName) {
                def.fields.forEach(field => {
                    if (field.name.value === fieldName) {
                        r.name = field.name.value;
                        r.alias = r.name;
                        if (field.type.kind === 'ListType') {
                            r.isArray = true;
                            r.type = field.type.type.name.value;
                        }
                        if (field.type.kind === 'NamedType') {
                            r.isArray = false;
                            r.type = field.type.name.value;
                        }
                        if (field.type.kind === 'NonNullType') {
                            r.isArray = false;
                            r.type = field.type.type.name.value;
                        }
                        r.pathName = pathName + '_' + r.name;
                        if (field.directives.length > 0) {
                            field.directives.forEach(directive => {
                                if (directive.name.value === 'alias') {
                                    r.alias = directive.arguments[0].value.value;
                                }
                                if (directive.name.value === 'graphQuery' || directive.name.value === 'Cypher' || directive.name.value === 'cypher') {
                                    r.graphQuery = directive.arguments[0].value.value;
                                    if (fieldName == 'id') {
                                        r.graphQuery = r.graphQuery.replace(' as id', '');
                                        r.graphQuery = r.graphQuery.replace(' AS id', '');
                                    }
                                }
                                if (directive.name.value === 'id')
                                    r.graphDBIdArgName = r.name;
                            });
                        }

                        if (field.arguments.length > 0) {
                            field.arguments.forEach(arg => {
                                if (arg.type.kind === 'NamedType') {
                                    getSchemaInputTypeArgs(arg.type.name.value, r);
                                } else if (arg.type.kind === 'NonNullType') {
                                    getSchemaInputTypeArgs(arg.type.type.name.value, r);
                                } else if (arg.type.type.name.value === 'String' || arg.type.type.name.value === 'Int' || arg.type.type.name.value === 'ID') {
                                    r.args.push({name: arg.name.value, type: arg.type.type.name.value});
                                } else {
                                    // GraphQL type input                        
                                }
                            });
                        }

                    }
                });

            }
        }
    });

    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value === r.type) {
                r.isSchemaType = true;
            }
        }
    });

    if (r.type == '') {
        console.error('GraphQL field not found.');
    }

    return r;
}


function setOptionsInSchemaInfo(fields, schemaInfo) {
    fields.filter(field => field.name.value === 'limit' || field.name.value === 'offset')
        .forEach(field => {
            const value = extractPositiveIntegerFieldValue(field);
            if (field.name.value === 'limit') {
                schemaInfo.argOptionsLimit = value;
            } else if (field.name.value === 'offset') {
                schemaInfo.argOptionsOffset = value;
            }
            /* TODO 
            if (field.name.value == 'orderBy') {            
                schemaInfo.argOptionsOrderBy = field.value.value;
            }
            */
        });
}

function extractPositiveIntegerFieldValue(field) {
    if (field.value.kind === 'IntValue') {
        const value = Number(field.value.value);
        if (value >= 0) {
            return value;
        }
    }
    throw new GraphQLError(`The ${field.name.value} value must be a positive integer`);
}

function createQueryFunctionMatchStatement(obj, matchStatements, querySchemaInfo) {
    if (querySchemaInfo.graphQuery != null) {
        var gq = querySchemaInfo.graphQuery.replaceAll('this', querySchemaInfo.pathName);
        obj.definitions[0].selectionSet.selections[0].arguments.forEach(arg => {
            gq = gq.replace('$' + arg.name.value, arg.value.value);
        });

        matchStatements.push(gq);

    } else {
        const selection = obj.definitions[0].selectionSet.selections[0];
        replaceVariableArgsWithValues(selection, querySchemaInfo.variables);
        replaceFragmentSelections(selection, querySchemaInfo.fragments);
        const argsAndWhereClauses = extractQueryArgsAndWhereClauses(selection.arguments, querySchemaInfo);
        const queryArgs = argsAndWhereClauses?.queryArguments.length > 0 ? `{${argsAndWhereClauses.queryArguments.join(',')}}` : '';
        const whereClause = argsAndWhereClauses?.whereClauses.length > 0 ? ` WHERE ${argsAndWhereClauses.whereClauses.join(' AND ')}` : '';
        const skipClause = typeof querySchemaInfo.argOptionsOffset === 'number' ? ` SKIP ${querySchemaInfo.argOptionsOffset}` : '';
        const limitClause = typeof querySchemaInfo.argOptionsLimit === 'number' ? ` LIMIT ${querySchemaInfo.argOptionsLimit}` : '';
        const withClause = limitClause || skipClause ? ` WITH ${querySchemaInfo.pathName}${skipClause}${limitClause}` : '';
        matchStatements.push(`MATCH (${querySchemaInfo.pathName}:\`${querySchemaInfo.returnTypeAlias}\`${queryArgs})${whereClause}${withClause}`);
    }

    withStatements.push({carryOver: querySchemaInfo.pathName, inLevel:'', content:''});
}


/**
 * Extracts cypher query arguments and where clauses from given graphQL selection arguments and schema information.
 * Will also set querySchemaInfo.argOptionsLimit if the selection arguments contain a query limit.
 * 
 * @param selectionArguments array of graphQL selection arguments
 * @param querySchemaInfo schema information for the query
 * @returns {{queryArguments: *[], whereClauses: *[]}}
 */
function extractQueryArgsAndWhereClauses(selectionArguments, querySchemaInfo) {
    const operationMap = new Map();
    operationMap.set('eq', '=');
    operationMap.set('contains', 'CONTAINS');
    operationMap.set('startsWith', 'STARTS WITH');
    operationMap.set('endsWith', 'ENDS WITH');
    
    const queryArguments = [];
    const whereClauses = [];
    selectionArguments.forEach(selectionArgument => {
        if (selectionArgument.name?.value === 'filter') {
            const filters = extractFiltersFromQueryArgumentFields(selectionArgument.value.fields, querySchemaInfo);
            // create a WHERE clause for each filter
            for (const filter of filters) {
                const paramName = querySchemaInfo.pathName + '_' + filter.name;
                Object.assign(parameters, { [paramName]: filter.value });
                let operation = '=';
                if (filter.operator && operationMap.has(filter.operator)) {
                    operation = operationMap.get(filter.operator);
                }
                if (filter.name === querySchemaInfo.graphDBIdArgName) {
                    whereClauses.push(`ID(${querySchemaInfo.pathName}) ${operation} $${paramName}`);
                } else {
                    whereClauses.push(`${querySchemaInfo.pathName}.${filter.name} ${operation} $${paramName}`);
                }
            }
        } else if (selectionArgument.name?.value === 'options' && selectionArgument.value?.kind === 'ObjectValue') {
            // TODO change to set limit value on the returned object instead of mutating the querySchemaInfo
            setOptionsInSchemaInfo(selectionArgument.value.fields, querySchemaInfo);
        } else if (selectionArgument.name?.value && selectionArgument.value?.value) {
            queryArguments.push(`${selectionArgument.name.value}:'${selectionArgument.value.value}'`);
        }
    });
    return { queryArguments: queryArguments, whereClauses: whereClauses };
}


function extractTextBetweenParentheses(str) {
    const match = str.match(/\(([^)]+)\)/);
    return match ? match[1] : ''; // Returns the content between the parentheses
}


function modifyVariableNames(query, name) {
    return query.replace(/\b(\w+)\b/g, function (match, p1, offset, string) {
        // Check if the matched word is preceded by '(', '[', '[:', or '(:'
        if (
            string[offset - 1] === '(' ||
            string[offset - 1] === '[' ||
            (string[offset - 2] === '[' && string[offset - 1] === ':') ||
            (string[offset - 2] === '(' && string[offset - 1] === ':')
        ) {
            return name + '_' + p1;
        }
        return match;
    });
}


function graphQueryRefactoring(lastNamePath, fieldSchemaInfo) {
    const r = { queryMatch:'', returnCarryOver: '', inLevel : '', returnAggregation: ''}
    const name = lastNamePath + '_' + fieldSchemaInfo.name;

    const statementParts = fieldSchemaInfo.graphQuery.split(' RETURN ');
    const returnStatement = statementParts[1];
    r.queryMatch = statementParts[0];

    r.queryMatch = modifyVariableNames(r.queryMatch, name);
    r.queryMatch = r.queryMatch.replace(name +'_this', lastNamePath);

    let returningName = '';
    let isAggregation = false;

    //check if includes aggregating functions 
    if (returnStatement.includes('(')) {
        returningName = extractTextBetweenParentheses(returnStatement);
        isAggregation = true;
    } else {
        returningName = returnStatement;
    }

    if (isAggregation) {
        r.returnAggregation = returnStatement.replace(returningName, name + '_' + returningName);
        r.inLevel = name;
        r.returnCarryOver = name + '_' + returningName;
    } else {
        r.returnCarryOver = name + '_' + returningName;
    }

    return r;
}


function createQueryFieldMatchStatement(fieldSchemaInfo, lastNamePath) {
    // solution until CALL subquery is supported in Neptune openCypher

    const refactored = graphQueryRefactoring(lastNamePath, fieldSchemaInfo);

    if (refactored.queryMatch.toUpperCase().includes('MATCH'))
        refactored.queryMatch = 'OPTIONAL ' + refactored.queryMatch;
    matchStatements.push(refactored.queryMatch);

    if ( refactored.returnAggregation != '' ) {
        const thisWithId = withStatements.push({carryOver: refactored.returnCarryOver, inLevel: '', content: `${refactored.returnAggregation} AS ${refactored.inLevel}`}) -1;
        let i = withStatements.findIndex(({carryOver}) => carryOver.startsWith(lastNamePath));

        withStatements[i].content += refactored.inLevel;

        for (let p = thisWithId -1; p > i; p--) {
            withStatements[p].inLevel += refactored.inLevel + ', ';
        }

    } else {
        // no new with, just add it to lastnamepath content
        // maybe not needed
    }

}


function createQueryFieldLeafStatement(fieldSchemaInfo, lastNamePath) {

    let i = withStatements.findIndex(({carryOver}) => carryOver.startsWith(lastNamePath));

    if (withStatements[i].content.slice(-2) != ', ' && withStatements[i].content.slice(-1) != '{' && withStatements[i].content != '' )
        withStatements[i].content += ', ';

    withStatements[i].content += fieldSchemaInfo.name + ':';

    if (fieldSchemaInfo.graphDBIdArgName === fieldSchemaInfo.name && fieldSchemaInfo.graphQuery == null) {
        withStatements[i].content += 'ID(' + lastNamePath + ')';
    } else {

        if (fieldSchemaInfo.graphQuery !=null ) {
            if (useCallSubquery) {
                matchStatements.push(` CALL { WITH ${lastNamePath} ${fieldSchemaInfo.graphQuery.replaceAll('this', lastNamePath)} AS ${lastNamePath + '_' + fieldSchemaInfo.name} }`);
                withStatements[i].content += ' ' + lastNamePath + '_' + fieldSchemaInfo.name;
            } else {
                createQueryFieldMatchStatement(fieldSchemaInfo, lastNamePath);
            }
        } else {
            withStatements[i].content += ' ' + lastNamePath + '.' + `\`${fieldSchemaInfo.alias}\``;
        }
    }
}


function createTypeFieldStatementAndRecurse({selection, fieldSchemaInfo, lastNamePath, lastType, variables = {}, fragments = {}}) {
    const schemaTypeInfo = getSchemaTypeInfo(lastType, fieldSchemaInfo.name, lastNamePath);

    // check if the field has is a function with parameters, look for filters and options
    if (selection.arguments !== undefined) {
        selection.arguments.forEach(arg => {
            if (arg.value.kind === 'ObjectValue' && arg.name.value === 'options')
                setOptionsInSchemaInfo(arg.value.fields, fieldSchemaInfo);
        });
    }
    
    const argsAndWhereClauses = extractQueryArgsAndWhereClauses(selection.arguments, fieldSchemaInfo);
    const queryArgs = argsAndWhereClauses.queryArguments?.length > 0 ? `{${argsAndWhereClauses.queryArguments.join(',')}}` : '';
    const whereClause = argsAndWhereClauses.whereClauses?.length > 0 ? ` WHERE ${argsAndWhereClauses.whereClauses.join(' AND ')}` : '';

    if (schemaTypeInfo.isRelationship) {
        if (schemaTypeInfo.relationship.direction === 'IN') {
            matchStatements.push(`OPTIONAL MATCH (${lastNamePath})<-[${schemaTypeInfo.pathName}_${schemaTypeInfo.relationship.edgeType}:${schemaTypeInfo.relationship.edgeType}]-(${schemaTypeInfo.pathName}:\`${schemaTypeInfo.typeAlias}\`${queryArgs})${whereClause}`);
        } else {
            matchStatements.push(`OPTIONAL MATCH (${lastNamePath})-[${schemaTypeInfo.pathName}_${schemaTypeInfo.relationship.edgeType}:${schemaTypeInfo.relationship.edgeType}]->(${schemaTypeInfo.pathName}:\`${schemaTypeInfo.typeAlias}\`${queryArgs})${whereClause}`);
        }
    }
    const thisWithId = withStatements.push({carryOver: schemaTypeInfo.pathName, inLevel: '', content: ''}) - 1;

    if (schemaTypeInfo.isArray) {
        // if the nested selection (optional match) did not produce results, return empty array
        // otherwise collect the results in an array
        withStatements[thisWithId].content += `CASE WHEN ${schemaTypeInfo.pathName} IS NULL THEN [] ELSE COLLECT(`;
    }

    withStatements[thisWithId].content += '{';
    selectionsRecurse({
        selections: selection.selectionSet.selections,
        lastNamePath: schemaTypeInfo.pathName,
        lastType: schemaTypeInfo.type,
        variables: variables,
        fragments: fragments
    });
    withStatements[thisWithId].content += '}';

    if (schemaTypeInfo.isArray) {
        const lowerBound = typeof fieldSchemaInfo.argOptionsOffset === 'number' ? fieldSchemaInfo.argOptionsOffset : null;
        let upperBound = typeof fieldSchemaInfo.argOptionsLimit === 'number' ? fieldSchemaInfo.argOptionsLimit : null;
        if (lowerBound != null && upperBound != null) {
            upperBound = lowerBound + upperBound;
        }
        const slice = (lowerBound != null || upperBound != null) ? `[${lowerBound ?? ''}..${upperBound ?? ''}]` : '';
        withStatements[thisWithId].content += `)${slice} END AS ${schemaTypeInfo.pathName}_collect`;
 
        let i = withStatements.findIndex(({carryOver}) => carryOver.startsWith(lastNamePath));

        if (withStatements[i].content.slice(-2) != ', ' && withStatements[i].content.slice(-1) != '{')
            withStatements[i].content += ', ';

        withStatements[i].content += schemaTypeInfo.name + ': ' + schemaTypeInfo.pathName + '_collect';

        for (let p = thisWithId -1; p > i; p--) {
            withStatements[p].inLevel += schemaTypeInfo.pathName + '_collect, ';
        }

    } else {
        withStatements[thisWithId].content += ' AS ' + schemaTypeInfo.pathName + '_one';
        let i = withStatements.findIndex(({carryOver}) => carryOver.startsWith(lastNamePath));

        if (withStatements[i].content.slice(-2) != ', ' && withStatements[i].content.slice(-1) != '{')
            withStatements[i].content += ', ';

        withStatements[i].content += schemaTypeInfo.name + ': ' + schemaTypeInfo.pathName + '_one';

        for (let p = thisWithId -1; p > i; p--) {
            withStatements[p].inLevel += schemaTypeInfo.pathName + '_one, ';
        }
    }

}


/**
 * Recursively processes query selections
 * @param {object} selections the query selections to process
 * @param {string} lastNamePath the last name path of the parent selection
 * @param {string} lastType the last type of the parent selection
 * @param {object} variables optional variables referenced in the query
 * @param {object} fragments optional fragment definitions referenced in the query
 */
function selectionsRecurse({selections, lastNamePath, lastType, variables = {}, fragments = {}}) {

    selections.forEach(selection => {
        // replace any selection references to variables with the variable values
        replaceVariableArgsWithValues(selection, variables);
        replaceFragmentSelections(selection, fragments);
        const fieldSchemaInfo = getSchemaFieldInfo(lastType, selection.name.value, lastNamePath);

        // check if is schema type
        if (!fieldSchemaInfo.isSchemaType) {
            createQueryFieldLeafStatement(fieldSchemaInfo, lastNamePath);
            // exit terminating recursion branch
            return
        }

        createTypeFieldStatementAndRecurse({
            selection: selection,
            fieldSchemaInfo: fieldSchemaInfo,
            lastNamePath: lastNamePath,
            lastType: lastType,
            variables: variables,
            fragments: fragments
        })
    });
};


function finalizeGraphQuery(matchStatements, withStatements, returnString) {
    // make a string out of match statements
    let ocMatchStatements = '';
    matchStatements.forEach(e => {
        ocMatchStatements += e + '\n';
    });
    ocMatchStatements = ocMatchStatements.substring(0, ocMatchStatements.length - 1);

    let ocWithStatements = '';
    let carryOvers = '';
    let withToReverse = [];
    for (let i = 1; i < withStatements.length; i++) {
        carryOvers += withStatements[i - 1].carryOver + ', ';
        withToReverse.push('\n' + 'WITH ' + carryOvers + withStatements[i].inLevel + withStatements[i].content);
    }

    for(let i = withToReverse.length - 1; i >= 0; i--) {
        ocWithStatements += withToReverse[i];
    }

    // make a string out of return statement
    let ocReturnStatement = '';
    returnString.forEach(e => {
        ocReturnStatement = ocReturnStatement + e;
    });

    // make the oc query string
    return ocMatchStatements + ocWithStatements + '\nRETURN ' + ocReturnStatement;
}


function resolveGrapgDBqueryForGraphQLQuery (obj, querySchemaInfo) {

    createQueryFunctionMatchStatement(obj, matchStatements, querySchemaInfo);

    // start processing the given query
    if (querySchemaInfo.returnIsArray) {
        returnString.push('collect(');
    }

    withStatements[0].content = '{';

    selectionsRecurse({
        selections: obj.definitions[0].selectionSet.selections[0].selectionSet.selections,
        lastNamePath: querySchemaInfo.pathName,
        lastType: querySchemaInfo.returnType,
        variables: querySchemaInfo.variables,
        fragments: querySchemaInfo.fragments
    });

    if (withStatements[0].content.slice(-2) == ', ')
        withStatements[0].content = withStatements[0].content.substring(0, withStatements[0].content.length - 2);

    withStatements[0].content += '}';

    returnString.push(withStatements[0].content);

    if (querySchemaInfo.returnIsArray) {
        returnString.push(')');
        if (querySchemaInfo.argOptionsLimit != null)
            //returnString.push(` LIMIT ${querySchemaInfo.argOptionsLimit}`);
            returnString.push(`[..${querySchemaInfo.argOptionsLimit}]`);
    } else {
        returnString.push(' LIMIT 1');
    }

    return finalizeGraphQuery(matchStatements, withStatements, returnString);
}

/**
 * Converts JavaScript values to GraphQL AST value nodes.
 * Handles primitive types, arrays, and objects by converting them into
 * their corresponding GraphQL AST representation.
 *
 * @param {*} value - The value to convert to a GraphQL AST node
 * @returns {Object} A GraphQL AST value node
 *
 * @example
 * // Convert a string
 * convertToValueNode('hello')
 * // Returns: { kind: 'StringValue', value: 'hello' }
 *
 * @example
 * // Convert a number
 * convertToValueNode(42)
 * // Returns: { kind: 'IntValue', value: '42' }
 */
function convertToValueNode(value) {
    if (!value) {
        return { kind: 'NullValue' };
    }

    if (typeof value === 'string') {
        return {
            kind: 'StringValue',
            value: value
        };
    }

    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return {
                kind: 'IntValue',
                value: String(value)
            };
        }
        return {
            kind: 'FloatValue',
            value: String(value)
        };
    }

    if (typeof value === 'boolean') {
        return {
            kind: 'BooleanValue',
            value: value
        };
    }

    if (Array.isArray(value)) {
        return {
            kind: 'ListValue',
            values: value.map(item => convertToValueNode(item))
        };
    }

    if (typeof value === 'object') {
        return {
            kind: 'ObjectValue',
            fields: Object.entries(value).map(([key, val]) => ({
                kind: 'ObjectField',
                name: { kind: 'Name', value: key },
                value: convertToValueNode(val)
            }))
        };
    }

    return { kind: 'NullValue' };
}

/**
 * Replaces any variable references in the selection with the actual value from the variables object.
 * @param selection the graphQL selection to replace variable references in
 * @param variables the variables object
 */
function replaceVariableArgsWithValues(selection, variables) {
    selection.arguments?.filter(arg => arg.value?.kind === 'Variable' 
        && arg.value?.name?.value && variables.hasOwnProperty(arg.value.name.value))
        .forEach(arg => {
        // replace variable reference with actual value
        arg.value = convertToValueNode(variables[arg.value.name.value]);
    });
}

/**
 * Replaces any fragment references in the selection with the actual fragment selections.
 * @param selection the graphQL selection to replace fragment references in
 * @param fragments the fragment definitions object
 */
function replaceFragmentSelections(selection, fragments) {
    // Early return if no selection set or selections
    if (!selection?.selectionSet?.selections) {
        return;
    }

    // Find all fragment spreads referenced in query selection
    const fragmentSpreads = selection.selectionSet.selections.reduce((acc, fragmentSelection, index) => {
        if (fragmentSelection?.kind === 'FragmentSpread' && fragmentSelection?.name?.value) {
            if (fragments[fragmentSelection.name.value]) {
                acc.push({ fragmentSelection, index });
            } else {
                throw new GraphQLError(`Fragment ${fragmentSelection.name.value} not found`);
            }
        }
        return acc;
    }, []);

    // Process fragments in reverse order to maintain correct indices
    fragmentSpreads.reverse().forEach(({ fragmentSelection, index }) => {
        const fragment = fragments[fragmentSelection.name.value];
        if (!fragment?.selectionSet?.selections) {
            return;
        }
        // Replace fragment spread with actual fragment selections
        selection.selectionSet.selections.splice(index, 1, ...fragment.selectionSet.selections);
    });
}

/**
 * Extracts an array of cypher field name and value from the graphQL query argument fields.
 * @param queryArgumentFields the graphQL query argument fields
 * @param schemaInfo the schema info for the query
 * @returns {object[]}
 */
function extractCypherFieldsFromArgumentFields(queryArgumentFields, schemaInfo) {
    return queryArgumentFields.reduce((cypherFields, field) => {
        const matchingArg = schemaInfo.args?.find(arg => field.name?.value === arg.name)
        if (matchingArg) {
            let value = field.value?.value;
            if (field.value?.kind === 'IntValue' || field.value?.kind === 'FloatValue') {
                value = Number(value);
            }
            cypherFields.push({name: matchingArg.alias ?? matchingArg.name, value: value});
        }
        return cypherFields;
    }, []);
}

/**
 * Extracts an array of cypher filter name, value, operator from the graphQL query argument fields.
 * @param queryArgumentFields the graphQL query argument fields
 * @param schemaInfo the schema info for the query
 * @returns {object[]}
 */
function extractFiltersFromQueryArgumentFields(queryArgumentFields, schemaInfo) {
    return queryArgumentFields.reduce((filters, field) => {
        const matchingArg = schemaInfo.args?.find(arg => field.name?.value === arg.name)
        if (matchingArg) {
            let argValue = field.value?.value;
            let operator = 'eq';
            if (matchingArg.type === 'StringScalarFilters') {
                const stringScalarFilterValue = field.value?.fields?.find(f => f.kind === 'ObjectField' && f.value?.kind === 'StringValue');
                if (stringScalarFilterValue) {
                    argValue = stringScalarFilterValue.value.value;
                    operator = stringScalarFilterValue.name.value;
                }
            } else if (field.value?.kind === 'IntValue' || field.value?.kind === 'FloatValue') {
                argValue = Number(argValue);
            }
            filters.push({name: matchingArg.alias ?? matchingArg.name, value: argValue, operator: operator})
        }
        return filters;
    }, []);
}


function returnStringOnly(selections, querySchemaInfo) {
    withStatements.push({carryOver: querySchemaInfo.pathName, inLevel:'', content:''});
    selectionsRecurse({
        selections: selections,
        lastNamePath: querySchemaInfo.pathName,
        lastType: querySchemaInfo.returnType,
        variables: querySchemaInfo.variables,
        fragments: querySchemaInfo.fragments
    });
    return `{${withStatements[0].content}}`
}

/**
 * Processes a query selection and returns a string representation of the cypher return block.
 * @param selection the query selection to process
 * @param querySchemaInfo the schema info for the query
 * @returns {string} the cypher return block string
 */
function getReturnBlockFromSelection(selection, querySchemaInfo) {
    replaceFragmentSelections(selection, querySchemaInfo.fragments);
    return returnStringOnly(selection.selectionSet.selections, querySchemaInfo);
}

function resolveGrapgDBqueryForGraphQLMutation (queryAst, querySchemaInfo) {

    // createNode
    if (querySchemaInfo.name.startsWith('createNode') && !querySchemaInfo.graphQuery) {
        const queryFields = extractCypherFieldsFromArgumentFields(queryAst.definitions[0].selectionSet.selections[0].arguments[0].value.fields, querySchemaInfo);
        const formattedQueryFields = queryFields.map(arg => {
            const param = querySchemaInfo.pathName + '_' + arg.name;
            Object.assign(parameters, { [param]: arg.value });
            return `${arg.name}: $${param}`;
        }).join(', ');
        
        const nodeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        let returnBlock = `ID(${nodeName})`;
        if (queryAst.definitions[0].selectionSet.selections[0].selectionSet) {
            returnBlock = getReturnBlockFromSelection(queryAst.definitions[0].selectionSet.selections[0], querySchemaInfo);
        }
        return `CREATE (${nodeName}:\`${querySchemaInfo.returnTypeAlias}\` {${formattedQueryFields}})\nRETURN ${returnBlock}`;
    }

    // updateNode
    if (querySchemaInfo.name.startsWith('updateNode') && !querySchemaInfo.graphQuery) {
        const queryFields = extractCypherFieldsFromArgumentFields(queryAst.definitions[0].selectionSet.selections[0].arguments[0].value.fields, querySchemaInfo);
        
        const idField = queryFields.find(arg => arg.name === querySchemaInfo.graphDBIdArgName);
        const nodeID = idField.value;
        const nodeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        const idParam  = `${nodeName}_${idField.name}`;
        Object.assign(parameters, {[idParam]: nodeID});
        
        let returnBlock = `ID(${nodeName})`;
        if (queryAst.definitions[0].selectionSet.selections[0].selectionSet) {
            returnBlock = getReturnBlockFromSelection(queryAst.definitions[0].selectionSet.selections[0], querySchemaInfo);
        }
        // :( SET += is not working, so let's work around it.
        //let ocQuery = `MATCH (${nodeName}) WHERE ID(${nodeName}) = '${nodeID}' SET ${nodeName} += {${inputFields}} RETURN ${returnBlock}`;
        // workaround:
        const formattedFields = queryFields.filter(arg => {
           return arg.name !== querySchemaInfo.graphDBIdArgName;
        }).map(arg => {
            const param = querySchemaInfo.pathName + '_' + arg.name;
            Object.assign(parameters, { [param]: arg.value });
            return `${nodeName}.${arg.name} = $${param}`;
        }).join(', ');
        // FIXME handle update mutations with selection set that contains an edge
        // example:
        // updateNodeAirport(input: $input) {
        //     id
        //     airportRoutesIn {
        //       code
        //     }
        //   }
        return `MATCH (${nodeName})\nWHERE ID(${nodeName}) = $${idParam}\nSET ${formattedFields}\nRETURN ${returnBlock}`;
    }

    // deleteNode
    if (querySchemaInfo.name.startsWith('deleteNode') && !querySchemaInfo.graphQuery) {
        const nodeID = queryAst.definitions[0].selectionSet.selections[0].arguments[0].value.value;
        const nodeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        let param  = nodeName + '_' + 'whereId';
        Object.assign(parameters, {[param]: nodeID});
        const ocQuery = `MATCH (${nodeName})\nWHERE ID(${nodeName}) = $${param}\nDETACH DELETE ${nodeName}\nRETURN true`;
        return ocQuery;
    }

    // connect
    if (querySchemaInfo.name.startsWith('connectNode') && querySchemaInfo.graphQuery == null) {
        let fromID = queryAst.definitions[0].selectionSet.selections[0].arguments[0].value.value;
        let toID = queryAst.definitions[0].selectionSet.selections[0].arguments[1].value.value;
        const edgeType = querySchemaInfo.name.match(new RegExp('Edge' + "(.*)" + ''))[1];
        const edgeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        const egdgeTypeAlias = getTypeAlias(edgeType);
        const returnBlock = getReturnBlockFromSelection(queryAst.definitions[0].selectionSet.selections[0], querySchemaInfo);

        let paramFromId  = edgeName + '_' + 'whereFromId';
        let paramToId  = edgeName + '_' + 'whereToId';
        Object.assign(parameters, {[paramFromId]: fromID});
        Object.assign(parameters, {[paramToId]: toID});
        
        const ocQuery = `MATCH (from), (to)\nWHERE ID(from) = $${paramFromId} AND ID(to) = $${paramToId}\nCREATE (from)-[${edgeName}:\`${egdgeTypeAlias}\`]->(to)\nRETURN ${returnBlock}`;
        return ocQuery;
    }

    // updateEdge
    if (querySchemaInfo.name.startsWith('updateEdge') && querySchemaInfo.graphQuery == null) {
        let fromID = queryAst.definitions[0].selectionSet.selections[0].arguments[0].value.value;
        let toID = queryAst.definitions[0].selectionSet.selections[0].arguments[1].value.value;
        let edgeType = querySchemaInfo.name.match(new RegExp('updateEdge' + "(.*)" + 'From'))[1];
        let egdgeTypeAlias = getTypeAlias(edgeType);
        const edgeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
        let returnBlock = `ID(${edgeName})`;
        if (queryAst.definitions[0].selectionSet.selections[0].selectionSet) {
            returnBlock = getReturnBlockFromSelection(queryAst.definitions[0].selectionSet.selections[0], querySchemaInfo);
        }
        const fields = extractCypherFieldsFromArgumentFields(queryAst.definitions[0].selectionSet.selections[0].arguments[2].value.fields, querySchemaInfo);
        const formattedFields = fields.map(field => {
            const param = querySchemaInfo.pathName + '_' + field.name;
            Object.assign(parameters, { [param]: field.value });
            return `${edgeName}.${field.name} = $${param}`;
        }).join(',');

        const paramFromId  = edgeName + '_' + 'whereFromId';
        const paramToId  = edgeName + '_' + 'whereToId';
        Object.assign(parameters, {[paramFromId]: fromID});
        Object.assign(parameters, {[paramToId]: toID});

        const ocQuery = `MATCH (from)-[${edgeName}:\`${egdgeTypeAlias}\`]->(to)\nWHERE ID(from) = $${paramFromId} AND ID(to) = $${paramToId}\nSET ${formattedFields}\nRETURN ${returnBlock}`;
        return  ocQuery;
    }

    // deleteEdge
    if (querySchemaInfo.name.startsWith('deleteEdge') && querySchemaInfo.graphQuery == null) {
        let fromID = queryAst.definitions[0].selectionSet.selections[0].arguments[0].value.value;
        let toID = queryAst.definitions[0].selectionSet.selections[0].arguments[1].value.value;
        const edgeName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;

        const paramFromId  = edgeName + '_' + 'whereFromId';
        const paramToId  = edgeName + '_' + 'whereToId';
        Object.assign(parameters, {[paramFromId]: fromID});
        Object.assign(parameters, {[paramToId]: toID});

        const ocQuery = `MATCH (from)-[${edgeName}]->(to)\nWHERE ID(from) = $${paramFromId} AND ID(to) = $${paramToId}\nDELETE ${edgeName}\nRETURN true`;
        return  ocQuery;
    }

    // graph query directive
    if (querySchemaInfo.graphQuery != null) {

        let ocQuery = querySchemaInfo.graphQuery;

        if (ocQuery.includes('$input')) {
            const inputFields = extractCypherFieldsFromArgumentFields(queryAst.definitions[0].selectionSet.selections[0].arguments[0].value.fields, querySchemaInfo);
            const formattedFields = inputFields.map(field => {
                const param = querySchemaInfo.pathName + '_' + field.name;
                Object.assign(parameters, { [param]: field.value });
                return `${field.name}: $${param}`;
            }).join(', ');
            
            ocQuery = ocQuery.replace('$input', formattedFields);
        } else {
            queryAst.definitions[0].selectionSet.selections[0].arguments.forEach(arg => {
                ocQuery = ocQuery.replace('$' + arg.name.value, arg.value.value);
            });
        }

        if (ocQuery.includes('RETURN')) {
            const statements = ocQuery.split(' RETURN ');
            const entityName = querySchemaInfo.name + '_' + querySchemaInfo.returnType;
            const body = statements[0].replace("this", entityName);
            const returnBlock = returnStringOnly(queryAst.definitions[0].selectionSet.selections[0].selectionSet.selections, querySchemaInfo);
            ocQuery = body + '\nRETURN ' + returnBlock;
        }

        return ocQuery;
    }

    return '';
}


function resolveOpenCypherQuery(obj, querySchemaInfo) {
    let ocQuery = '';

    // clear 
    matchStatements.splice(0,matchStatements.length);
    withStatements.splice(0,withStatements.length);
    returnString.splice(0, returnString.length);
    parameters = {};

    if (querySchemaInfo.type === 'Query') {
        ocQuery = resolveGrapgDBqueryForGraphQLQuery(obj, querySchemaInfo);
    }

    if (querySchemaInfo.type === 'Mutation') {
        ocQuery = resolveGrapgDBqueryForGraphQLMutation(obj, querySchemaInfo);
    }

    return ocQuery;
}


function gremlinElementToJson(o, fieldsAlias) {
    let data = '';
    let isKey = true;
    data += '{';
    o['@value'].forEach(v => {
        if (v['@value'] != undefined) {
            if (v['@value'] == 'label')
                data += '"type":';
            if (v['@value'] == 'id')
                //data += '"id":';
                data += '"' + fieldsAlias["id"] + '":';
            if (v['@type'] == 'g:Int32' || v['@type'] == 'g:Double' || v['@type'] == 'g:Int64')
                data += v['@value'] + ', ';
            isKey = !isKey;
        } else {
            if (isKey) {
                data += '"' + fieldsAlias[v] + '":';
                isKey = false;
            } else {
                data += '"' + v + '", ';
                isKey = true;
            }
        }
    });
    data = data.substring(0, data.length - 2);
    data += '}';
    return data;
}


export function refactorGremlinqueryOutput(queryResult, fieldsAlias) {

    //const r = JSON.parse(queryResult).result.data;
    const r = queryResult;

    let data = '';
    let isScalar = false;
    let isOneElement = false;
    let isArray = false;

    if (r['@value'].length == 1) {
        if (r['@value'][0]['@type'] == 'g:Map')
            isOneElement = true;
        else if (r['@value'][0]['@type'] == 'g:List')
            isArray = true;
        else
            isScalar = true
    }

    if (isScalar) {
        data =  r['@value'][0]['@value'];
    } else if (isOneElement) {
        data += gremlinElementToJson(r['@value'][0], fieldsAlias);
    } else {
        data += '[';

        r['@value'][0]['@value'].forEach(e => {
            try {
                data += gremlinElementToJson(e, fieldsAlias);
                data +=',\n';
            } catch {}
        });

        data = data.substring(0, data.length - 2);
        data += ']';
    }

    return data;
}


function getFieldsAlias(typeName) {
    const r = {};

    schemaDataModel.definitions.forEach(def => {
        if (def.kind === 'ObjectTypeDefinition') {
            if (def.name.value === typeName) {
                def.fields.forEach(field => {
                    let alias = field.name.value;
                    if (field.directives.length > 0) {
                        field.directives.forEach(directive => {
                            if (directive.name.value === 'alias') {
                                alias = directive.arguments[0].value.value;
                            }
                            if (directive.name.value === 'id') {
                                alias = 'id';
                            }
                        });
                    }
                    r[alias] = field.name.value;
                });

            }
        }
    });

    return r;
}


function resolveGremlinQuery(obj, querySchemaInfo) {
    let gremlinQuery = {
        query:'',
        language: 'gremlin',
        parameters: {},
        refactorOutput: null,
        fieldsAlias: getFieldsAlias(querySchemaInfo.returnType) };

    // replace values from input parameters
    gremlinQuery.query = querySchemaInfo.graphQuery;
    obj.definitions[0].selectionSet.selections[0].arguments.forEach(arg => {
        gremlinQuery.query = gremlinQuery.query.replace('$' + arg.name.value, arg.value.value);
    });

    return gremlinQuery;
}


function parseQueryInput(queryObjOrStr) {
    // Backwards compatibility
    if (typeof queryObjOrStr === 'string') {
        return gql(queryObjOrStr);
    }

    // Already in AST format
    return queryObjOrStr;
}


/**
 * Accepts a GraphQL document or query string and outputs the graphDB query.
 *
 * @param {(Object|string)} queryObjOrStr the GraphQL document containing an operation to resolve
 * @param {object} variables optional query variables
 * @param {object} fragments optional query fragments
 * @returns {string} resolved graph db query
 */
export function resolveGraphDBQuery({queryObjOrStr, variables = {}, fragments = {}}) {
    let executeQuery =  { query:'', parameters: {}, language: 'opencypher', refactorOutput: null };

    const obj = parseQueryInput(queryObjOrStr);

    const querySchemaInfo = getSchemaQueryInfo(obj.definitions[0].selectionSet.selections[0].name.value);
    querySchemaInfo.variables = variables;
    querySchemaInfo.fragments = fragments;

    if (querySchemaInfo.graphQuery != null) {
        if (querySchemaInfo.graphQuery.startsWith('g.V')) {
            executeQuery.language = 'gremlin'
        }
    }

    if (executeQuery.language == 'opencypher') {
        executeQuery.query = resolveOpenCypherQuery(obj, querySchemaInfo);
        executeQuery.parameters = parameters;
    }

    if (executeQuery.language == 'gremlin') {
        executeQuery = resolveGremlinQuery(obj, querySchemaInfo);
    }

    return executeQuery;
}
