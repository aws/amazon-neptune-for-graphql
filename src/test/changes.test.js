import os from "os";
import { changeGraphQLSchema, validateReturnTypes } from "../changes.js";
import { schemaParser } from "../schemaParser.js";
import { loggerInit } from "../logger.js";

loggerInit(os.tmpdir(), false, "silent");

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

describe("changeGraphQLSchema", () => {
  // Mimics changeGraphQLSchema() internal formatting: trim each line and append a trailing newline
  const normalize = (s) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .join("\n") + "\n";

  // Extracts lines from `type <name>` through the first closing-brace line.
  const extractTypeBlock = (schema, typeName) => {
    const lines = schema.split("\n");
    const block = [];
    let inside = false;
    for (const line of lines) {
      if (line.startsWith(`type ${typeName}`)) inside = true;
      if (inside) block.push(line);
      if (inside && line.trim().endsWith("}")) break;
    }
    return block.join("\n");
  };

  describe("malformed input", () => {
    describe("payload shape", () => {
      test("malformed JSON in changes throws a helpful error", () => {
        expect(() => changeGraphQLSchema(baseSchema, "{not json")).toThrow(
          /Invalid JSON in --input-schema-changes-file/,
        );
      });

      test("non-array changes payload throws a helpful error", () => {
        expect(() =>
          changeGraphQLSchema(baseSchema, '{"action": "add"}'),
        ).toThrow(/--input-schema-changes-file must be a JSON array/);
      });
    });

    describe("invalid change properties", () => {
      test("remove action with missing field property does not remove any lines", () => {
        const changes = JSON.stringify([{ type: "Airport", action: "remove" }]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
      });

      test("remove action with non-string field property does not remove any lines", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "remove", field: 42 },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
      });
    });
  });

  describe("add/remove actions", () => {
    describe("core functionality", () => {
      test("add action injects field into matching type", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "add", value: "city: String" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(extractTypeBlock(result, "Airport")).toContain("city: String");
        // Other fields survive.
        expect(extractTypeBlock(result, "Airport")).toContain("code: String");
        expect(extractTypeBlock(result, "Airport")).toContain("desc: String");
        // Query type is untouched.
        expect(extractTypeBlock(result, "Query")).not.toContain("city: String");
      });

      test("remove action strips matching field line from type", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "remove", field: "code" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toMatch(/^code: String$/m);
        // Other Airport fields survive.
        const airportBlock = extractTypeBlock(result, "Airport");
        expect(airportBlock).toContain("desc: String");
        expect(airportBlock).toContain("desc2: String");
        // Result still parses as valid SDL.
        expect(() => schemaParser(result)).not.toThrow();
      });

      test("add and remove together in same changes file", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "remove", field: "code" },
          { type: "Airport", action: "add", value: "city: String" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toMatch(/^code: String$/m);
        const airportBlock = extractTypeBlock(result, "Airport");
        expect(airportBlock).toContain("city: String");
        expect(airportBlock).toContain("desc: String");
        expect(airportBlock).toContain("desc2: String");
        expect(() => schemaParser(result)).not.toThrow();
      });

      test("changes with no matching type return schema unchanged", () => {
        const changes = JSON.stringify([
          { type: "NonExistent", action: "add", value: "x: Int" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
      });

      test("empty changes array returns schema unchanged", () => {
        const result = changeGraphQLSchema(baseSchema, JSON.stringify([]));
        expect(result).toBe(normalize(baseSchema));
      });
    });

    describe("edge cases", () => {
      // Regression: 'desc' removal previously also stripped 'desc2' (startsWith prefix bug).
      test("remove with prefix field name does not remove fields sharing a prefix", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "remove", field: "desc" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).not.toMatch(/^desc: String$/m);
        expect(result).toContain("desc2: String");
      });

      // Regression: fields with '(' after the name were not matched by remove.
      test("remove matches field with argument list", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "remove", field: "getAirport" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        // getAirport exists in both Airport and Query — extract Airport block to verify only it was affected
        const airportBlock = extractTypeBlock(result, "Airport");
        expect(airportBlock).not.toContain("getAirport(code: String): Airport");
        expect(extractTypeBlock(result, "Query")).toContain(
          "getAirport(code: String): Airport",
        );
      });

      // Regression: 'desc :' (space before colon) was not matched by remove.
      test("remove matches field when space separates name from colon", () => {
        const schema = "type Airport {\n  desc : String\n  desc2: String\n}\n";
        const changes = JSON.stringify([
          { type: "Airport", action: "remove", field: "desc" },
        ]);
        const result = changeGraphQLSchema(schema, changes);
        expect(result).not.toMatch(/^desc : String$/m);
        expect(result).toContain("desc2: String");
      });

      // Regression: empty field string previously matched every line via ''.startsWith('').
      test("remove with empty field name does not remove any lines", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "remove", field: "" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
      });

      test("multiple add actions to the same type", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "add", value: "city: String" },
          { type: "Airport", action: "add", value: "country: String" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        const airportBlock = extractTypeBlock(result, "Airport");
        expect(airportBlock).toContain("city: String");
        expect(airportBlock).toContain("country: String");
      });

      test("remove for a field that does not exist returns schema unchanged", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "remove", field: "nonexistent" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toBe(normalize(baseSchema));
      });

      test("changes only affect the targeted type", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "add", value: "city: String" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        const queryBlock = extractTypeBlock(result, "Query");
        expect(queryBlock).not.toContain("city: String");
        const airportBlock = extractTypeBlock(result, "Airport");
        expect(airportBlock).toContain("city: String");
      });

      test("add action value containing directives preserves them", () => {
        const changes = JSON.stringify([
          {
            type: "Query",
            action: "add",
            value:
              'getConn(fromCode: String!, toCode: String!): Airport @graphQuery(statement: "g.V()")',
          },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(extractTypeBlock(result, "Query")).toContain(
          'getConn(fromCode: String!, toCode: String!): Airport @graphQuery(statement: "g.V()")',
        );
      });
    });
  });

  describe("addType action", () => {
    describe("appending", () => {
      test("addType appends a new type definition to the end of the schema", () => {
        const changes = JSON.stringify([
          { action: "addType", value: "type Stats { count: Int }" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result.endsWith("type Stats { count: Int }\n")).toBe(true);
      });

      test("multiple addType entries all get appended", () => {
        const changes = JSON.stringify([
          { action: "addType", value: "type A { x: Int }" },
          { action: "addType", value: "type B { y: String }" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain("type A { x: Int }");
        expect(result).toContain("type B { y: String }");
      });

      test("addType with directives in the value preserves them", () => {
        const changes = JSON.stringify([
          {
            action: "addType",
            value: 'type Foo @alias(property: "bar") { name: String }',
          },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain('@alias(property: "bar")');
      });

      test("addType appends its value verbatim and does not validate GraphQL syntax", () => {
        const changes = JSON.stringify([
          { action: "addType", value: "type EmptyType { }" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain("type EmptyType { }");
        // Empty-body types are invalid GraphQL — parsing the result should fail.
        expect(() => schemaParser(result)).toThrow(/Syntax Error/);
      });

      test("addType with multi-line type definition preserves all lines", () => {
        const changes = JSON.stringify([
          {
            action: "addType",
            value: "type Stats {\n  count: Int\n  label: String\n}",
          },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain(
          "type Stats {\n  count: Int\n  label: String\n}",
        );
      });
    });

    describe("silently skipped values", () => {
      test.each([
        ["missing value property", { action: "addType" }],
        ["null value", { action: "addType", value: null }],
        ["number value", { action: "addType", value: 123 }],
        ["object value", { action: "addType", value: {} }],
        ["whitespace-only string", { action: "addType", value: "   " }],
        ["empty string", { action: "addType", value: "" }],
      ])("%s is skipped and schema is unchanged", (_desc, change) => {
        const result = changeGraphQLSchema(
          baseSchema,
          JSON.stringify([change]),
        );
        expect(result).toBe(normalize(baseSchema));
      });
    });

    describe("interaction with add/remove", () => {
      test("existing add/remove actions still work alongside addType", () => {
        const changes = JSON.stringify([
          { type: "Airport", action: "add", value: "city: String" },
          { type: "Airport", action: "remove", field: "code" },
          { action: "addType", value: "type Stats { count: Int }" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain("city: String");
        expect(result).not.toMatch(/^code: String$/m);
        expect(result).toContain("type Stats { count: Int }");
      });

      test("add action targeting a type defined via addType in same changes file has no effect", () => {
        const changes = JSON.stringify([
          { action: "addType", value: "type NewType {\n}" },
          { type: "NewType", action: "add", value: "foo: String" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain("type NewType {\n}");
        expect(result).not.toContain("foo: String");
      });

      test("remove action targeting a field inside addType block in same changes file has no effect", () => {
        const changes = JSON.stringify([
          { action: "addType", value: "type NewType {\nfoo: String\n}" },
          { type: "NewType", action: "remove", field: "foo" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        expect(result).toContain("type NewType {\nfoo: String\n}");
      });
    });

    describe("validation and duplicates", () => {
      test("addType with fields referencing existing schema types preserves references", () => {
        const schema =
          "type Airport {\ncode: String\n}\ntype Query {\ngetStats: Stats\n}";
        const changes = JSON.stringify([
          { action: "addType", value: "type Stats { airport: Airport }" },
        ]);
        const result = changeGraphQLSchema(schema, changes);
        expect(result).toContain("type Stats { airport: Airport }");
        expect(() => validateReturnTypes(schemaParser(result))).not.toThrow();
      });

      test("addType with a type name that already exists appends duplicate", () => {
        const changes = JSON.stringify([
          { action: "addType", value: "type Airport { name: String }" },
        ]);
        const result = changeGraphQLSchema(baseSchema, changes);
        const matches = result.match(/type Airport\b/g);
        expect(matches.length).toBe(2);
      });
    });
  });
});

describe("validateReturnTypes", () => {
  const ERR_PREFIX = "Return types not defined in schema: ";
  const ERR_SUFFIX =
    '. Use "action": "addType" in the changes file to add the missing types.';
  const v = (schema) => validateReturnTypes(schemaParser(schema));
  const expectValidation = (schema, expectedError) => {
    if (expectedError === undefined) expect(() => v(schema)).not.toThrow();
    else expect(() => v(schema)).toThrow(expectedError);
  };

  describe("input guards", () => {
    test.each([
      ["null", null],
      ["undefined", undefined],
      ["object without definitions property", {}],
    ])("validateReturnTypes(%s) does not throw", (_desc, input) => {
      expect(() => validateReturnTypes(input)).not.toThrow();
    });
  });

  describe("scalars", () => {
    test.each([
      [
        "built-in scalars (String, Int, Float, Boolean, ID)",
        "type Query {\ngetName: String\ngetCount: Int\ngetScore: Float\ngetFlag: Boolean\ngetId: ID\n}",
        undefined,
      ],
      [
        "AWS scalars (AWSDateTime, AWSJSON)",
        "type Query {\ngetDate: AWSDateTime\ngetData: AWSJSON\n}",
        undefined,
      ],
      [
        "user-defined scalar",
        "scalar MyScalar\ntype Query {\ngetVal: MyScalar\n}",
        undefined,
      ],
    ])("%s", (_desc, schema, expectedError) => {
      expectValidation(schema, expectedError);
    });
  });

  describe("wrappers", () => {
    test.each([
      [
        "[Foo] list wrapper",
        "type Foo {\nx: Int\n}\ntype Query {\ngetFoos: [Foo]\n}",
        undefined,
      ],
      [
        "Foo! non-null wrapper",
        "type Foo {\nx: Int\n}\ntype Query {\ngetFoo: Foo!\n}",
        undefined,
      ],
      [
        "[Foo!] non-null list wrapper",
        "type Foo {\nx: Int\n}\ntype Query {\ngetFoos: [Foo!]\n}",
        undefined,
      ],
      [
        "[Foo!]! full wrapper",
        "type Foo { x: Int }\ntype Query { getFoos: [Foo!]! }",
        undefined,
      ],
      [
        "list of undefined type [Foo]",
        "type Query {\ngetFoos: [Foo]\n}",
        "Foo",
      ],
      [
        "Missing! non-null wrapper",
        "type Query { getFoo: Missing! }",
        /Missing/,
      ],
      [
        "[Missing!] non-null list wrapper",
        "type Query { getFoos: [Missing!] }",
        /Missing/,
      ],
      [
        "[Undefined!]! full wrapper",
        "type Query { getFoos: [Undefined!]! }",
        /Undefined/,
      ],
      [
        "Mutation with [Foo!]! wrapper",
        "type Foo { x: Int }\ntype Mutation { createFoos: [Foo!]! }",
        undefined,
      ],
      [
        "Mutation with [Missing!]! wrapper",
        "type Mutation { createFoos: [Missing!]! }",
        /Missing/,
      ],
    ])("%s", (_desc, schema, expectedError) => {
      expectValidation(schema, expectedError);
    });
  });

  describe("user-defined types", () => {
    test.each([
      [
        "object type",
        "type Airport {\ncode: String\n}\ntype Query {\ngetAirport: Airport\n}",
        undefined,
      ],
      [
        "enum type",
        "enum Status { ACTIVE INACTIVE }\ntype Query {\ngetStatus: Status\n}",
        undefined,
      ],
      [
        "interface type",
        "interface Node {\nid: ID!\n}\ntype Query {\ngetNode: Node\n}",
        undefined,
      ],
      [
        "union type",
        "type Foo { x: Int }\ntype Bar { y: Int }\nunion Result = Foo | Bar\ntype Query { search: Result }",
        undefined,
      ],
      [
        "input type",
        "input MyInput {\nname: String\n}\ntype Query {\ngetInput: MyInput\n}",
        undefined,
      ],
      [
        "schema with no Query or Mutation block",
        "type Airport {\ncode: String\n}",
        undefined,
      ],
      [
        "Query returning an undefined type",
        "type Query {\ngetFoo: Foo\n}",
        `${ERR_PREFIX}Foo${ERR_SUFFIX}`,
      ],
      [
        "Mutation returning an undefined type",
        "type Mutation {\ncreateFoo: Foo\n}",
        `${ERR_PREFIX}Foo${ERR_SUFFIX}`,
      ],
      [
        "Query with directive on type line still catches undefined type",
        "type Query @aws_cognito_user_pools {\ngetFoo: Missing\n}",
        /Missing/,
      ],
      [
        "indented schema still catches undefined type",
        "  type Foo {\n    x: Int\n  }\n  type Query {\n    getFoo: Missing\n  }",
        /Missing/,
      ],
    ])("%s", (_desc, schema, expectedError) => {
      expectValidation(schema, expectedError);
    });
  });

  describe("type extensions", () => {
    test("extend type Query fields are validated", () => {
      const schema =
        "type Query {\nnoop: String\n}\nextend type Query {\ngetFoo: Undefined\n}";
      expect(() => v(schema)).toThrow(/Undefined/);
    });

    test("extend type Foo without a base type declaration is flagged as undefined", () => {
      const schema =
        "extend type Foo {\nx: Int\n}\ntype Query {\ngetFoo: Foo\n}";
      expect(() => v(schema)).toThrow(/Foo/);
    });

    test("extend type Mutation fields are validated", () => {
      const schema =
        "type Mutation {\nnoop: String\n}\nextend type Mutation {\ncreateFoo: Undefined\n}";
      expect(() => v(schema)).toThrow(/Undefined/);
    });
  });

  describe("addType integration", () => {
    test("Query returning a type defined via addType passes", () => {
      const schema = "type Query {\ngetStats: Stats\n}";
      const changes = JSON.stringify([
        { action: "addType", value: "type Stats { count: Int }" },
      ]);
      const result = changeGraphQLSchema(schema, changes);
      expect(() => validateReturnTypes(schemaParser(result))).not.toThrow();
    });

    test("Mutation returning a type defined via addType passes", () => {
      const schema = "type Mutation {\ncreateStats: Stats\n}";
      const changes = JSON.stringify([
        { action: "addType", value: "type Stats { count: Int }" },
      ]);
      const result = changeGraphQLSchema(schema, changes);
      expect(() => validateReturnTypes(schemaParser(result))).not.toThrow();
    });

    test("addType with enum value followed by validateReturnTypes passes", () => {
      const schema = "type Query {\ngetStatus: Status\n}";
      const changes = JSON.stringify([
        { action: "addType", value: "enum Status { ACTIVE INACTIVE }" },
      ]);
      const result = changeGraphQLSchema(schema, changes);
      expect(() => validateReturnTypes(schemaParser(result))).not.toThrow();
    });
  });

  describe("multiple errors", () => {
    test.each([
      [
        "multiple missing types in Query",
        "type Query {\ngetFoo: Foo\ngetBar: Bar\n}",
        `${ERR_PREFIX}Foo, Bar${ERR_SUFFIX}`,
      ],
      [
        "same undefined type referenced by multiple fields appears only once in error",
        "type Query {\ngetFoo: Missing\ngetBar: Missing\n}",
        `${ERR_PREFIX}Missing${ERR_SUFFIX}`,
      ],
    ])("%s", (_desc, schema, expectedError) => {
      expectValidation(schema, expectedError);
    });

    test("errors accumulate across both Query and Mutation", () => {
      const schema = "type Query { a: Foo }\ntype Mutation { b: Bar }";
      expect(() => v(schema)).toThrow(/Foo/);
      expect(() => v(schema)).toThrow(/Bar/);
    });
  });
});

describe("schemaParser assumptions", () => {
  // Guards the input contract of validateReturnTypes: if graphql-js ever
  // starts accepting an empty Query block silently, validateReturnTypes
  // would see an empty definitions list and produce misleading output.
  test("empty Query block throws a parse error (GraphQL requires at least one field)", () => {
    const schema = "type Query {\n}";
    expect(() => schemaParser(schema)).toThrow(/Syntax Error/);
  });

  test("field with no return type throws a parse error", () => {
    const schema = "type Query {\n  getFoo\n}";
    expect(() => schemaParser(schema)).toThrow(/Syntax Error/);
  });
});
