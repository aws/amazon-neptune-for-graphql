import {ApolloServer} from '@apollo/server';
import {startStandaloneServer} from '@apollo/server/standalone';
import {buildSubgraphSchema} from '@apollo/subgraph';
import {readFileSync} from 'fs';
import {gql} from 'graphql-tag';
import {resolveEvent} from './neptune.mjs'
import dotenv from 'dotenv';

dotenv.config();

const typeDefs = gql(readFileSync('./output.schema.graphql', 'utf-8'));
const queryDefinition = typeDefs.definitions.find(
    definition => definition.kind === 'ObjectTypeDefinition' && definition.name.value === 'Query'
);
const queryNames = queryDefinition ? queryDefinition.fields.map(field => field.name.value) : [];

const mutationDefinition = typeDefs.definitions.find(
    definition => definition.kind === 'ObjectTypeDefinition' && definition.name.value === 'Mutation'
);
const mutationNames = mutationDefinition ? mutationDefinition.fields.map(field => field.name.value) : [];

/**
 * Resolves GraphQL queries and mutations by processing the info object and arguments.
 *
 * @param {Object} info - GraphQLResolveInfo object
 * @param {Object} args - graphQL query arguments
 * @returns {Promise<*>} Resolved data from the event processor
 */
function resolve(info, args) {
    if (!info?.fieldName) {
        throw new Error('Missing fieldName on GraphQLResolveInfo');
    }
    if (!Array.isArray(info.fieldNodes) || info.fieldNodes.length !== 1) {
        throw new Error('Invalid fieldNodes on GraphQLResolveInfo');
    }
    const event = {
        field: info.fieldName,
        arguments: args,
        selectionSet: info.fieldNodes[0].selectionSet,
        variables: info.variableValues,
    };

    return resolveEvent(event).then((result) => {
        return result;
    });
}

const resolvers = {
    Query: queryNames.reduce((accumulator, queryName) => {
        accumulator[queryName] = (parent, args, context, info) => {
            return resolve(info, args);
        };
        return accumulator;
    }, {}),

    Mutation: mutationNames.reduce((accumulator, mutationName) => {
        accumulator[mutationName] = (parent, args, context, info) => {
            return resolve(info, args);
        };
        return accumulator;
    }, {}),
};

const server = process.env.SUBGRAPH === 'true' ? new ApolloServer({
    schema: buildSubgraphSchema([{
        typeDefs,
        resolvers
    }])
}) : new ApolloServer({typeDefs, resolvers});

const {url} = await startStandaloneServer(server);
console.log(`🚀 Server ready at ${url}`);
