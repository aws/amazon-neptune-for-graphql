import { graphDBInferenceSchema } from '../graphdb.js';

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
            "label": "abc!$123&efg",
            "properties": [
                {
                    "name": "instance_type",
                    "type": "String"
                },
                {
                    "name": "state",
                    "type": "String"
                },
                {
                    "name": "arn",
                    "type": "String"
                }
            ]
        },
        {
            "label": "abc(123).efg:456",
            "properties": [
                {
                    "name": "name",
                    "type": "String"
                },
                {
                    "name": "ip_range.first_ip",
                    "type": "String"
                },
                {
                    "name": "ip_range.last_ip",
                    "type": "String"
                }
            ]
        },
        {
            "label": "abc=123@[efg]456",
            "properties": [
                {
                    "name": "instance_type",
                    "type": "String"
                },
                {
                    "name": "state",
                    "type": "String"
                },
                {
                    "name": "arn",
                    "type": "String"
                }
            ]
        },
        {
            "label": "abc{123}|efg-456",
            "properties": [
                {
                    "name": "name",
                    "type": "String"
                },
                {
                    "name": "ip_range.first_ip",
                    "type": "String"
                },
                {
                    "name": "ip_range.last_ip",
                    "type": "String"
                }
            ]
        },
    ],
    "edgeStructures": [
        {
            "label": "resource_link",
            "properties": [],
            "directions": [
                {
                    "from": "abc!$123&efg",
                    "to": "abc(123).efg:456",
                    "relationship": "MANY-ONE"
                },
                {
                    "from": "abc!$123&efg",
                    "to": "abc!$123&efg",
                    "relationship": "ONE-ONE"
                }
            ]
        }
    ]
};

const SCHEMA_WITH_SPECIAL_CHARS_RESULT = `
    type Abc_ex__dol_123_amp_efg @alias(property:\"abc!$123&efg\") {
        _id: ID! @id
        instance_type: String
        state: String
        arn: String
        abc_op_123_cp__dot_efg_cn_456Resource_linkOut: Abc_op_123_cp__dot_efg_cn_456 @relationship(edgeType:\"resource_link\", direction:OUT)
        abc_ex__dol_123_amp_efgResource_linkOut: Abc_ex__dol_123_amp_efg @relationship(edgeType:\"resource_link\", direction:OUT)
        abc_ex__dol_123_amp_efgResource_linkIn: Abc_ex__dol_123_amp_efg @relationship(edgeType:\"resource_link\", direction:IN)
        resource_link:Resource_link
    }

    input Abc_ex__dol_123_amp_efgInput {
        _id: ID @id
        instance_type: String
        state: String
        arn: String
    }

    type Abc_op_123_cp__dot_efg_cn_456 @alias(property:\"abc(123).efg:456\") {
        _id: ID! @id
        name: String
        ip_range_dot_first_ip: String @alias(property: \"ip_range.first_ip\")
        ip_range_dot_last_ip: String @alias(property: \"ip_range.last_ip\")
        abc_ex__dol_123_amp_efgResource_linksIn(filter: Abc_ex__dol_123_amp_efgInput, options: Options): [Abc_ex__dol_123_amp_efg] @relationship(edgeType:\"resource_link\", direction:IN)
        resource_link:Resource_link
    }

    input Abc_op_123_cp__dot_efg_cn_456Input {
        _id: ID @id
        name: String
        ip_range_dot_first_ip: String @alias(property: \"ip_range.first_ip\")
        ip_range_dot_last_ip: String @alias(property: \"ip_range.last_ip\")
    }

    type Abc_eq_123_at__os_efg_cs_456 @alias(property:\"abc=123@[efg]456\") {
        _id: ID! @id
        instance_type: String
        state: String
        arn: String
    }

    input Abc_eq_123_at__os_efg_cs_456Input {
        _id: ID @id
        instance_type: String
        state: String
        arn: String
    }

    type Abc_oc_123_cc__vb_efg_hy_456 @alias(property:\"abc{123}|efg-456\") {
        _id: ID! @id
        name: String
        ip_range_dot_first_ip: String @alias(property: \"ip_range.first_ip\")
        ip_range_dot_last_ip: String @alias(property: \"ip_range.last_ip\")
    }

    input Abc_oc_123_cc__vb_efg_hy_456Input {
        _id: ID @id
        name: String
        ip_range_dot_first_ip: String @alias(property: \"ip_range.first_ip\")
        ip_range_dot_last_ip: String @alias(property: \"ip_range.last_ip\")
    }

    type Resource_link @alias(property:\"resource_link\") {
        _id: ID! @id
    }

    input Options {
        limit:Int
    }

    type Query {
        getNodeAbc_ex__dol_123_amp_efg(filter: Abc_ex__dol_123_amp_efgInput): Abc_ex__dol_123_amp_efg
        getNodeAbc_ex__dol_123_amp_efgs(filter: Abc_ex__dol_123_amp_efgInput, options: Options): [Abc_ex__dol_123_amp_efg]
        getNodeAbc_op_123_cp__dot_efg_cn_456(filter: Abc_op_123_cp__dot_efg_cn_456Input): Abc_op_123_cp__dot_efg_cn_456
        getNodeAbc_op_123_cp__dot_efg_cn_456s(filter: Abc_op_123_cp__dot_efg_cn_456Input, options: Options): [Abc_op_123_cp__dot_efg_cn_456]
        getNodeAbc_eq_123_at__os_efg_cs_456(filter: Abc_eq_123_at__os_efg_cs_456Input): Abc_eq_123_at__os_efg_cs_456
        getNodeAbc_eq_123_at__os_efg_cs_456s(filter: Abc_eq_123_at__os_efg_cs_456Input, options: Options): [Abc_eq_123_at__os_efg_cs_456]
        getNodeAbc_oc_123_cc__vb_efg_hy_456(filter: Abc_oc_123_cc__vb_efg_hy_456Input): Abc_oc_123_cc__vb_efg_hy_456
        getNodeAbc_oc_123_cc__vb_efg_hy_456s(filter: Abc_oc_123_cc__vb_efg_hy_456Input, options: Options): [Abc_oc_123_cc__vb_efg_hy_456]
    }

    schema {
        query: Query
    }
`;

test('node with same property and edge label should add underscore prefix', () => {
    expect(graphDBInferenceSchema(JSON.stringify(SCHEMA_WITH_PROPERTY_AND_EDGE_SAME_NAME), false)).toContain('_commonName:Commonname');
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