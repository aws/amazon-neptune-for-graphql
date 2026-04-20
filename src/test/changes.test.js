import { changeGraphQLSchema, validateReturnTypes } from '../changes.js';
import { loggerInit } from '../logger.js';

loggerInit('./output', false, 'silent');

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

const extractTypeBlock = (schema, typeName) => {
    const lines = schema.split('\n');
    const block = [];
    let inside = false;
    for (const line of lines) {
        if (line.startsWith(`type ${typeName}`)) inside = true;
        if (inside) block.push(line);
        if (inside && line.trim().endsWith('}')) break;
    }
    return block.join('\n');
};

describe('changeGraphQLSchema - input validation', () => {
    test('malformed JSON in changes throws a helpful error', () => {
        expect(() => changeGraphQLSchema(baseSchema, '{not json')).toThrow(/Invalid JSON in --input-schema-changes-file/);
    });

    test('non-array changes payload throws a helpful error', () => {
        expect(() => changeGraphQLSchema(baseSchema, '{"action": "add"}')).toThrow(/--input-schema-changes-file must be a JSON array/);
    });
});

describe('changeGraphQLSchema - add/remove actions', () => {
    // Core functionality

    test('add action injects field before closing brace of matching type', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'add', value: 'city: String' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(extractTypeBlock(result, 'Airport')).toContain('city: String');
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
        expect(extractTypeBlock(result, 'Airport')).toContain('city: String');
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
        const airportBlock = extractTypeBlock(result, 'Airport');
        expect(airportBlock).not.toContain('getAirport(code: String): Airport');
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
        const airportBlock = extractTypeBlock(result, 'Airport');
        expect(airportBlock).toContain('city: String');
        expect(airportBlock).toContain('country: String');
    });

    test('remove for a field that does not exist returns schema unchanged', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'remove', field: 'nonexistent' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
    });

    test('changes only affect the targeted type', () => {
        const changes = JSON.stringify([{ type: 'Airport', action: 'add', value: 'city: String' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        const queryBlock = extractTypeBlock(result, 'Query');
        expect(queryBlock).not.toContain('city: String');
        const airportBlock = extractTypeBlock(result, 'Airport');
        expect(airportBlock).toContain('city: String');
    });

    test('add action value containing directives preserves them', () => {
        const changes = JSON.stringify([{
            type: 'Query',
            action: 'add',
            value: 'getConn(fromCode: String!, toCode: String!): Airport @graphQuery(statement: "g.V()")'
        }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(extractTypeBlock(result, 'Query')).toContain('getConn(fromCode: String!, toCode: String!): Airport @graphQuery(statement: "g.V()")');
    });
});

describe('changeGraphQLSchema - addType action', () => {
    test('addType appends a new type definition to the end of the schema', () => {
        const changes = JSON.stringify([{ action: 'addType', value: 'type Stats { count: Int }' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result.endsWith('type Stats { count: Int }\n')).toBe(true);
    });

    test('multiple addType entries all get appended', () => {
        const changes = JSON.stringify([
            { action: 'addType', value: 'type A { x: Int }' },
            { action: 'addType', value: 'type B { y: String }' }
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('type A { x: Int }');
        expect(result).toContain('type B { y: String }');
    });

    test('addType with directives in the value preserves them', () => {
        const changes = JSON.stringify([{ action: 'addType', value: 'type Foo @alias(property: "bar") { name: String }' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('@alias(property: "bar")');
    });

    test('existing add/remove actions still work alongside addType', () => {
        const changes = JSON.stringify([
            { type: 'Airport', action: 'add', value: 'city: String' },
            { type: 'Airport', action: 'remove', field: 'code' },
            { action: 'addType', value: 'type Stats { count: Int }' }
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('city: String');
        expect(result).not.toMatch(/^code: String$/m);
        expect(result).toContain('type Stats { count: Int }');
    });

    test('addType with empty body type passes', () => {
        const changes = JSON.stringify([{ action: 'addType', value: 'type EmptyType { }' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('type EmptyType { }');
    });

    test('addType with missing value property is silently skipped (does not corrupt schema)', () => {
        const changes = JSON.stringify([{ action: 'addType' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toContain('undefined');
        expect(result).toBe(normalize(baseSchema));
    });

    test('addType with value: null is silently skipped', () => {
        const changes = JSON.stringify([{ action: 'addType', value: null }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toContain('null');
        expect(result).toBe(normalize(baseSchema));
    });

    test('addType with non-string value (number) is silently skipped', () => {
        const changes = JSON.stringify([{ action: 'addType', value: 123 }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toContain('123');
        expect(result).toBe(normalize(baseSchema));
    });

    test('addType with non-string value (object) is silently skipped', () => {
        const changes = JSON.stringify([{ action: 'addType', value: {} }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toContain('[object Object]');
        expect(result).toBe(normalize(baseSchema));
    });

    test('addType with fields referencing existing schema types preserves references', () => {
        const changes = JSON.stringify([{ action: 'addType', value: 'type Stats { airport: Airport }' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('type Stats { airport: Airport }');
    });

    test('addType with a type name that already exists appends duplicate', () => {
        const changes = JSON.stringify([{ action: 'addType', value: 'type Airport { name: String }' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        const matches = result.match(/type Airport/g);
        expect(matches.length).toBe(2);
    });

    test('add action targeting a type defined via addType in same changes file has no effect', () => {
        const changes = JSON.stringify([
            { action: 'addType', value: 'type NewType {\n}' },
            { type: 'NewType', action: 'add', value: 'foo: String' }
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('type NewType {\n}');
        expect(result).not.toMatch(/foo: String[\s\S]*type NewType/);
    });

    test('remove action targeting a field inside addType block in same changes file has no effect', () => {
        const changes = JSON.stringify([
            { action: 'addType', value: 'type NewType {\nfoo: String\n}' },
            { type: 'NewType', action: 'remove', field: 'foo' }
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('type NewType {\nfoo: String\n}');
    });

    test('addType output containing invalid GraphQL contains the bad content', () => {
        const changes = JSON.stringify([{ action: 'addType', value: 'type Bad { @@@ not valid }' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('type Bad { @@@ not valid }');
    });

    test('addType with whitespace-only value does not corrupt the schema', () => {
        const changes = JSON.stringify([{ action: 'addType', value: '   ' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
    });

    test('addType with empty string value does not corrupt the schema', () => {
        const changes = JSON.stringify([{ action: 'addType', value: '' }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
    });
});

describe('validateReturnTypes', () => {
    test('validateReturnTypes(null) does not throw', () => {
        expect(() => validateReturnTypes(null)).not.toThrow();
    });

    test('validateReturnTypes(undefined) does not throw', () => {
        expect(() => validateReturnTypes(undefined)).not.toThrow();
    });

    test('Query returning an undefined type throws with message mentioning the missing type and addType', () => {
        const schema = 'type Query {\ngetFoo: Foo\n}';
        expect(() => validateReturnTypes(schema)).toThrow('Return types not defined in schema: Foo. Consider using "action": "addType" to add the missing types.');
    });

    test('Mutation returning an undefined type throws', () => {
        const schema = 'type Mutation {\ncreateFoo: Foo\n}';
        expect(() => validateReturnTypes(schema)).toThrow('Return types not defined in schema: Foo. Consider using "action": "addType" to add the missing types.');
    });

    test('Query returning a type defined via addType passes', () => {
        const schema = 'type Query {\ngetStats: Stats\n}';
        const changes = JSON.stringify([{ action: 'addType', value: 'type Stats { count: Int }' }]);
        const result = changeGraphQLSchema(schema, changes);
        expect(() => validateReturnTypes(result)).not.toThrow();
    });

    test('Mutation returning a type defined via addType passes', () => {
        const schema = 'type Mutation {\ncreateStats: Stats\n}';
        const changes = JSON.stringify([{ action: 'addType', value: 'type Stats { count: Int }' }]);
        const result = changeGraphQLSchema(schema, changes);
        expect(() => validateReturnTypes(result)).not.toThrow();
    });

    test('Query returning a pre-existing type defined elsewhere in the schema passes', () => {
        const schema = 'type Airport {\ncode: String\n}\ntype Query {\ngetAirport: Airport\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning a built-in scalar passes', () => {
        const schema = 'type Query {\ngetName: String\ngetCount: Int\ngetScore: Float\ngetFlag: Boolean\ngetId: ID\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning an AWS custom scalar passes', () => {
        const schema = 'type Query {\ngetDate: AWSDateTime\ngetData: AWSJSON\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning a user-defined custom scalar passes', () => {
        const schema = 'scalar MyScalar\ntype Query {\ngetVal: MyScalar\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query field with arguments and directives extracts return type correctly', () => {
        const schema = 'type Airport {\ncode: String\n}\ntype Query {\ngetAirport(code: String): Airport @graphQuery(statement: "g.V()")\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning a list type validates the unwrapped inner type', () => {
        const schema = 'type Foo {\nx: Int\n}\ntype Query {\ngetFoos: [Foo]\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning a non-null type validates the unwrapped base type', () => {
        const schema = 'type Foo {\nx: Int\n}\ntype Query {\ngetFoo: Foo!\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning a non-null list type validates the unwrapped base type', () => {
        const schema = 'type Foo {\nx: Int\n}\ntype Query {\ngetFoos: [Foo!]\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning an enum type passes', () => {
        const schema = 'enum Status { ACTIVE INACTIVE }\ntype Query {\ngetStatus: Status\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning an input type passes', () => {
        const schema = 'input MyInput {\nname: String\n}\ntype Query {\ngetInput: MyInput\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('addType with enum value followed by validateReturnTypes passes', () => {
        const schema = 'type Query {\ngetStatus: Status\n}';
        const changes = JSON.stringify([{ action: 'addType', value: 'enum Status { ACTIVE INACTIVE }' }]);
        const result = changeGraphQLSchema(schema, changes);
        expect(() => validateReturnTypes(result)).not.toThrow();
    });

    test('multiple missing types are all reported in the error message', () => {
        const schema = 'type Query {\ngetFoo: Foo\ngetBar: Bar\n}';
        expect(() => validateReturnTypes(schema)).toThrow('Return types not defined in schema: Foo, Bar. Consider using "action": "addType" to add the missing types.');
    });

    test('schema with no Query or Mutation block passes silently', () => {
        const schema = 'type Airport {\ncode: String\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('empty Query block passes silently', () => {
        const schema = 'type Query {\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('comment line does not register as a known type', () => {
        const schema = '# type FakeType {\ntype Query {\ngetFake: FakeType\n}';
        expect(() => validateReturnTypes(schema)).toThrow('Return types not defined in schema: FakeType. Consider using "action": "addType" to add the missing types.');
    });

    test('lines with no colon inside Query block are skipped without error', () => {
        const schema = 'type Foo {\nx: Int\n}\ntype Query {\n\n# a comment\ngetFoo: Foo\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning a list of undefined type throws', () => {
        const schema = 'type Query {\ngetFoos: [Foo]\n}';
        expect(() => validateReturnTypes(schema)).toThrow('Foo');
    });

    test('Query field with directive containing colons in value extracts return type correctly', () => {
        const schema = "type Airport {\ncode: String\n}\ntype Query {\ngetConn(fromCode: String!, toCode: String!): Airport @cypher(statement: \"MATCH (:airport{code: '$fromCode'})-[:route]->(this:airport)\")\n}";
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('indented schema lines are handled correctly', () => {
        const schema = '  type Foo {\n    x: Int\n  }\n  type Query {\n    getFoo: Foo\n  }';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query with directive on type line is still detected', () => {
        const schema = 'type Foo { x: Int }\ntype Query @aws_cognito_user_pools {\ngetFoo: Foo\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('single-line type Query definition with undefined type throws', () => {
        const schema = 'type Query { getX: UndefinedType }';
        expect(() => validateReturnTypes(schema)).toThrow('Return types not defined in schema: UndefinedType. Consider using "action": "addType" to add the missing types.');
    });

    test('Query returning an interface type passes', () => {
        const schema = 'interface Node {\nid: ID!\n}\ntype Foo implements Node {\nid: ID!\n}\ntype Query {\ngetNode: Node\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('Query returning a union type passes', () => {
        const schema = 'type Foo {\nx: Int\n}\ntype Bar {\ny: Int\n}\nunion Result = Foo | Bar\ntype Query {\nsearch: Result\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('comment line with colon inside Query block does not cause false positive', () => {
        const schema = 'type Foo {\nx: Int\n}\ntype Query {\n# deprecated: OldType\ngetFoo: Foo\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('extend type Query with an undefined return type throws', () => {
        const schema = 'type Query {\nnoop: String\n}\nextend type Query {\ngetFoo: Undefined\n}';
        expect(() => validateReturnTypes(schema)).toThrow('Return types not defined in schema: Undefined. Consider using "action": "addType" to add the missing types.');
    });

    test('extend type Foo defines Foo so Query returning Foo passes', () => {
        const schema = 'extend type Foo {\nx: Int\n}\ntype Query {\ngetFoo: Foo\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('directive attached with no leading space does not cause a false positive', () => {
        const schema = 'type Foo {\nx: Int\n}\ntype Query {\ngetFoo: Foo@graphQuery(statement: "g.V()")\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('triple-quoted description containing "type FakeType {" does not make FakeType known', () => {
        const schema = '"""\ntype FakeType {\nsomething\n"""\ntype Query {\ngetFake: FakeType\n}';
        expect(() => validateReturnTypes(schema)).toThrow('Return types not defined in schema: FakeType. Consider using "action": "addType" to add the missing types.');
    });

    test('type declared after Query/Mutation that references it passes (order-independent)', () => {
        const schema = 'type Query {\ngetFoo: Foo\n}\ntype Foo {\nx: Int\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('type name starting with "Extend" is not mis-stripped', () => {
        const schema = 'type Extended { x: Int }\ntype Query { getE: Extended }';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('multi-line description inside Query containing a field-like pattern does not false-positive', () => {
        const schema = 'type Query {\n"""\nReturns a name. Example:\n  foo: UndefinedType\n"""\ngetName: String\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('field after a multi-line description inside Query is still validated', () => {
        const schema = 'type Query {\n"""\nFetches the foo.\n"""\ngetFoo: Missing\n}';
        expect(() => validateReturnTypes(schema)).toThrow('Return types not defined in schema: Missing. Consider using "action": "addType" to add the missing types.');
    });
    test('@ inside default value string does not cause a false positive', () => {
        const schema = 'type Query {\ngetFoo(email: String = "a@b.com"): String\n}';
        expect(() => validateReturnTypes(schema)).not.toThrow();
    });

    test('default-value string does not mask a genuinely missing return type', () => {
        const schema = 'type Query {\ngetFoo(email: String = "a@b.com"): Missing\n}';
        expect(() => validateReturnTypes(schema)).toThrow(/Missing/);
    });
});
