import { changeGraphQLSchema } from '../changes.js';

const baseSchema = `
type Airport {
    desc: String
    desc2: String
    code: String
    getAirport(code: String): Airport
}

type Query {
    getAirport(code: String): Airport
    listAirports: [Airport]
}
`;

// Mimics changeGraphQLSchema() internal formatting: trim each line and append a trailing newline
const normalize = (s) => s.split('\n').map(l => l.trim()).join('\n') + '\n';

describe('changeGraphQLSchema', () => {
    // Core functionality

    test('add action injects field before closing brace of matching type', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'add', value: 'city: String' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('city: String');
    });

    test('remove action strips matching field line from type', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'remove', field: 'code' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toMatch(/^code: String$/m);
    });

    test('add and remove together in same changes file', () => {
        const changes = JSON.stringify([
            { type: 'Airport', action: 'remove', field: 'code' },
            { type: 'Airport', action: 'add', value: 'city: String' }
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toMatch(/^code: String$/m);
        expect(result).toContain('city: String');
    });

    test('changes with no matching type return schema unchanged', () => {
        const changes = JSON.stringify([{ type: 'NonExistent', action: 'add', value: 'x: Int' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
    });

    test('empty changes array returns schema unchanged', () => {
        const result = changeGraphQLSchema(baseSchema, JSON.stringify([]));
        expect(result).toBe(normalize(baseSchema));
    });

    // Bug fix verification

    test('remove with prefix field name removes only exact match, not prefix matches', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'remove', field: 'desc' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toMatch(/^desc: String$/m);
        expect(result).toContain('desc2: String');
    });

    test('remove matches field with argument list', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'remove', field: 'getAirport' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        // getAirport exists in both Airport and Query — extract Airport block to verify only it was affected
        const lines = result.split('\n');
        const airportLines = [];
        let inAirport = false;
        for (const line of lines) {
            if (line.startsWith('type Airport')) inAirport = true;
            if (inAirport) airportLines.push(line);
            if (inAirport && line.startsWith('}')) break;
        }
        expect(airportLines.join('\n')).not.toContain('getAirport(code: String): Airport');
        expect(result).toContain('getAirport(code: String): Airport');
    });

    test('remove matches field with space before colon', () => {
        const schema = 'type Airport {\n  desc : String\n  desc2: String\n}\n';
        const changes = JSON.stringify([{ type: 'Airport', action: 'remove', field: 'desc' }]);
        const result = changeGraphQLSchema(schema, changes);
        expect(result).not.toMatch(/^desc : String$/m);
        expect(result).toContain('desc2: String');
    });

    test('remove with empty field name does not remove any lines', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'remove', field: '' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
    });

    // Edge cases

    test('multiple add actions to the same type', () => {
        const changes = JSON.stringify([
            { type: 'Airport', action: 'add', value: 'city: String' },
            { type: 'Airport', action: 'add', value: 'country: String' }
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('city: String');
        expect(result).toContain('country: String');
    });

    test('remove for a field that does not exist returns schema unchanged', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'remove', field: 'nonexistent' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
    });

    test('changes only affect the targeted type', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'add', value: 'city: String' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        const lines = result.split('\n');
        const queryLines = [];
        let inQuery = false;
        for (const line of lines) {
            if (line.startsWith('type Query')) inQuery = true;
            if (inQuery) queryLines.push(line);
            if (inQuery && line.startsWith('}')) break;
        }
        expect(queryLines.join('\n')).not.toContain('city: String');
    });

    test('add action value containing directives preserves them', () => {
        const changes = JSON.stringify([{
            type: 'Query',
            action: 'add',
            value: 'getConn(fromCode: String!, toCode: String!): Airport @graphQuery(statement: "g.V()")'
        }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('getConn(fromCode: String!, toCode: String!): Airport @graphQuery(statement: "g.V()")');
    });
});
