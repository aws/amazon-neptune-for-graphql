import {ApolloServer} from '@apollo/server';
import {startStandaloneServer} from '@apollo/server/standalone';
import {buildSubgraphSchema} from '@apollo/subgraph';
import {readFileSync} from 'fs';
import {gql} from 'graphql-tag';
import {resolveEvent} from './neptune.mjs'
import dotenv from 'dotenv';

dotenv.config();

const typeDefs = gql(readFileSync('./schema.graphql', 'utf-8'));
const queryDefinition = typeDefs.definitions.find(
    definition => definition.kind === 'ObjectTypeDefinition' && definition.name.value === 'Query'
);
const queryNames = queryDefinition ? queryDefinition.fields.map(field => field.name.value) : [];

const resolvers = {
    // only Query is supported for now, no Mutations
    Query: queryNames.reduce((accumulator, queryName) => {
        accumulator[queryName] = (parent, args, context, info) => {
            const event = {
                field: info.fieldName,
                arguments: args,
                selectionSet: info.fieldNodes[0].selectionSet,
            };

            return resolveEvent(event).then((result) => {
                return result;
            });
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
