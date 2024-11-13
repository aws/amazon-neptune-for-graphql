import {graphDBInferenceSchema, replaceCleanseLabel} from '../graphdb.js';

const SCHEMA_WITH_PROPERTY_AND_EDGE_SAME_NAME = {
    "nodeStructures": [
        {
            "label": "continent",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                },
                {
                    "name": "code",
                    "type": "String"
                },
                {
                    "name": "desc",
                    "type": "String"
                },
                {
                    "name": "commonName",
                    "type": "String"
                }
            ]
        },
        {
            "label": "country",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                },
                {
                    "name": "code",
                    "type": "String"
                },
                {
                    "name": "desc",
                    "type": "String"
                }
            ]
        }
    ],
        "edgeStructures": [
        {
            "label": "contains",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                }
            ],
            "directions": [
                {
                    "from": "continent",
                    "to": "country",
                    "relationship": "ONE-MANY"
                }
            ]
        },
        {
            "label": "commonName",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                }
            ],
            "directions": [
                {
                    "from": "continent",
                    "to": "country",
                    "relationship": "ONE-MANY"
                }
            ]
        }
    ]
};

const SCHEMA_WITH_SPECIAL_CHARS = {
    "nodeStructures": [
        {
            "label": "continent",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                },
                {
                    "name": "continent:label",
                    "type": "String"
                }
            ]
        },
        {
            "label": "country",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                },
                {
                    "name": "country:label",
                    "type": "String"
                }
            ]
        }
    ],
        "edgeStructures": [
        {
            "label": "contains",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                },
                {
                    "name": "edge:label",
                    "type": "String"
                }
            ],
            "directions": [
                {
                    "from": "continent",
                    "to": "country",
                    "relationship": "ONE-MANY"
                }
            ]
        },
        {
            "label": "continent:label",
            "properties": [
                {
                    "name": "id",
                    "type": "String"
                }
            ],
            "directions": [
                {
                    "from": "continent",
                    "to": "country",
                    "relationship": "ONE-MANY"
                }
            ]
        }
    ]
};

const SCHEMA_WITH_SPECIAL_CHARS_RESULT = `
type Continent @alias(property:\"continent\") {
        _id: ID! @id
        id: ID
        continent_cn_label: String @alias(property: \"continent:label\")
        countryContainssOut(filter: CountryInput, options: Options): [Country] @relationship(edgeType:\"contains\", direction:OUT)
        countryContinent_cn_labelsOut(filter: CountryInput, options: Options): [Country] @relationship(edgeType:\"continent:label\", direction:OUT)
        contains:Contains
        _continent_cn_label:Continent_cn_label
    }
    
    input ContinentInput {
        _id: ID @id
        id: String
        continent_cn_label: String @alias(property: \"continent:label\")
    }
    
    type Country @alias(property:\"country\") {
        _id: ID! @id
        id: ID
        country_cn_label: String @alias(property: \"country:label\")
        continentContainsIn: Continent @relationship(edgeType:\"contains\", direction:IN)
        continentContinent_cn_labelIn: Continent @relationship(edgeType:\"continent:label\", direction:IN)
        contains:Contains
        continent_cn_label:Continent_cn_label
    }
    
    input CountryInput {
        _id: ID @id
        id: String
        country_cn_label: String @alias(property: \"country:label\")
    }
    
    type Contains @alias(property:\"contains\") {
        _id: ID! @id
        id: ID
        edge_cn_label: String @alias(property: \"edge:label\")
    }
    
    input ContainsInput {
        id: String
        edge_cn_label: String @alias(property: \"edge:label\")
    }
    
    type Continent_cn_label @alias(property:\"continent:label\") {
        _id: ID! @id
        id: ID
    }
    
    input Continent_cn_labelInput @alias(property: \"continent:label\") {
        id: String
    }
    
    input Options {
        limit:Int
    }
    
    type Query {
        getNodeContinent(filter: ContinentInput): Continent
        getNodeContinents(filter: ContinentInput, options: Options): [Continent]
        getNodeCountry(filter: CountryInput): Country
        getNodeCountrys(filter: CountryInput, options: Options): [Country]
    }
    
    schema {
        query: Query
    }
`;

test('node with same property and edge label should add underscore prefix', () => {
    expect(graphDBInferenceSchema(JSON.stringify(SCHEMA_WITH_PROPERTY_AND_EDGE_SAME_NAME), false)).toContain('_commonName:Commonname');
});

describe("replaceCleanseLabel suite", function() {
    test('should replace ! with _ex_', function() {
        expect(replaceCleanseLabel("abc!123")).toBe("abc_ex_123");
    });
    test('should replace $ with _dol_', function() {
        expect(replaceCleanseLabel("abc$123")).toBe("abc_dol_123");
    });
    test('should replace & with _amp_', function() {
        expect(replaceCleanseLabel("abc&123")).toBe("abc_amp_123");
    });
    test('should replace ( with _op_', function() {
        expect(replaceCleanseLabel("abc(123")).toBe("abc_op_123");
    });
    test('should replace ) with _cp_', function() {
        expect(replaceCleanseLabel("abc)123")).toBe("abc_cp_123");
    });
    test('should replace . with _dot_', function() {
        expect(replaceCleanseLabel("abc.123")).toBe("abc_dot_123");
    });
    test('should replace : with _cn_', function() {
        expect(replaceCleanseLabel("abc:123")).toBe("abc_cn_123");
    });
    test('should replace = with _eq_', function() {
        expect(replaceCleanseLabel("abc=123")).toBe("abc_eq_123");
    });
    test('should replace @ with _at_', function() {
        expect(replaceCleanseLabel("abc@123")).toBe("abc_at_123");
    });
    test('should replace [ with _os_', function() {
        expect(replaceCleanseLabel("abc[123")).toBe("abc_os_123");
    });
    test('should replace ] with _cs_', function() {
        expect(replaceCleanseLabel("abc]123")).toBe("abc_cs_123");
    });
    test('should replace { with _oc_', function() {
        expect(replaceCleanseLabel("abc{123")).toBe("abc_oc_123");
    });
    test('should replace | with _vb_', function() {
        expect(replaceCleanseLabel("abc|123")).toBe("abc_vb_123");
    });
    test('should replace } with _cc_', function() {
        expect(replaceCleanseLabel("abc}123")).toBe("abc_cc_123");
    });
    test('should replace - with _hy_', function() {
        expect(replaceCleanseLabel("abc-123")).toBe("abc_hy_123");
    });
    test('should replace all special chars', function() {
        expect(replaceCleanseLabel("abc!$&().:=@[]{|}-123")).toBe("abc_ex__dol__amp__op__cp__dot__cn__eq__at__os__cs__oc__vb__cc__hy_123");
    });
});

function fixWhitespace(str) {
    return str
      .replace(/\s+/g, ' ') // replace whitespace with a space
      .trim();  // trim leading and trailing whitespace
}

test('should properly replace special chars in schema', function() {
    let input = graphDBInferenceSchema(JSON.stringify(SCHEMA_WITH_SPECIAL_CHARS));
    let result = SCHEMA_WITH_SPECIAL_CHARS_RESULT;
    input = fixWhitespace(input);
    result = fixWhitespace(result);
    expect(input).toBe(result);
});