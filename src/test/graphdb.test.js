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

const AIRPORT_SCHEMA = {
    "nodeStructures": [
        {
            "label": "continent",
            "properties": [
            {
                "name": "type",
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
        },
        {
            "label": "country",
            "properties": [
            {
                "name": "type",
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
        },
        {
            "label": "version",
            "properties": [
            {
                "name": "date",
                "type": "String"
            },
            {
                "name": "desc",
                "type": "String"
            },
            {
                "name": "author",
                "type": "String"
            },
            {
                "name": "type",
                "type": "String"
            },
            {
                "name": "code",
                "type": "String"
            }
            ]
        },
        {
            "label": "airport",
            "properties": [
            {
                "name": "type",
                "type": "String"
            },
            {
                "name": "city",
                "type": "String"
            },
            {
                "name": "icao",
                "type": "String"
            },
            {
                "name": "code",
                "type": "String"
            },
            {
                "name": "country",
                "type": "String"
            },
            {
                "name": "lat",
                "type": "Float"
            },
            {
                "name": "longest",
                "type": "Float"
            },
            {
                "name": "runways",
                "type": "Float"
            },
            {
                "name": "desc",
                "type": "String"
            },
            {
                "name": "lon",
                "type": "Float"
            },
            {
                "name": "region",
                "type": "String"
            },
            {
                "name": "elev",
                "type": "Float"
            }
            ]
        }
        ],
        "edgeStructures": [
        {
            "label": "contains",
            "properties": [],
            "directions": [
            {
                "from": "continent",
                "to": "airport",
                "relationship": "ONE-MANY"
            },
            {
                "from": "country",
                "to": "airport",
                "relationship": "ONE-MANY"
            }
            ]
        },
        {
            "label": "route",
            "properties": [
            {
                "name": "dist",
                "type": "Float"
            }
            ],
            "directions": [
            {
                "from": "airport",
                "to": "airport",
                "relationship": "MANY-MANY"
            }
            ]
        }
    ]
};

const AIRPORT_SCHEMA_RESULT = `
    type Continent @alias(property:"continent") {
        _id: ID! @id
        type: String
        code: String
        desc: String
        airportContainssOut(filter: AirportInput, options: Options): [Airport] @relationship(edgeType:"contains", direction:OUT)
        contains:Contains
    }

    input ContinentInput {
        _id: ID @id
        type: String
        code: String
        desc: String
    }

    type Country @alias(property:"country") {
        _id: ID! @id
        type: String
        code: String
        desc: String
        airportContainssOut(filter: AirportInput, options: Options): [Airport] @relationship(edgeType:"contains", direction:OUT)
        contains:Contains
    }

    input CountryInput {
        _id: ID @id
        type: String
        code: String
        desc: String
    }

    type Version @alias(property:"version") {
        _id: ID! @id
        date: String
        desc: String
        author: String
        type: String
        code: String
    }

    input VersionInput {
        _id: ID @id
        date: String
        desc: String
        author: String
        type: String
        code: String
    }

    type Airport @alias(property:"airport") {
        _id: ID! @id
        type: String
        city: String
        icao: String
        code: String
        country: String
        lat: Float
        longest: Float
        runways: Float
        desc: String
        lon: Float
        region: String
        elev: Float
        continentContainsIn: Continent @relationship(edgeType:"contains", direction:IN)
        countryContainsIn: Country @relationship(edgeType:"contains", direction:IN)
        airportRoutesOut(filter: AirportInput, options: Options): [Airport] @relationship(edgeType:"route", direction:OUT)
        airportRoutesIn(filter: AirportInput, options: Options): [Airport] @relationship(edgeType:"route", direction:IN)
        contains:Contains
        route:Route
    }

    input AirportInput {
        _id: ID @id
        type: String
        city: String
        icao: String
        code: String
        country: String
        lat: Float
        longest: Float
        runways: Float
        desc: String
        lon: Float
        region: String
        elev: Float
    }

    type Contains @alias(property:"contains") {
        _id: ID! @id
    }

    type Route @alias(property:"route") {
        _id: ID! @id
        dist: Float
    }

    input RouteInput {
        dist: Float
    }

    input Options {
        limit:Int
    }

    type Query {
        getNodeContinent(filter: ContinentInput): Continent
        getNodeContinents(filter: ContinentInput, options: Options): [Continent]
        getNodeCountry(filter: CountryInput): Country
        getNodeCountrys(filter: CountryInput, options: Options): [Country]
        getNodeVersion(filter: VersionInput): Version
        getNodeVersions(filter: VersionInput, options: Options): [Version]
        getNodeAirport(filter: AirportInput): Airport
        getNodeAirports(filter: AirportInput, options: Options): [Airport]
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

test('should output generic airport schema', function() {
    let input = graphDBInferenceSchema(JSON.stringify(AIRPORT_SCHEMA));
    let result = AIRPORT_SCHEMA_RESULT;
    input = fixWhitespace(input);
    result = fixWhitespace(result);
    expect(input).toBe(result);
});