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

const DINING_SCHEMA = {
    "nodeStructures": [
        {
            "label": "city",
            "properties": [
            {
                "name": "name",
                "type": "String"
            }
            ]
        },
        {
            "label": "review",
            "properties": [
            {
                "name": "body",
                "type": "String"
            },
            {
                "name": "created_date",
                "type": "String"
            },
            {
                "name": "rating",
                "type": "Float"
            }
            ]
        },
        {
            "label": "person",
            "properties": [
            {
                "name": "first_name",
                "type": "String"
            },
            {
                "name": "last_name",
                "type": "String"
            },
            {
                "name": "person_id",
                "type": "Float"
            }
            ]
        },
        {
            "label": "restaurant",
            "properties": [
            {
                "name": "restaurant_id",
                "type": "Float"
            },
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "address",
                "type": "String"
            }
            ]
        },
        {
            "label": "cuisine",
            "properties": [
            {
                "name": "name",
                "type": "String"
            }
            ]
        },
        {
            "label": "state",
            "properties": [
            {
                "name": "name",
                "type": "String"
            }
            ]
        }
        ],
        "edgeStructures": [
        {
            "label": "lives",
            "properties": [],
            "directions": [
            {
                "from": "person",
                "to": "city",
                "relationship": "MANY-ONE"
            }
            ]
        },
        {
            "label": "within",
            "properties": [],
            "directions": [
            {
                "from": "city",
                "to": "state",
                "relationship": "ONE-ONE"
            },
            {
                "from": "restaurant",
                "to": "city",
                "relationship": "MANY-ONE"
            }
            ]
        },
        {
            "label": "serves",
            "properties": [],
            "directions": [
            {
                "from": "restaurant",
                "to": "cuisine",
                "relationship": "MANY-ONE"
            }
            ]
        },
        {
            "label": "wrote",
            "properties": [],
            "directions": [
            {
                "from": "person",
                "to": "review",
                "relationship": "ONE-MANY"
            }
            ]
        },
        {
            "label": "about",
            "properties": [],
            "directions": [
            {
                "from": "review",
                "to": "restaurant",
                "relationship": "MANY-ONE"
            }
            ]
        },
        {
            "label": "friends",
            "properties": [],
            "directions": [
            {
                "from": "person",
                "to": "person",
                "relationship": "MANY-MANY"
            }
            ]
        }
    ]
};

const DINING_SCHEMA_RESULT = `
    type City @alias(property:"city") {
        _id: ID! @id
        name: String
        personLivessIn(filter: PersonInput, options: Options): [Person] @relationship(edgeType:"lives", direction:IN)
        restaurantWithinsIn(filter: RestaurantInput, options: Options): [Restaurant] @relationship(edgeType:"within", direction:IN)
        lives:Lives
        within:Within
    }
    
    input CityInput {
        _id: ID @id
        name: String
    }
    
    type Review @alias(property:"review") {
        _id: ID! @id
        body: String
        created_date: String
        rating: Float
        personWroteIn: Person @relationship(edgeType:"wrote", direction:IN)
        restaurantAboutOut: Restaurant @relationship(edgeType:"about", direction:OUT)
        wrote:Wrote
        about:About
    }
    
    input ReviewInput {
        _id: ID @id
        body: String
        created_date: String
        rating: Float
    }
    
    type Person @alias(property:"person") {
        _id: ID! @id
        first_name: String
        last_name: String
        person_id: Float
        cityLivesOut: City @relationship(edgeType:"lives", direction:OUT)
        reviewWrotesOut(filter: ReviewInput, options: Options): [Review] @relationship(edgeType:"wrote", direction:OUT)
        personFriendssOut(filter: PersonInput, options: Options): [Person] @relationship(edgeType:"friends", direction:OUT)
        personFriendssIn(filter: PersonInput, options: Options): [Person] @relationship(edgeType:"friends", direction:IN)
        lives:Lives
        wrote:Wrote
        friends:Friends
    }
    
    input PersonInput {
        _id: ID @id
        first_name: String
        last_name: String
        person_id: Float
    }
    
    type Restaurant @alias(property:"restaurant") {
        _id: ID! @id
        restaurant_id: Float
        name: String
        address: String
        cityWithinOut: City @relationship(edgeType:"within", direction:OUT)
        cuisineServesOut: Cuisine @relationship(edgeType:"serves", direction:OUT)
        reviewAboutsIn(filter: ReviewInput, options: Options): [Review] @relationship(edgeType:"about", direction:IN)
        within:Within
        serves:Serves
        about:About
    }
    
    input RestaurantInput {
        _id: ID @id
        restaurant_id: Float
        name: String
        address: String
    }
    
    type Cuisine @alias(property:"cuisine") {
        _id: ID! @id
        name: String
        restaurantServessIn(filter: RestaurantInput, options: Options): [Restaurant] @relationship(edgeType:"serves", direction:IN)
        serves:Serves
    }
    
    input CuisineInput {
        _id: ID @id
        name: String
    }
    
    type State @alias(property:"state") {
        _id: ID! @id
        name: String
        within:Within
    }
    
    input StateInput {
        _id: ID @id
        name: String
    }
    
    type Lives @alias(property:"lives") {
        _id: ID! @id
    }
    
    type Within @alias(property:"within") {
        _id: ID! @id
    }
    
    type Serves @alias(property:"serves") {
        _id: ID! @id
    }
    
    type Wrote @alias(property:"wrote") {
        _id: ID! @id
    }
    
    type About @alias(property:"about") {
        _id: ID! @id
    }
    
    type Friends @alias(property:"friends") {
        _id: ID! @id
    }
    
    input Options {
        limit:Int
    }
    
    type Query {
        getNodeCity(filter: CityInput): City
        getNodeCitys(filter: CityInput, options: Options): [City]
        getNodeReview(filter: ReviewInput): Review
        getNodeReviews(filter: ReviewInput, options: Options): [Review]
        getNodePerson(filter: PersonInput): Person
        getNodePersons(filter: PersonInput, options: Options): [Person]
        getNodeRestaurant(filter: RestaurantInput): Restaurant
        getNodeRestaurants(filter: RestaurantInput, options: Options): [Restaurant]
        getNodeCuisine(filter: CuisineInput): Cuisine
        getNodeCuisines(filter: CuisineInput, options: Options): [Cuisine]
        getNodeState(filter: StateInput): State
        getNodeStates(filter: StateInput, options: Options): [State]
    }
    
    schema {
        query: Query            
    }
`;

const EPL_SCHEMA = {
    "nodeStructures": [
    {
        "label": "Stadium",
        "properties": [
            {
            "name": "opened",
            "type": "Float"
            },
            {
            "name": "capacity",
            "type": "Float"
            },
            {
            "name": "name",
            "type": "String"
            }
        ]
        },
        {
        "label": "League",
        "properties": [
            {
            "name": "nickname",
            "type": "String"
            },
            {
            "name": "name",
            "type": "String"
            }
        ]
        },
        {
        "label": "Team",
        "properties": [
            {
            "name": "nickname",
            "type": "String"
            },
            {
            "name": "name",
            "type": "String"
            },
            {
            "name": "fullName",
            "type": "String"
            },
            {
            "name": "founded",
            "type": "Float"
            }
        ]
        },
        {
        "label": "City",
        "properties": [
            {
            "name": "name",
            "type": "String"
            }
        ]
        }
    ],
    "edgeStructures": [
        {
        "label": "CITY",
        "properties": [],
        "directions": [
            {
            "from": "Stadium",
            "to": "City",
            "relationship": "MANY-ONE"
            }
        ]
        },
        {
        "label": "CURRENT_LEAGUE",
        "properties": [],
        "directions": [
            {
            "from": "Team",
            "to": "League",
            "relationship": "MANY-ONE"
            }
        ]
        },
        {
        "label": "STADIUM",
        "properties": [],
        "directions": [
            {
            "from": "Team",
            "to": "Stadium",
            "relationship": "ONE-ONE"
            }
        ]
        }
    ]
};

const EPL_SCHEMA_RESULT = `
    type City @alias(property:"city") {
        _id: ID! @id
        name: String
        personLivessIn(filter: PersonInput, options: Options): [Person] @relationship(edgeType:"lives", direction:IN)
        restaurantWithinsIn(filter: RestaurantInput, options: Options): [Restaurant] @relationship(edgeType:"within", direction:IN)
        lives:Lives
        within:Within
    }
    
    input CityInput {
        _id: ID @id
        name: String
    }
    
    type Review @alias(property:"review") {
        _id: ID! @id
        body: String
        created_date: String
        rating: Float
        personWroteIn: Person @relationship(edgeType:"wrote", direction:IN)
        restaurantAboutOut: Restaurant @relationship(edgeType:"about", direction:OUT)
        wrote:Wrote
        about:About
    }
    
    input ReviewInput {
        _id: ID @id
        body: String
        created_date: String
        rating: Float
    }
    
    type Person @alias(property:"person") {
        _id: ID! @id
        first_name: String
        last_name: String
        person_id: Float
        cityLivesOut: City @relationship(edgeType:"lives", direction:OUT)
        reviewWrotesOut(filter: ReviewInput, options: Options): [Review] @relationship(edgeType:"wrote", direction:OUT)
        personFriendssOut(filter: PersonInput, options: Options): [Person] @relationship(edgeType:"friends", direction:OUT)
        personFriendssIn(filter: PersonInput, options: Options): [Person] @relationship(edgeType:"friends", direction:IN)
        lives:Lives
        wrote:Wrote
        friends:Friends
    }
    
    input PersonInput {
        _id: ID @id
        first_name: String
        last_name: String
        person_id: Float
    }
    
    type Restaurant @alias(property:"restaurant") {
        _id: ID! @id
        restaurant_id: Float
        name: String
        address: String
        cityWithinOut: City @relationship(edgeType:"within", direction:OUT)
        cuisineServesOut: Cuisine @relationship(edgeType:"serves", direction:OUT)
        reviewAboutsIn(filter: ReviewInput, options: Options): [Review] @relationship(edgeType:"about", direction:IN)
        within:Within
        serves:Serves
        about:About
    }
    
    input RestaurantInput {
        _id: ID @id
        restaurant_id: Float
        name: String
        address: String
    }
    
    type Cuisine @alias(property:"cuisine") {
        _id: ID! @id
        name: String
        restaurantServessIn(filter: RestaurantInput, options: Options): [Restaurant] @relationship(edgeType:"serves", direction:IN)
        serves:Serves
    }
    
    input CuisineInput {
        _id: ID @id
        name: String
    }
    
    type State @alias(property:"state") {
        _id: ID! @id
        name: String
        within:Within
    }
    
    input StateInput {
        _id: ID @id
        name: String
    }
    
    type Lives @alias(property:"lives") {
        _id: ID! @id
    }
    
    type Within @alias(property:"within") {
        _id: ID! @id
    }
    
    type Serves @alias(property:"serves") {
        _id: ID! @id
    }
    
    type Wrote @alias(property:"wrote") {
        _id: ID! @id
    }
    
    type About @alias(property:"about") {
        _id: ID! @id
    }
    
    type Friends @alias(property:"friends") {
        _id: ID! @id
    }
    
    input Options {
        limit:Int
    }
    
    type Query {
        getNodeCity(filter: CityInput): City
        getNodeCitys(filter: CityInput, options: Options): [City]
        getNodeReview(filter: ReviewInput): Review
        getNodeReviews(filter: ReviewInput, options: Options): [Review]
        getNodePerson(filter: PersonInput): Person
        getNodePersons(filter: PersonInput, options: Options): [Person]
        getNodeRestaurant(filter: RestaurantInput): Restaurant
        getNodeRestaurants(filter: RestaurantInput, options: Options): [Restaurant]
        getNodeCuisine(filter: CuisineInput): Cuisine
        getNodeCuisines(filter: CuisineInput, options: Options): [Cuisine]
        getNodeState(filter: StateInput): State
        getNodeStates(filter: StateInput, options: Options): [State]
    }
    
    schema {
        query: Query            
    }
`;

const FRAUD_SCHEMA = {
    "nodeStructures": [
        {
            "label": "DateOfBirth",
            "properties": [
            {
                "name": "value",
                "type": "String"
            }
            ]
        },
        {
            "label": "Account",
            "properties": [
            {
                "name": "first_name",
                "type": "String"
            },
            {
                "name": "account_number",
                "type": "String"
            },
            {
                "name": "last_name",
                "type": "String"
            }
            ]
        },
        {
            "label": "Merchant",
            "properties": [
            {
                "name": "name",
                "type": "String"
            }
            ]
        },
        {
            "label": "Transaction",
            "properties": [
            {
                "name": "amount",
                "type": "Float"
            },
            {
                "name": "created",
                "type": "String"
            }
            ]
        },
        {
            "label": "Address",
            "properties": [
            {
                "name": "value",
                "type": "String"
            }
            ]
        },
        {
            "label": "PhoneNumber",
            "properties": [
            {
                "name": "value",
                "type": "String"
            }
            ]
        },
        {
            "label": "IpAddress",
            "properties": [
            {
                "name": "value",
                "type": "String"
            }
            ]
        },
        {
            "label": "EmailAddress",
            "properties": [
            {
                "name": "value",
                "type": "String"
            }
            ]
        }
        ],
        "edgeStructures": [
        {
            "label": "FEATURE_OF_ACCOUNT",
            "properties": [],
            "directions": [
            {
                "from": "EmailAddress",
                "to": "Account",
                "relationship": "MANY-MANY"
            },
            {
                "from": "IpAddress",
                "to": "Account",
                "relationship": "ONE-MANY"
            },
            {
                "from": "Address",
                "to": "Account",
                "relationship": "ONE-MANY"
            },
            {
                "from": "DateOfBirth",
                "to": "Account",
                "relationship": "ONE-MANY"
            },
            {
                "from": "PhoneNumber",
                "to": "Account",
                "relationship": "MANY-MANY"
            }
            ]
        },
        {
            "label": "ACCOUNT",
            "properties": [],
            "directions": [
            {
                "from": "Transaction",
                "to": "Account",
                "relationship": "MANY-ONE"
            }
            ]
        },
        {
            "label": "FEATURE_OF_TRANSACTION",
            "properties": [],
            "directions": [
            {
                "from": "IpAddress",
                "to": "Transaction",
                "relationship": "ONE-MANY"
            },
            {
                "from": "PhoneNumber",
                "to": "Transaction",
                "relationship": "ONE-MANY"
            }
            ]
        },
        {
            "label": "MERCHANT",
            "properties": [],
            "directions": [
            {
                "from": "Transaction",
                "to": "Merchant",
                "relationship": "MANY-ONE"
            }
            ]
        }
    ]
};

const FRAUD_SCHEMA_RESULT = `
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

const KNOWLEDGE_SCHEMA = {
    "nodeStructures": [
        {
            "label": "date",
            "properties": [
            {
                "name": "type",
                "type": "String"
            },
            {
                "name": "text",
                "type": "String"
            }
            ]
        },
        {
            "label": "other",
            "properties": [
            {
                "name": "type",
                "type": "String"
            },
            {
                "name": "text",
                "type": "String"
            }
            ]
        },
        {
            "label": "post",
            "properties": [
            {
                "name": "title",
                "type": "String"
            },
            {
                "name": "post_date",
                "type": "String"
            }
            ]
        },
        {
            "label": "author",
            "properties": [
            {
                "name": "name",
                "type": "String"
            }
            ]
        },
        {
            "label": "organization",
            "properties": [
            {
                "name": "type",
                "type": "String"
            },
            {
                "name": "text",
                "type": "String"
            }
            ]
        },
        {
            "label": "location",
            "properties": [
            {
                "name": "type",
                "type": "String"
            },
            {
                "name": "text",
                "type": "String"
            }
            ]
        },
        {
            "label": "tag",
            "properties": [
            {
                "name": "tag",
                "type": "String"
            }
            ]
        },
        {
            "label": "title",
            "properties": [
            {
                "name": "type",
                "type": "String"
            },
            {
                "name": "text",
                "type": "String"
            }
            ]
        },
        {
            "label": "commercial_item",
            "properties": [
            {
                "name": "type",
                "type": "String"
            },
            {
                "name": "text",
                "type": "String"
            }
            ]
        }
        ],
        "edgeStructures": [
        {
            "label": "tagged",
            "properties": [],
            "directions": [
            {
                "from": "post",
                "to": "tag",
                "relationship": "MANY-MANY"
            }
            ]
        },
        {
            "label": "found_in",
            "properties": [
            {
                "name": "score",
                "type": "Float"
            }
            ],
            "directions": [
            {
                "from": "post",
                "to": "organization",
                "relationship": "MANY-MANY"
            },
            {
                "from": "post",
                "to": "title",
                "relationship": "MANY-MANY"
            },
            {
                "from": "post",
                "to": "location",
                "relationship": "MANY-MANY"
            },
            {
                "from": "post",
                "to": "date",
                "relationship": "MANY-MANY"
            },
            {
                "from": "post",
                "to": "commercial_item",
                "relationship": "MANY-MANY"
            },
            {
                "from": "post",
                "to": "other",
                "relationship": "ONE-MANY"
            }
            ]
        },
        {
            "label": "written_by",
            "properties": [],
            "directions": [
            {
                "from": "post",
                "to": "author",
                "relationship": "MANY-MANY"
            }
            ]
        }
    ]
};

const KNOWLEDGE_SCHEMA_RESULT = `
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

const SECURITY_SCHEMA = {
    "nodeStructures": [
        {
            "label": "image",
            "properties": [
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            }
            ]
        },
        {
            "label": "guardduty:detector",
            "properties": [
            {
                "name": "created_at",
                "type": "String"
            },
            {
                "name": "updated_at",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "status",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "service_role",
                "type": "String"
            },
            {
                "name": "finding_publishing_frequency",
                "type": "String"
            }
            ]
        },
        {
            "label": "ec2:vpc",
            "properties": [
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "state",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "is_default",
                "type": "String"
            },
            {
                "name": "cidr_block",
                "type": "String"
            }
            ]
        },
        {
            "label": "iam:role",
            "properties": [
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "principal.aws",
                "type": "String"
            },
            {
                "name": "statement.effect",
                "type": "String"
            },
            {
                "name": "statement.action",
                "type": "String"
            },
            {
                "name": "max_session_duration",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "nassume_role_policy_document_text",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "assume_role_policy_document.version",
                "type": "String"
            }
            ]
        },
        {
            "label": "ec2:network-interface",
            "properties": [
            {
                "name": "public_ip",
                "type": "String"
            },
            {
                "name": "public_dns_name",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "private_ip_address",
                "type": "String"
            },
            {
                "name": "mac_address",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "private_dns_name",
                "type": "String"
            },
            {
                "name": "status",
                "type": "String"
            },
            {
                "name": "interface_type",
                "type": "String"
            },
            {
                "name": "description",
                "type": "String"
            }
            ]
        },
        {
            "label": "rds:db",
            "properties": [
            {
                "name": "storage_type",
                "type": "String"
            },
            {
                "name": "performance_insights_enabled",
                "type": "String"
            },
            {
                "name": "dbi_resource_id",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "db_instance_identifier",
                "type": "String"
            },
            {
                "name": "backup_retention_period",
                "type": "String"
            },
            {
                "name": "publicly_accessible",
                "type": "String"
            },
            {
                "name": "multi_az",
                "type": "String"
            },
            {
                "name": "availability_zone",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "storage_encrypted",
                "type": "String"
            },
            {
                "name": "iam_database_authentication_enabled",
                "type": "String"
            },
            {
                "name": "db_instance_class",
                "type": "String"
            },
            {
                "name": "endpoint_hosted_zone",
                "type": "String"
            },
            {
                "name": "deletion_protection",
                "type": "String"
            },
            {
                "name": "endpoint_address",
                "type": "String"
            },
            {
                "name": "db_instance_status",
                "type": "String"
            },
            {
                "name": "endpoint_port",
                "type": "String"
            },
            {
                "name": "instance_create_time",
                "type": "String"
            },
            {
                "name": "engine",
                "type": "String"
            }
            ]
        },
        {
            "label": "ec2:instance",
            "properties": [
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "public_ip_address",
                "type": "String"
            },
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
            },
            {
                "name": "private_ip_address",
                "type": "String"
            },
            {
                "name": "launch_time",
                "type": "String"
            }
            ]
        },
        {
            "label": "iam:user",
            "properties": [
            {
                "name": "password_last_used",
                "type": "String"
            },
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "login_profile.password_reset_required",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "access_key.access_key_id",
                "type": "String"
            },
            {
                "name": "login_profile.create_date",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "create_date",
                "type": "String"
            },
            {
                "name": "access_key.last_used_date",
                "type": "String"
            },
            {
                "name": "access_key.status",
                "type": "String"
            },
            {
                "name": "user_id",
                "type": "String"
            },
            {
                "name": "access_key.create_date",
                "type": "String"
            }
            ]
        },
        {
            "label": "ec2:security-group",
            "properties": [
            {
                "name": "egress_rule.ip_protocol",
                "type": "String"
            },
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "ip_range.first_ip",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "egress_rule.to_port",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "ip_range.last_ip",
                "type": "String"
            },
            {
                "name": "egress_rule.from_port",
                "type": "String"
            },
            {
                "name": "ip_range.cidr_ip",
                "type": "String"
            },
            {
                "name": "ingress_rule.from_port",
                "type": "String"
            },
            {
                "name": "ingress_rule.ip_protocol",
                "type": "String"
            },
            {
                "name": "ingress_rule.to_port",
                "type": "String"
            },
            {
                "name": "user_id_group_pairs.account_id",
                "type": "String"
            }
            ]
        },
        {
            "label": "ec2:internet-gateway",
            "properties": [
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "owner_id",
                "type": "String"
            },
            {
                "name": "attachment.state",
                "type": "String"
            }
            ]
        },
        {
            "label": "events:rule",
            "properties": [
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "target.arn",
                "type": "String"
            },
            {
                "name": "target.name",
                "type": "String"
            },
            {
                "name": "event_pattern",
                "type": "String"
            },
            {
                "name": "state",
                "type": "String"
            }
            ]
        },
        {
            "label": "ec2:subnet",
            "properties": [
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "first_ip",
                "type": "String"
            },
            {
                "name": "state",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "last_ip",
                "type": "String"
            },
            {
                "name": "cidr_block",
                "type": "String"
            }
            ]
        },
        {
            "label": "iam:instance-profile",
            "properties": [
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            }
            ]
        },
        {
            "label": "iam:policy",
            "properties": [
            {
                "name": "default_version_policy_document_text",
                "type": "String"
            },
            {
                "name": "default_version_id",
                "type": "String"
            },
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "policy_id",
                "type": "String"
            }
            ]
        },
        {
            "label": "s3:bucket",
            "properties": [
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "server_side_default_encryption_rule.algorithm",
                "type": "String"
            },
            {
                "name": "creation_date",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            }
            ]
        },
        {
            "label": "tag",
            "properties": [
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "Name",
                "type": "String"
            }
            ]
        },
        {
            "label": "kms:key",
            "properties": [
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "key_id",
                "type": "String"
            }
            ]
        },
        {
            "label": "ec2:volume",
            "properties": [
            {
                "name": "encrypted",
                "type": "String"
            },
            {
                "name": "availability_zone",
                "type": "String"
            },
            {
                "name": "state",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "attachment.attach_time",
                "type": "String"
            },
            {
                "name": "volume_type",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "attachment.state",
                "type": "String"
            },
            {
                "name": "size",
                "type": "String"
            },
            {
                "name": "create_time",
                "type": "String"
            },
            {
                "name": "attachment.delete_on_termination",
                "type": "String"
            }
            ]
        },
        {
            "label": "ec2:route-table",
            "properties": [
            {
                "name": "route.destination_cidr_block",
                "type": "String"
            },
            {
                "name": "arn",
                "type": "String"
            },
            {
                "name": "route_table_id",
                "type": "String"
            },
            {
                "name": "association.route_table_id",
                "type": "String"
            },
            {
                "name": "route.origin",
                "type": "String"
            },
            {
                "name": "route.gateway_id",
                "type": "String"
            },
            {
                "name": "scan_id",
                "type": "String"
            },
            {
                "name": "owner_id",
                "type": "String"
            },
            {
                "name": "association.main",
                "type": "String"
            },
            {
                "name": "route.state",
                "type": "String"
            },
            {
                "name": "association.route_table_association_id",
                "type": "String"
            }
            ]
        }
        ],
        "edgeStructures": [
        {
            "label": "resource_link",
            "properties": [],
            "directions": [
            {
                "from": "ec2:instance",
                "to": "ec2:security-group",
                "relationship": "MANY-ONE"
            },
            {
                "from": "ec2:security-group",
                "to": "ec2:security-group",
                "relationship": "ONE-ONE"
            },
            {
                "from": "ec2:instance",
                "to": "ec2:subnet",
                "relationship": "MANY-ONE"
            },
            {
                "from": "ec2:network-interface",
                "to": "ec2:vpc",
                "relationship": "MANY-ONE"
            },
            {
                "from": "ec2:subnet",
                "to": "ec2:vpc",
                "relationship": "MANY-ONE"
            },
            {
                "from": "ec2:internet-gateway",
                "to": "ec2:vpc",
                "relationship": "ONE-ONE"
            },
            {
                "from": "ec2:instance",
                "to": "ec2:vpc",
                "relationship": "MANY-ONE"
            },
            {
                "from": "ec2:route-table",
                "to": "ec2:vpc",
                "relationship": "ONE-ONE"
            },
            {
                "from": "iam:role",
                "to": "iam:policy",
                "relationship": "MANY-MANY"
            },
            {
                "from": "ec2:volume",
                "to": "ec2:instance",
                "relationship": "ONE-ONE"
            },
            {
                "from": "iam:instance-profile",
                "to": "iam:role",
                "relationship": "ONE-ONE"
            }
            ]
        },
        {
            "label": "tagged",
            "properties": [],
            "directions": [
            {
                "from": "ec2:security-group",
                "to": "tag",
                "relationship": "ONE-MANY"
            },
            {
                "from": "ec2:instance",
                "to": "tag",
                "relationship": "ONE-ONE"
            }
            ]
        },
        {
            "label": "transient_resource_link",
            "properties": [],
            "directions": [
            {
                "from": "rds:db",
                "to": "ec2:security-group",
                "relationship": "ONE-ONE"
            },
            {
                "from": "rds:db",
                "to": "ec2:vpc",
                "relationship": "ONE-ONE"
            },
            {
                "from": "rds:db",
                "to": "kms:key",
                "relationship": "ONE-ONE"
            },
            {
                "from": "ec2:instance",
                "to": "iam:instance-profile",
                "relationship": "ONE-ONE"
            },
            {
                "from": "ec2:instance",
                "to": "image",
                "relationship": "MANY-ONE"
            }
            ]
        }
    ]
};

const SECURITY_SCHEMA_RESULT = `
    type Image @alias(property:"image") {
        _id: ID! @id
        scan_id: String
        arn: String
        ec2_cn_instanceTransient_resource_linksIn(filter: Ec2_cn_instanceInput, options: Options): [Ec2_cn_instance] @relationship(edgeType:"transient_resource_link", direction:IN)
        transient_resource_link:Transient_resource_link
    }
    
    input ImageInput {
        _id: ID @id
        scan_id: String
        arn: String
    }
    
    type Guardduty_cn_detector @alias(property:"guardduty:detector") {
        _id: ID! @id
        created_at: String
        updated_at: String
        scan_id: String
        status: String
        arn: String
        service_role: String
        finding_publishing_frequency: String
    }
    
    input Guardduty_cn_detectorInput {
        _id: ID @id
        created_at: String
        updated_at: String
        scan_id: String
        status: String
        arn: String
        service_role: String
        finding_publishing_frequency: String
    }
    
    type Ec2_cn_vpc @alias(property:"ec2:vpc") {
        _id: ID! @id
        scan_id: String
        state: String
        arn: String
        is_default: String
        cidr_block: String
        ec2_cn_network_hy_interfaceResource_linksIn(filter: Ec2_cn_network_hy_interfaceInput, options: Options): [Ec2_cn_network_hy_interface] @relationship(edgeType:"resource_link", direction:IN)
        ec2_cn_subnetResource_linksIn(filter: Ec2_cn_subnetInput, options: Options): [Ec2_cn_subnet] @relationship(edgeType:"resource_link", direction:IN)
        ec2_cn_instanceResource_linksIn(filter: Ec2_cn_instanceInput, options: Options): [Ec2_cn_instance] @relationship(edgeType:"resource_link", direction:IN)
        resource_link:Resource_link
        transient_resource_link:Transient_resource_link
    }
    
    input Ec2_cn_vpcInput {
        _id: ID @id
        scan_id: String
        state: String
        arn: String
        is_default: String
        cidr_block: String
    }
    
    type Iam_cn_role @alias(property:"iam:role") {
        _id: ID! @id
        name: String
        principal_dot_aws: String @alias(property: "principal.aws")
        statement_dot_effect: String @alias(property: "statement.effect")
        statement_dot_action: String @alias(property: "statement.action")
        max_session_duration: String
        arn: String
        nassume_role_policy_document_text: String
        scan_id: String
        assume_role_policy_document_dot_version: String @alias(property: "assume_role_policy_document.version")
        iam_cn_policyResource_linksOut(filter: Iam_cn_policyInput, options: Options): [Iam_cn_policy] @relationship(edgeType:"resource_link", direction:OUT)
        resource_link:Resource_link
    }
    
    input Iam_cn_roleInput {
        _id: ID @id
        name: String
        principal_dot_aws: String @alias(property: "principal.aws")
        statement_dot_effect: String @alias(property: "statement.effect")
        statement_dot_action: String @alias(property: "statement.action")
        max_session_duration: String
        arn: String
        nassume_role_policy_document_text: String
        scan_id: String
        assume_role_policy_document_dot_version: String @alias(property: "assume_role_policy_document.version")
    }
    
    type Ec2_cn_network_hy_interface @alias(property:"ec2:network-interface") {
        _id: ID! @id
        public_ip: String
        public_dns_name: String
        arn: String
        private_ip_address: String
        mac_address: String
        scan_id: String
        private_dns_name: String
        status: String
        interface_type: String
        description: String
        ec2_cn_vpcResource_linkOut: Ec2_cn_vpc @relationship(edgeType:"resource_link", direction:OUT)
        resource_link:Resource_link
    }
    
    input Ec2_cn_network_hy_interfaceInput {
        _id: ID @id
        public_ip: String
        public_dns_name: String
        arn: String
        private_ip_address: String
        mac_address: String
        scan_id: String
        private_dns_name: String
        status: String
        interface_type: String
        description: String
    }
    
    type Rds_cn_db @alias(property:"rds:db") {
        _id: ID! @id
        storage_type: String
        performance_insights_enabled: String
        dbi_resource_id: String
        scan_id: String
        db_instance_identifier: String
        backup_retention_period: String
        publicly_accessible: String
        multi_az: String
        availability_zone: String
        arn: String
        storage_encrypted: String
        iam_database_authentication_enabled: String
        db_instance_class: String
        endpoint_hosted_zone: String
        deletion_protection: String
        endpoint_address: String
        db_instance_status: String
        endpoint_port: String
        instance_create_time: String
        engine: String
        transient_resource_link:Transient_resource_link
    }
    
    input Rds_cn_dbInput {
        _id: ID @id
        storage_type: String
        performance_insights_enabled: String
        dbi_resource_id: String
        scan_id: String
        db_instance_identifier: String
        backup_retention_period: String
        publicly_accessible: String
        multi_az: String
        availability_zone: String
        arn: String
        storage_encrypted: String
        iam_database_authentication_enabled: String
        db_instance_class: String
        endpoint_hosted_zone: String
        deletion_protection: String
        endpoint_address: String
        db_instance_status: String
        endpoint_port: String
        instance_create_time: String
        engine: String
    }
    
    type Ec2_cn_instance @alias(property:"ec2:instance") {
        _id: ID! @id
        scan_id: String
        public_ip_address: String
        instance_type: String
        state: String
        arn: String
        private_ip_address: String
        launch_time: String
        ec2_cn_security_hy_groupResource_linkOut: Ec2_cn_security_hy_group @relationship(edgeType:"resource_link", direction:OUT)
        ec2_cn_subnetResource_linkOut: Ec2_cn_subnet @relationship(edgeType:"resource_link", direction:OUT)
        ec2_cn_vpcResource_linkOut: Ec2_cn_vpc @relationship(edgeType:"resource_link", direction:OUT)
        imageTransient_resource_linkOut: Image @relationship(edgeType:"transient_resource_link", direction:OUT)
        resource_link:Resource_link
        tagged:Tagged
        transient_resource_link:Transient_resource_link
    }
    
    input Ec2_cn_instanceInput {
        _id: ID @id
        scan_id: String
        public_ip_address: String
        instance_type: String
        state: String
        arn: String
        private_ip_address: String
        launch_time: String
    }
    
    type Iam_cn_user @alias(property:"iam:user") {
        _id: ID! @id
        password_last_used: String
        name: String
        login_profile_dot_password_reset_required: String @alias(property: "login_profile.password_reset_required")
        arn: String
        access_key_dot_access_key_id: String @alias(property: "access_key.access_key_id")
        login_profile_dot_create_date: String @alias(property: "login_profile.create_date")
        scan_id: String
        create_date: String
        access_key_dot_last_used_date: String @alias(property: "access_key.last_used_date")
        access_key_dot_status: String @alias(property: "access_key.status")
        user_id: String
        access_key_dot_create_date: String @alias(property: "access_key.create_date")
    }
    
    input Iam_cn_userInput {
        _id: ID @id
        password_last_used: String
        name: String
        login_profile_dot_password_reset_required: String @alias(property: "login_profile.password_reset_required")
        arn: String
        access_key_dot_access_key_id: String @alias(property: "access_key.access_key_id")
        login_profile_dot_create_date: String @alias(property: "login_profile.create_date")
        scan_id: String
        create_date: String
        access_key_dot_last_used_date: String @alias(property: "access_key.last_used_date")
        access_key_dot_status: String @alias(property: "access_key.status")
        user_id: String
        access_key_dot_create_date: String @alias(property: "access_key.create_date")
    }
    
    type Ec2_cn_security_hy_group @alias(property:"ec2:security-group") {
        _id: ID! @id
        egress_rule_dot_ip_protocol: String @alias(property: "egress_rule.ip_protocol")
        name: String
        ip_range_dot_first_ip: String @alias(property: "ip_range.first_ip")
        arn: String
        egress_rule_dot_to_port: String @alias(property: "egress_rule.to_port")
        scan_id: String
        ip_range_dot_last_ip: String @alias(property: "ip_range.last_ip")
        egress_rule_dot_from_port: String @alias(property: "egress_rule.from_port")
        ip_range_dot_cidr_ip: String @alias(property: "ip_range.cidr_ip")
        ingress_rule_dot_from_port: String @alias(property: "ingress_rule.from_port")
        ingress_rule_dot_ip_protocol: String @alias(property: "ingress_rule.ip_protocol")
        ingress_rule_dot_to_port: String @alias(property: "ingress_rule.to_port")
        user_id_group_pairs_dot_account_id: String @alias(property: "user_id_group_pairs.account_id")
        ec2_cn_instanceResource_linksIn(filter: Ec2_cn_instanceInput, options: Options): [Ec2_cn_instance] @relationship(edgeType:"resource_link", direction:IN)
        ec2_cn_security_hy_groupResource_linkOut: Ec2_cn_security_hy_group @relationship(edgeType:"resource_link", direction:OUT)
        ec2_cn_security_hy_groupResource_linkIn: Ec2_cn_security_hy_group @relationship(edgeType:"resource_link", direction:IN)
        tagTaggedsOut(filter: TagInput, options: Options): [Tag] @relationship(edgeType:"tagged", direction:OUT)
        resource_link:Resource_link
        tagged:Tagged
        transient_resource_link:Transient_resource_link
    }
    
    input Ec2_cn_security_hy_groupInput {
        _id: ID @id
        egress_rule_dot_ip_protocol: String @alias(property: "egress_rule.ip_protocol")
        name: String
        ip_range_dot_first_ip: String @alias(property: "ip_range.first_ip")
        arn: String
        egress_rule_dot_to_port: String @alias(property: "egress_rule.to_port")
        scan_id: String
        ip_range_dot_last_ip: String @alias(property: "ip_range.last_ip")
        egress_rule_dot_from_port: String @alias(property: "egress_rule.from_port")
        ip_range_dot_cidr_ip: String @alias(property: "ip_range.cidr_ip")
        ingress_rule_dot_from_port: String @alias(property: "ingress_rule.from_port")
        ingress_rule_dot_ip_protocol: String @alias(property: "ingress_rule.ip_protocol")
        ingress_rule_dot_to_port: String @alias(property: "ingress_rule.to_port")
        user_id_group_pairs_dot_account_id: String @alias(property: "user_id_group_pairs.account_id")
    }
    
    type Ec2_cn_internet_hy_gateway @alias(property:"ec2:internet-gateway") {
        _id: ID! @id
        arn: String
        scan_id: String
        owner_id: String
        attachment_dot_state: String @alias(property: "attachment.state")
        resource_link:Resource_link
    }
    
    input Ec2_cn_internet_hy_gatewayInput {
        _id: ID @id
        arn: String
        scan_id: String
        owner_id: String
        attachment_dot_state: String @alias(property: "attachment.state")
    }
    
    type Events_cn_rule @alias(property:"events:rule") {
        _id: ID! @id
        arn: String
        name: String
        scan_id: String
        target_dot_arn: String @alias(property: "target.arn")
        target_dot_name: String @alias(property: "target.name")
        event_pattern: String
        state: String
    }
    
    input Events_cn_ruleInput {
        _id: ID @id
        arn: String
        name: String
        scan_id: String
        target_dot_arn: String @alias(property: "target.arn")
        target_dot_name: String @alias(property: "target.name")
        event_pattern: String
        state: String
    }
    
    type Ec2_cn_subnet @alias(property:"ec2:subnet") {
        _id: ID! @id
        scan_id: String
        first_ip: String
        state: String
        arn: String
        last_ip: String
        cidr_block: String
        ec2_cn_instanceResource_linksIn(filter: Ec2_cn_instanceInput, options: Options): [Ec2_cn_instance] @relationship(edgeType:"resource_link", direction:IN)
        ec2_cn_vpcResource_linkOut: Ec2_cn_vpc @relationship(edgeType:"resource_link", direction:OUT)
        resource_link:Resource_link
    }
    
    input Ec2_cn_subnetInput {
        _id: ID @id
        scan_id: String
        first_ip: String
        state: String
        arn: String
        last_ip: String
        cidr_block: String
    }
    
    type Iam_cn_instance_hy_profile @alias(property:"iam:instance-profile") {
        _id: ID! @id
        arn: String
        name: String
        scan_id: String
        resource_link:Resource_link
        transient_resource_link:Transient_resource_link
    }
    
    input Iam_cn_instance_hy_profileInput {
        _id: ID @id
        arn: String
        name: String
        scan_id: String
    }
    
    type Iam_cn_policy @alias(property:"iam:policy") {
        _id: ID! @id
        default_version_policy_document_text: String
        default_version_id: String
        name: String
        scan_id: String
        arn: String
        policy_id: String
        iam_cn_roleResource_linksIn(filter: Iam_cn_roleInput, options: Options): [Iam_cn_role] @relationship(edgeType:"resource_link", direction:IN)
        resource_link:Resource_link
    }
    
    input Iam_cn_policyInput {
        _id: ID @id
        default_version_policy_document_text: String
        default_version_id: String
        name: String
        scan_id: String
        arn: String
        policy_id: String
    }
    
    type S3_cn_bucket @alias(property:"s3:bucket") {
        _id: ID! @id
        name: String
        scan_id: String
        server_side_default_encryption_rule_dot_algorithm: String @alias(property: "server_side_default_encryption_rule.algorithm")
        creation_date: String
        arn: String
    }
    
    input S3_cn_bucketInput {
        _id: ID @id
        name: String
        scan_id: String
        server_side_default_encryption_rule_dot_algorithm: String @alias(property: "server_side_default_encryption_rule.algorithm")
        creation_date: String
        arn: String
    }
    
    type Tag @alias(property:"tag") {
        _id: ID! @id
        scan_id: String
        Name: String
        ec2_cn_security_hy_groupTaggedIn: Ec2_cn_security_hy_group @relationship(edgeType:"tagged", direction:IN)
        tagged:Tagged
    }
    
    input TagInput {
        _id: ID @id
        scan_id: String
        Name: String
    }
    
    type Kms_cn_key @alias(property:"kms:key") {
        _id: ID! @id
        arn: String
        scan_id: String
        key_id: String
        transient_resource_link:Transient_resource_link
    }
    
    input Kms_cn_keyInput {
        _id: ID @id
        arn: String
        scan_id: String
        key_id: String
    }
    
    type Ec2_cn_volume @alias(property:"ec2:volume") {
        _id: ID! @id
        encrypted: String
        availability_zone: String
        state: String
        arn: String
        attachment_dot_attach_time: String @alias(property: "attachment.attach_time")
        volume_type: String
        scan_id: String
        attachment_dot_state: String @alias(property: "attachment.state")
        size: String
        create_time: String
        attachment_dot_delete_on_termination: String @alias(property: "attachment.delete_on_termination")
        resource_link:Resource_link
    }
    
    input Ec2_cn_volumeInput {
        _id: ID @id
        encrypted: String
        availability_zone: String
        state: String
        arn: String
        attachment_dot_attach_time: String @alias(property: "attachment.attach_time")
        volume_type: String
        scan_id: String
        attachment_dot_state: String @alias(property: "attachment.state")
        size: String
        create_time: String
        attachment_dot_delete_on_termination: String @alias(property: "attachment.delete_on_termination")
    }
    
    type Ec2_cn_route_hy_table @alias(property:"ec2:route-table") {
        _id: ID! @id
        route_dot_destination_cidr_block: String @alias(property: "route.destination_cidr_block")
        arn: String
        route_table_id: String
        association_dot_route_table_id: String @alias(property: "association.route_table_id")
        route_dot_origin: String @alias(property: "route.origin")
        route_dot_gateway_id: String @alias(property: "route.gateway_id")
        scan_id: String
        owner_id: String
        association_dot_main: String @alias(property: "association.main")
        route_dot_state: String @alias(property: "route.state")
        association_dot_route_table_association_id: String @alias(property: "association.route_table_association_id")
        resource_link:Resource_link
    }
    
    input Ec2_cn_route_hy_tableInput {
        _id: ID @id
        route_dot_destination_cidr_block: String @alias(property: "route.destination_cidr_block")
        arn: String
        route_table_id: String
        association_dot_route_table_id: String @alias(property: "association.route_table_id")
        route_dot_origin: String @alias(property: "route.origin")
        route_dot_gateway_id: String @alias(property: "route.gateway_id")
        scan_id: String
        owner_id: String
        association_dot_main: String @alias(property: "association.main")
        route_dot_state: String @alias(property: "route.state")
        association_dot_route_table_association_id: String @alias(property: "association.route_table_association_id")
    }
    
    type Resource_link @alias(property:"resource_link") {
        _id: ID! @id
    }
    
    type Tagged @alias(property:"tagged") {
        _id: ID! @id
    }
    
    type Transient_resource_link @alias(property:"transient_resource_link") {
        _id: ID! @id
    }
    
    input Options {
        limit:Int
    }
    
    type Query {
        getNodeImage(filter: ImageInput): Image
        getNodeImages(filter: ImageInput, options: Options): [Image]
        getNodeGuardduty_cn_detector(filter: Guardduty_cn_detectorInput): Guardduty_cn_detector
        getNodeGuardduty_cn_detectors(filter: Guardduty_cn_detectorInput, options: Options): [Guardduty_cn_detector]
        getNodeEc2_cn_vpc(filter: Ec2_cn_vpcInput): Ec2_cn_vpc
        getNodeEc2_cn_vpcs(filter: Ec2_cn_vpcInput, options: Options): [Ec2_cn_vpc]
        getNodeIam_cn_role(filter: Iam_cn_roleInput): Iam_cn_role
        getNodeIam_cn_roles(filter: Iam_cn_roleInput, options: Options): [Iam_cn_role]
        getNodeEc2_cn_network_hy_interface(filter: Ec2_cn_network_hy_interfaceInput): Ec2_cn_network_hy_interface
        getNodeEc2_cn_network_hy_interfaces(filter: Ec2_cn_network_hy_interfaceInput, options: Options): [Ec2_cn_network_hy_interface]
        getNodeRds_cn_db(filter: Rds_cn_dbInput): Rds_cn_db
        getNodeRds_cn_dbs(filter: Rds_cn_dbInput, options: Options): [Rds_cn_db]
        getNodeEc2_cn_instance(filter: Ec2_cn_instanceInput): Ec2_cn_instance
        getNodeEc2_cn_instances(filter: Ec2_cn_instanceInput, options: Options): [Ec2_cn_instance]
        getNodeIam_cn_user(filter: Iam_cn_userInput): Iam_cn_user
        getNodeIam_cn_users(filter: Iam_cn_userInput, options: Options): [Iam_cn_user]
        getNodeEc2_cn_security_hy_group(filter: Ec2_cn_security_hy_groupInput): Ec2_cn_security_hy_group
        getNodeEc2_cn_security_hy_groups(filter: Ec2_cn_security_hy_groupInput, options: Options): [Ec2_cn_security_hy_group]
        getNodeEc2_cn_internet_hy_gateway(filter: Ec2_cn_internet_hy_gatewayInput): Ec2_cn_internet_hy_gateway
        getNodeEc2_cn_internet_hy_gateways(filter: Ec2_cn_internet_hy_gatewayInput, options: Options): [Ec2_cn_internet_hy_gateway]
        getNodeEvents_cn_rule(filter: Events_cn_ruleInput): Events_cn_rule
        getNodeEvents_cn_rules(filter: Events_cn_ruleInput, options: Options): [Events_cn_rule]
        getNodeEc2_cn_subnet(filter: Ec2_cn_subnetInput): Ec2_cn_subnet
        getNodeEc2_cn_subnets(filter: Ec2_cn_subnetInput, options: Options): [Ec2_cn_subnet]
        getNodeIam_cn_instance_hy_profile(filter: Iam_cn_instance_hy_profileInput): Iam_cn_instance_hy_profile
        getNodeIam_cn_instance_hy_profiles(filter: Iam_cn_instance_hy_profileInput, options: Options): [Iam_cn_instance_hy_profile]
        getNodeIam_cn_policy(filter: Iam_cn_policyInput): Iam_cn_policy
        getNodeIam_cn_policys(filter: Iam_cn_policyInput, options: Options): [Iam_cn_policy]
        getNodeS3_cn_bucket(filter: S3_cn_bucketInput): S3_cn_bucket
        getNodeS3_cn_buckets(filter: S3_cn_bucketInput, options: Options): [S3_cn_bucket]
        getNodeTag(filter: TagInput): Tag
        getNodeTags(filter: TagInput, options: Options): [Tag]
        getNodeKms_cn_key(filter: Kms_cn_keyInput): Kms_cn_key
        getNodeKms_cn_keys(filter: Kms_cn_keyInput, options: Options): [Kms_cn_key]
        getNodeEc2_cn_volume(filter: Ec2_cn_volumeInput): Ec2_cn_volume
        getNodeEc2_cn_volumes(filter: Ec2_cn_volumeInput, options: Options): [Ec2_cn_volume]
        getNodeEc2_cn_route_hy_table(filter: Ec2_cn_route_hy_tableInput): Ec2_cn_route_hy_table
        getNodeEc2_cn_route_hy_tables(filter: Ec2_cn_route_hy_tableInput, options: Options): [Ec2_cn_route_hy_table]
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

test('should output airport schema', function() {
    let input = graphDBInferenceSchema(JSON.stringify(AIRPORT_SCHEMA));
    let result = AIRPORT_SCHEMA_RESULT;
    input = fixWhitespace(input);
    result = fixWhitespace(result);
    expect(input).toBe(result);
});

test('should output dining_by_friends schema', function() {
    let input = graphDBInferenceSchema(JSON.stringify(DINING_SCHEMA));
    let result = DINING_SCHEMA_RESULT;
    input = fixWhitespace(input);
    result = fixWhitespace(result);
    expect(input).toBe(result);
});

// test('should output epl schema', function() {
//     let input = graphDBInferenceSchema(JSON.stringify(EPL_SCHEMA));
//     let result = EPL_SCHEMA_RESULT;
//     console.log(input);
//     input = fixWhitespace(input);
//     result = fixWhitespace(result);
//     expect(input).toBe(result);
// });

// test('should output fraud_graph schema', function() {
//     let input = graphDBInferenceSchema(JSON.stringify(FRAUD_SCHEMA));
//     let result = FRAUD_SCHEMA_RESULT;
//     console.log(input);
//     input = fixWhitespace(input);
//     result = fixWhitespace(result);
//     expect(input).toBe(result);
// });

// test('should output knowledge-graph schema', function() {
//     let input = graphDBInferenceSchema(JSON.stringify(KNOWLEDGE_SCHEMA));
//     let result = KNOWLEDGE_SCHEMA_RESULT;
//     console.log(input);
//     input = fixWhitespace(input);
//     result = fixWhitespace(result);
//     expect(input).toBe(result);
// });

test('should output security-graph schema', function() {
    let input = graphDBInferenceSchema(JSON.stringify(SECURITY_SCHEMA));
    let result = SECURITY_SCHEMA_RESULT;
    input = fixWhitespace(input);
    result = fixWhitespace(result);
    expect(input).toBe(result);
});