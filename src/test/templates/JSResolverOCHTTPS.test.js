import { initSchema, resolveGraphDBQueryFromAppSyncEvent, resolveGraphDBQuery, resolveGraphDBQueryFromEvent } from '../../../templates/JSResolverOCHTTPS.js'
import {readFileSync} from "fs";
import {schemaParser} from "../../schemaParser.js";
import {validatedSchemaModel} from "../../schemaModelValidator.js";
import { gql } from "graphql-tag";

beforeAll(() => {
    // Initialize resolver
    const airportsGraphQL = readFileSync('src/test/airports.customized.graphql', 'utf-8');

    let schemaDataModel = schemaParser(airportsGraphQL);
    schemaDataModel = validatedSchemaModel(schemaDataModel, false)

    schemaDataModel = JSON.stringify(schemaDataModel, null, 2);
    const schemaModel = JSON.parse(schemaDataModel);
    initSchema(schemaModel);
});

afterEach(() => {
    // gql retains state which needs to be cleared after each test
    gql.resetCaches();
});

test('should resolve app sync event queries with a filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirport',
        arguments: { filter: { code: {eq: 'SEA'} } },
        selectionSetGraphQL: '{ city }'
    });
    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE getNodeAirport_Airport.code = $getNodeAirport_Airport_code\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries with an empty filter object', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirport',
        arguments: { filter: {} },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`)\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries without a filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirport',
        arguments: {},
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`)\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries with a filter that contains numeric and string values', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirports',
        arguments: { filter: { country: {eq: 'US'}, runways: 3 } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getNodeAirports_Airport:`airport`) WHERE getNodeAirports_Airport.country = $getNodeAirports_Airport_country AND getNodeAirports_Airport.runways = $getNodeAirports_Airport_runways\n' +
            'RETURN collect({city: getNodeAirports_Airport.`city`})',
        parameters: { getNodeAirports_Airport_country: 'US',  getNodeAirports_Airport_runways: 3},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries with a string id filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirport',
        arguments: { filter: { _id: '22' } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE ID(getNodeAirport_Airport) = $getNodeAirport_Airport__id\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport__id: '22'},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries with an integer id filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirport',
        arguments: { filter: { _id: 22 } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE ID(getNodeAirport_Airport) = $getNodeAirport_Airport__id\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport__id: '22'},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event gremlin query with argument', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirportWithGremlin',
        arguments: { code: 'YVR' },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toMatchObject({
        query: "g.V().has('airport', 'code', 'YVR').elementMap()",
        parameters: {},
        language: 'gremlin',
        refactorOutput: null
    });
});

test('should resolve app sync event gremlin query without arguments or selection set', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getCountriesCount',
        arguments: { },
        selectionSetGraphQL: ''
    });

    expect(result).toMatchObject({
        query: "g.V().hasLabel('country').count()",
        parameters: {},
        language: 'gremlin',
        refactorOutput: null
    });
});

test('should resolve app sync event with nested edge filters and variables', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirports',
        arguments: {
            filter: {
                country: {
                    eq: 'CA'
                }
            },
            options: {
                limit: 6
            }
        },
        variables: {
            filter: {
                country: {
                    eq: 'CA'
                }
            },
            options: {
                limit: 6
            },
            nestedFilter: {
                country: {
                    startsWith: "M"
                }
            },
            nestedOptions: {
                limit: 2
            }
        },
        selectionSetGraphQL: '{ _id city, code, airportRoutesOut(filter: $nestedFilter, options: $nestedOptions) { _id, city, code } }'
    });

    expect(result).toMatchObject({
        query: "MATCH (getNodeAirports_Airport:`airport`) " +
            "WHERE getNodeAirports_Airport.country = $getNodeAirports_Airport_country " +
            "WITH getNodeAirports_Airport LIMIT 6\n" +
            "OPTIONAL MATCH (getNodeAirports_Airport)-[getNodeAirports_Airport_airportRoutesOut_route:route]->(getNodeAirports_Airport_airportRoutesOut:`airport`) " +
            "WHERE getNodeAirports_Airport_airportRoutesOut.country STARTS WITH $getNodeAirports_Airport_airportRoutesOut_country\n" +
            "WITH getNodeAirports_Airport, " +
            "CASE WHEN getNodeAirports_Airport_airportRoutesOut IS NULL THEN [] " +
            "ELSE COLLECT({_id:ID(getNodeAirports_Airport_airportRoutesOut), city: getNodeAirports_Airport_airportRoutesOut.`city`, code: getNodeAirports_Airport_airportRoutesOut.`code`})[..2] " +
            "END AS getNodeAirports_Airport_airportRoutesOut_collect\n" +
            "RETURN collect({_id:ID(getNodeAirports_Airport), city: getNodeAirports_Airport.`city`, code: getNodeAirports_Airport.`code`, airportRoutesOut: getNodeAirports_Airport_airportRoutesOut_collect})[..6]",
        parameters: {
            "getNodeAirports_Airport_country": "CA",
            "getNodeAirports_Airport_airportRoutesOut_country": "M"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Resolver Query Tests

// Query0001
test('should inference query from return type (Query0001)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(code: \"SEA\") {\n city \n }\n}'});

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0002
test('should get neptune_id (Query0002)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(code: \"SEA\") {\n _id\n }\n }'});

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {_id:ID(getAirport_Airport)} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0003
test('should inference query with nested types single and array, references in and out (Query0003)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(code: \"YKM\") {\n city\n continentContainsIn {\n desc\n }\n countryContainsIn {\n desc\n }\n airportRoutesOut {\n code\n }\n }\n }'});

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'YKM'})\n" +
            'OPTIONAL MATCH (getAirport_Airport)<-[getAirport_Airport_continentContainsIn_contains:contains]-(getAirport_Airport_continentContainsIn:`continent`)\n' +
            'OPTIONAL MATCH (getAirport_Airport)<-[getAirport_Airport_countryContainsIn_contains:contains]-(getAirport_Airport_countryContainsIn:`country`)\n' +
            'OPTIONAL MATCH (getAirport_Airport)-[getAirport_Airport_airportRoutesOut_route:route]->(getAirport_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getAirport_Airport, getAirport_Airport_continentContainsIn, getAirport_Airport_countryContainsIn, CASE WHEN getAirport_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({code: getAirport_Airport_airportRoutesOut.`code`}) END AS getAirport_Airport_airportRoutesOut_collect\n' +
            'WITH getAirport_Airport, getAirport_Airport_continentContainsIn, getAirport_Airport_airportRoutesOut_collect, {desc: getAirport_Airport_countryContainsIn.`desc`} AS getAirport_Airport_countryContainsIn_one\n' +
            'WITH getAirport_Airport, getAirport_Airport_countryContainsIn_one, getAirport_Airport_airportRoutesOut_collect, {desc: getAirport_Airport_continentContainsIn.`desc`} AS getAirport_Airport_continentContainsIn_one\n' +
            'RETURN {city: getAirport_Airport.`city`, continentContainsIn: getAirport_Airport_continentContainsIn_one, countryContainsIn: getAirport_Airport_countryContainsIn_one, airportRoutesOut: getAirport_Airport_airportRoutesOut_collect} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0004
test('should get edge properties in nested array (Query0004)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(code: \"SEA\") {\n airportRoutesOut {\n code\n route {\n dist\n }\n }\n }\n }\n'});

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'OPTIONAL MATCH (getAirport_Airport)-[getAirport_Airport_airportRoutesOut_route:route]->(getAirport_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getAirport_Airport, getAirport_Airport_airportRoutesOut, {dist: getAirport_Airport_airportRoutesOut_route.`dist`} AS getAirport_Airport_airportRoutesOut_route_one\n' +
            'WITH getAirport_Airport, CASE WHEN getAirport_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({code: getAirport_Airport_airportRoutesOut.`code`, route: getAirport_Airport_airportRoutesOut_route_one}) END AS getAirport_Airport_airportRoutesOut_collect\n' +
            'RETURN {airportRoutesOut: getAirport_Airport_airportRoutesOut_collect} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0005
test('should return type with graph query returning a scalar (Query0005)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(code: \"SEA\") {\n outboundRoutesCount\n }\n }\n'});

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'OPTIONAL MATCH (getAirport_Airport)-[getAirport_Airport_outboundRoutesCount_r:route]->(getAirport_Airport_outboundRoutesCount_a)\n' +
            'WITH getAirport_Airport, count(getAirport_Airport_outboundRoutesCount_r) AS getAirport_Airport_outboundRoutesCount\n' +
            'RETURN {outboundRoutesCount:getAirport_Airport_outboundRoutesCount} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0006
test('should map type name to different graph db property name (Query0006)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(code: \"SEA\") {\n desc\n }\n }\n'});

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {desc: getAirport_Airport.`desc`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0007
test('should resolve query using a graphQuery returning a type (Query0007)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirportConnection(fromCode: \"SEA\", toCode: \"BLQ\") {\n city\n code\n }\n }\n'});

    expect(result).toMatchObject({
        query: "MATCH (:airport{code: 'SEA'})-[:route]->(getAirportConnection_Airport:airport)-[:route]->(:airport{code:'BLQ'})\n" +
            'RETURN {city: getAirportConnection_Airport.`city`, code: getAirportConnection_Airport.`code`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0008
test('should resolve query using Gremlin returning a type (Query0008)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirportWithGremlin(code: \"SEA\") {\n _id\n city\n runways\n }\n }\n'});

    expect(result).toMatchObject({
        query: "g.V().has('airport', 'code', 'SEA').elementMap()",
        language: 'gremlin',
        parameters: {},
        refactorOutput: null,
        fieldsAlias: {
            id: '_id',
            country: 'country',
            longest: 'longest',
            code: 'code',
            city: 'city',
            elev: 'elev',
            icao: 'icao',
            lon: 'lon',
            runways: 'runways',
            region: 'region',
            type: 'type',
            lat: 'lat',
            desc: 'desc',
            outboundRoutesCount: 'outboundRoutesCount',
            continentContainsIn: 'continentContainsIn',
            countryContainsIn: 'countryContainsIn',
            airportRoutesOut: 'airportRoutesOut',
            airportRoutesIn: 'airportRoutesIn',
            contains: 'contains',
            route: 'route'
        }
    });
});

// Query0009
test('should resolve query using Gremlin returning a type array (Query0009)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n  getContinentsWithGremlin {\n code\n }\n }\n'});

    expect(result).toMatchObject({
        query: "g.V().hasLabel('continent').elementMap().fold()",
        language: 'gremlin',
        parameters: {},
        refactorOutput: null,
        fieldsAlias: {
            id: '_id',
            code: 'code',
            type: 'type',
            desc: 'desc',
            airportContainssOut: 'airportContainssOut',
            contains: 'contains'
        }
    });
});

// Query0010
test('should resolve query using Gremlin returning a scalar (Query0010)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getCountriesCountGremlin\n }\n'});

    expect(result).toMatchObject({
        query: "g.V().hasLabel('country').count()",
        language: 'gremlin',
        parameters: {},
        refactorOutput: null,
        fieldsAlias: {}
    });
});

// Query0011
test('should inference query using filter (Query0011)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeAirport(filter: {code: {eq: \"SEA\"}}) {\n city \n }\n}'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE getNodeAirport_Airport.code = $getNodeAirport_Airport_code\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0012
test('should apply limit to results returned from a nested edge (Query0012)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeAirport(filter: {code: {eq: \"SEA\"}}) {\n airportRoutesOut(options: {limit: 2}) {\n code\n }\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE getNodeAirport_Airport.code = $getNodeAirport_Airport_code\n' +
            'OPTIONAL MATCH (getNodeAirport_Airport)-[getNodeAirport_Airport_airportRoutesOut_route:route]->(getNodeAirport_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getNodeAirport_Airport, CASE WHEN getNodeAirport_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({code: getNodeAirport_Airport_airportRoutesOut.`code`})[..2] END AS getNodeAirport_Airport_airportRoutesOut_collect\n' +
            'RETURN {airportRoutesOut: getNodeAirport_Airport_airportRoutesOut_collect} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0013
test('should inference query with filter in nested edge (Query0013)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeAirport(filter: {code: {eq: \"SEA\"}}) {\n airportRoutesOut(filter: {code: {eq: \"LAX\"}}) {\n city\n }\n city\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE getNodeAirport_Airport.code = $getNodeAirport_Airport_code\n' +
            'OPTIONAL MATCH (getNodeAirport_Airport)-[getNodeAirport_Airport_airportRoutesOut_route:route]->(getNodeAirport_Airport_airportRoutesOut:`airport`) WHERE getNodeAirport_Airport_airportRoutesOut.code = $getNodeAirport_Airport_airportRoutesOut_code\n' +
            'WITH getNodeAirport_Airport, CASE WHEN getNodeAirport_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({city: getNodeAirport_Airport_airportRoutesOut.`city`}) END AS getNodeAirport_Airport_airportRoutesOut_collect\n' +
            'RETURN {airportRoutesOut: getNodeAirport_Airport_airportRoutesOut_collect, city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: {
            getNodeAirport_Airport_code: 'SEA',
            getNodeAirport_Airport_airportRoutesOut_code: 'LAX'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0014
test('should inference query using field graphQuery outboundRoutesCount (Query0014)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeAirport(filter: {code: {eq: \"SEA\"}}) {\n outboundRoutesCount\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE getNodeAirport_Airport.code = $getNodeAirport_Airport_code\n' +
            'OPTIONAL MATCH (getNodeAirport_Airport)-[getNodeAirport_Airport_outboundRoutesCount_r:route]->(getNodeAirport_Airport_outboundRoutesCount_a)\n' +
            'WITH getNodeAirport_Airport, count(getNodeAirport_Airport_outboundRoutesCount_r) AS getNodeAirport_Airport_outboundRoutesCount\n' +
            'RETURN {outboundRoutesCount:getNodeAirport_Airport_outboundRoutesCount} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0015
test('should inference query with mutation create node (Query0015)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'mutation MyMutation {\n createNodeAirport(input: {code: \"NAX\", city: \"Reggio Emilia\"}) {\n code\n }\n }'});

    expect(result).toMatchObject({
        query: 'CREATE (createNodeAirport_Airport:`airport` {code: $createNodeAirport_Airport_code, city: $createNodeAirport_Airport_city})\n' +
            'RETURN {code: createNodeAirport_Airport.`code`}',
        parameters: {
            createNodeAirport_Airport_code: 'NAX',
            createNodeAirport_Airport_city: 'Reggio Emilia'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0016
test('should inference query with mutation update node (Query0016)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'mutation MyMutation {\n updateNodeAirport(input: {_id: \"22\", city: \"Seattle\"}) {\n city\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (updateNodeAirport_Airport)\n' +
            'WHERE ID(updateNodeAirport_Airport) = $updateNodeAirport_Airport__id\n' +
            'SET updateNodeAirport_Airport.city = $updateNodeAirport_Airport_city\n' +
            'RETURN {city: updateNodeAirport_Airport.`city`}',
        parameters: {
            updateNodeAirport_Airport_city: 'Seattle',
            updateNodeAirport_Airport__id: '22'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to connect nodes', () => {
    const query = 'mutation ConnectCountryToAirport {\n' +
        '  connectNodeCountryToNodeAirportEdgeContains(from_id: \"ee71c547-ea32-4573-88bc-6ecb31942a1e\", to_id: \"99cb3321-9cda-41b6-b760-e88ead3e1ea1\") {\n' +
        '    _id\n' +
        '  }\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from), (to)\n' +
            'WHERE ID(from) = $connectNodeCountryToNodeAirportEdgeContains_Contains_whereFromId ' +
            'AND ID(to) = $connectNodeCountryToNodeAirportEdgeContains_Contains_whereToId\n' +
            'CREATE (from)-[connectNodeCountryToNodeAirportEdgeContains_Contains:`contains`]->(to)\n' +
            'RETURN {_id:ID(connectNodeCountryToNodeAirportEdgeContains_Contains)}',
        parameters: {
            connectNodeCountryToNodeAirportEdgeContains_Contains_whereFromId: 'ee71c547-ea32-4573-88bc-6ecb31942a1e',
            connectNodeCountryToNodeAirportEdgeContains_Contains_whereToId: '99cb3321-9cda-41b6-b760-e88ead3e1ea1'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to delete edge between nodes', () => {
    const query = 'mutation DeleteEdgeContainsFromCountryToAirport {\n' +
        '  deleteEdgeContainsFromCountryToAirport(from_id: \"ee71c547-ea32-4573-88bc-6ecb31942a1e\", to_id: \"99cb3321-9cda-41b6-b760-e88ead3e1ea1\")\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from)-[deleteEdgeContainsFromCountryToAirport_Boolean]->(to)\n' +
            'WHERE ID(from) = $deleteEdgeContainsFromCountryToAirport_Boolean_whereFromId ' +
            'AND ID(to) = $deleteEdgeContainsFromCountryToAirport_Boolean_whereToId\n' +
            'DELETE deleteEdgeContainsFromCountryToAirport_Boolean\n' +
            'RETURN true',
        parameters: {
            deleteEdgeContainsFromCountryToAirport_Boolean_whereFromId: 'ee71c547-ea32-4573-88bc-6ecb31942a1e',
            deleteEdgeContainsFromCountryToAirport_Boolean_whereToId: '99cb3321-9cda-41b6-b760-e88ead3e1ea1'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to update edge between nodes', () => {
    const query = 'mutation UpdateEdgeRouteFromAirportToAirport {\n' +
        '  updateEdgeRouteFromAirportToAirport(from_id: \"99\", to_id: \"48\", edge: { dist: 123 }) {\n' +
        '    _id\n' +
        '    dist\n' +
        '  }\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from)-[updateEdgeRouteFromAirportToAirport_Route:`route`]->(to)\n' +
            'WHERE ID(from) = $updateEdgeRouteFromAirportToAirport_Route_whereFromId ' +
            'AND ID(to) = $updateEdgeRouteFromAirportToAirport_Route_whereToId\n' +
            'SET updateEdgeRouteFromAirportToAirport_Route.dist = $updateEdgeRouteFromAirportToAirport_Route_dist\n' +
            'RETURN {_id:ID(updateEdgeRouteFromAirportToAirport_Route), dist: updateEdgeRouteFromAirportToAirport_Route.`dist`}',
        parameters: {
            updateEdgeRouteFromAirportToAirport_Route_whereFromId: '99',
            updateEdgeRouteFromAirportToAirport_Route_whereToId: '48',
            updateEdgeRouteFromAirportToAirport_Route_dist: 123
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0017
test('should inference query using _id as filter (Query0017)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeAirport(filter: {_id: \"22\"}) {\n city\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE ID(getNodeAirport_Airport) = $getNodeAirport_Airport__id\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport__id: '22' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0018
test('should control number of result using limit option (Query0018)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeAirports(options: {limit: 1}, filter: {code: {eq: \"SEA\"}}) {\n city }\n }'});
    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirports_Airport:`airport`) WHERE getNodeAirports_Airport.code = $getNodeAirports_Airport_code WITH getNodeAirports_Airport LIMIT 1\n' +
            'RETURN collect({city: getNodeAirports_Airport.`city`})[..1]',
        parameters: { getNodeAirports_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0019
test('should resolve query that gets multiple different type of fields (Query0019)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeAirport(filter: {code: {eq: \"SEA\"}}) {\n _id\n city\n elev\n runways\n lat\n lon\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE getNodeAirport_Airport.code = $getNodeAirport_Airport_code\n' +
            'RETURN {_id:ID(getNodeAirport_Airport), city: getNodeAirport_Airport.`city`, elev: getNodeAirport_Airport.`elev`, runways: getNodeAirport_Airport.`runways`, lat: getNodeAirport_Airport.`lat`, lon: getNodeAirport_Airport.`lon`} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0020
test('should filter by parameter with numeric value and return mix of numeric value types (Query0020)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeAirports(filter: { city: {eq: \"Seattle\"}, runways: 3 }) {\n code\n lat\n lon\n elev\n}\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirports_Airport:`airport`) WHERE getNodeAirports_Airport.city = $getNodeAirports_Airport_city AND getNodeAirports_Airport.runways = $getNodeAirports_Airport_runways\n' +
            'RETURN collect({code: getNodeAirports_Airport.`code`, lat: getNodeAirports_Airport.`lat`, lon: getNodeAirports_Airport.`lon`, elev: getNodeAirports_Airport.`elev`})',
        parameters: {
            getNodeAirports_Airport_city: 'Seattle',
            getNodeAirports_Airport_runways: 3
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with no parameters', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeContinents {\n code\n desc\n }\n }\n'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeContinents_Continent:`continent`)\n' +
            'RETURN collect({code: getNodeContinents_Continent.`code`, desc: getNodeContinents_Continent.`desc`})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with parameters that have constant values', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getNodeCountry(filter: {_id: \"3541\", code: {eq: \"CA\"}}) {\n desc\n }\n }\n'});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeCountry_Country:`country`) WHERE ID(getNodeCountry_Country) = $getNodeCountry_Country__id AND getNodeCountry_Country.code = $getNodeCountry_Country_code\n' +
            'RETURN {desc: getNodeCountry_Country.`desc`} LIMIT 1',
        parameters: {
            getNodeCountry_Country_code: 'CA',
            getNodeCountry_Country__id: '3541'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with filter that uses various string comparison operators', () => {
    const query = 'query GetNodeAirports {\n' +
        '  getNodeAirports(filter: {\n' +
        '    country: {\n' +
        '      eq: "CA"\n' +
        '    },\n' +
        '    code: {\n' +
        '      startsWith: "Y"\n' +
        '    },\n' +
        '    city:  {\n' +
        '        endsWith: "n"\n' +
        '    },\n' +
        '    desc: {\n' +
        '      contains: "Airport"\n' +
        '    }\n' +
        '    runways: 3\n' +
        '  }, options: {limit: 5}) {\n' +
        '    _id\n' +
        '    code\n' +
        '    city\n' +
        '    country\n' +
        '    runways\n' +
        '    desc\n' +
        '  }\n' +
        '}\n';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirports_Airport:`airport`) ' +
            'WHERE getNodeAirports_Airport.country = $getNodeAirports_Airport_country ' +
            'AND getNodeAirports_Airport.code STARTS WITH $getNodeAirports_Airport_code ' +
            'AND getNodeAirports_Airport.city ENDS WITH $getNodeAirports_Airport_city ' +
            'AND getNodeAirports_Airport.desc CONTAINS $getNodeAirports_Airport_desc ' +
            'AND getNodeAirports_Airport.runways = $getNodeAirports_Airport_runways ' +
            'WITH getNodeAirports_Airport LIMIT 5\n' +
            'RETURN collect({' +
            '_id:ID(getNodeAirports_Airport), ' +
            'code: getNodeAirports_Airport.`code`, ' +
            'city: getNodeAirports_Airport.`city`, ' +
            'country: getNodeAirports_Airport.`country`, ' +
            'runways: getNodeAirports_Airport.`runways`, ' +
            'desc: getNodeAirports_Airport.`desc`' +
            '})[..5]',
        parameters: {
            getNodeAirports_Airport_city: "n",
            getNodeAirports_Airport_code: "Y",
            getNodeAirports_Airport_country: "CA",
            getNodeAirports_Airport_runways: 3,
            getNodeAirports_Airport_desc: "Airport"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge filter that uses string comparison operator', () => {
    const query = 'query GetNodeAirports {\n' +
        '  getNodeAirports(filter:  {\n' +
        '     country:  {\n' +
        '        eq: "CA"\n' +
        '     }\n' +
        '  }, options:  {\n' +
        '     limit: 5\n' +
        '  }) {\n' +
        '    _id\n' +
        '    code\n' +
        '    city\n' +
        '    country\n' +
        '    airportRoutesOut(filter: {\n' +
        '       country:  {\n' +
        '          startsWith: "M"\n' +
        '       },\n' +
        '       code:  {\n' +
        '          contains: "M"\n' +
        '       }\n' +
        '    }, options:  {\n' +
        '       limit: 3\n' +
        '    }) {\n' +
        '      _id\n' +
        '      code\n' +
        '      city\n' +
        '      country\n' +
        '    }\n' +
        '  }\n' +
        '}\n';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirports_Airport:`airport`) ' +
            'WHERE getNodeAirports_Airport.country = $getNodeAirports_Airport_country ' +
            'WITH getNodeAirports_Airport LIMIT 5\n' +
            'OPTIONAL MATCH (getNodeAirports_Airport)-[getNodeAirports_Airport_airportRoutesOut_route:route]->(getNodeAirports_Airport_airportRoutesOut:`airport`) ' +
            'WHERE getNodeAirports_Airport_airportRoutesOut.country STARTS WITH $getNodeAirports_Airport_airportRoutesOut_country ' +
            'AND getNodeAirports_Airport_airportRoutesOut.code CONTAINS $getNodeAirports_Airport_airportRoutesOut_code\n' +
            'WITH getNodeAirports_Airport, ' +
            'CASE WHEN getNodeAirports_Airport_airportRoutesOut IS NULL THEN [] ' +
            'ELSE COLLECT({' +
            '_id:ID(getNodeAirports_Airport_airportRoutesOut), ' +
            'code: getNodeAirports_Airport_airportRoutesOut.`code`, ' +
            'city: getNodeAirports_Airport_airportRoutesOut.`city`, ' +
            'country: getNodeAirports_Airport_airportRoutesOut.`country`' +
            '})[..3] ' +
            'END AS getNodeAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({' +
            '_id:ID(getNodeAirports_Airport), ' +
            'code: getNodeAirports_Airport.`code`, ' +
            'city: getNodeAirports_Airport.`city`, ' +
            'country: getNodeAirports_Airport.`country`, ' +
            'airportRoutesOut: getNodeAirports_Airport_airportRoutesOut_collect' +
            '})[..5]',
        parameters: {
            getNodeAirports_Airport_country: "CA",
            getNodeAirports_Airport_airportRoutesOut_code: "M",
            getNodeAirports_Airport_airportRoutesOut_country: "M"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge filter and variables', () => {
    const query = 'query GetNodeAirports($filter: AirportInput, $options: Options, $nestedFilter: AirportInput, $nestedOptions: Options) {\n' +
        '  getNodeAirports(filter: $filter, options: $options) {\n' +
        '    _id\n' +
        '    city\n' +
        '    code\n' +
        '    airportRoutesOut(filter: $nestedFilter, options: $nestedOptions) {\n' +
        '      _id\n' +
        '      city\n' +
        '      code\n' +
        '    }\n' +
        '  }\n' +
        '}';
    const variables = {
        "filter": {
            "country": {
                "eq": "CA"
            }
        },
        "options": {
            "limit": 6
        },
        "nestedFilter": {
            "country": {
                "startsWith": "M"
            }
        },
        "nestedOptions": {
            "limit": 2
        }
    }
    const result = resolveGraphDBQuery({queryObjOrStr: query, variables: variables});

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirports_Airport:`airport`) ' +
            'WHERE getNodeAirports_Airport.country = $getNodeAirports_Airport_country ' +
            'WITH getNodeAirports_Airport LIMIT 6\n' +
            'OPTIONAL MATCH (getNodeAirports_Airport)-[getNodeAirports_Airport_airportRoutesOut_route:route]->(getNodeAirports_Airport_airportRoutesOut:`airport`) ' +
            'WHERE getNodeAirports_Airport_airportRoutesOut.country STARTS WITH $getNodeAirports_Airport_airportRoutesOut_country\n' +
            'WITH getNodeAirports_Airport, ' +
            'CASE WHEN getNodeAirports_Airport_airportRoutesOut IS NULL THEN [] ' +
            'ELSE COLLECT({' +
            '_id:ID(getNodeAirports_Airport_airportRoutesOut), ' +
            'city: getNodeAirports_Airport_airportRoutesOut.`city`, ' +
            'code: getNodeAirports_Airport_airportRoutesOut.`code`' +
            '})[..2] ' +
            'END AS getNodeAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({' +
            '_id:ID(getNodeAirports_Airport), ' +
            'city: getNodeAirports_Airport.`city`, ' +
            'code: getNodeAirports_Airport.`code`, ' +
            'airportRoutesOut: getNodeAirports_Airport_airportRoutesOut_collect' +
            '})[..6]',
        parameters: {
            getNodeAirports_Airport_country: "CA",
            getNodeAirports_Airport_airportRoutesOut_country: "M"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve custom mutation with @graphQuery directive and $input parameter', () => {
    const query = 'mutation MyMutation {\n' +
        '  createAirport(\n' +
        '    input: {city: \"Test\", code: \"TEST\", country: \"CA\", desc: \"Test Airport\"}\n' +
        '  ) {\n' +
        '    _id\n' +
        '    city\n' +
        '    code\n' +
        '    country\n' +
        '  }\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'CREATE (createAirport_Airport:airport {' +
            'city: $createAirport_Airport_city, ' +
            'code: $createAirport_Airport_code, ' +
            'country: $createAirport_Airport_country, ' +
            'desc: $createAirport_Airport_desc})\n' +
            'RETURN {' +
            '_id:ID(createAirport_Airport), ' +
            'city: createAirport_Airport.`city`, ' +
            'code: createAirport_Airport.`code`, ' +
            'country: createAirport_Airport.`country`' +
            '}',
        parameters: {
            createAirport_Airport_city: "Test",
            createAirport_Airport_code: "TEST",
            createAirport_Airport_country: "CA",
            createAirport_Airport_desc: "Test Airport"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with limit and offset', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirports',
        arguments: { options: { limit: 10, offset: 3 } },
        selectionSetGraphQL: '{ code }'
    });
    expect(result).toEqual({
        query: 'MATCH (getNodeAirports_Airport:`airport`) WITH getNodeAirports_Airport SKIP 3 LIMIT 10\n' +
            'RETURN collect({code: getNodeAirports_Airport.`code`})[..10]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge limit and offset', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirports',
        arguments: { options: { limit: 10, offset: 2 } },
        selectionSetGraphQL: '{ code, airportRoutesIn(options: {offset: 5, limit: 3}) {code} }'
    });
    expect(result).toEqual({
        query: 'MATCH (getNodeAirports_Airport:`airport`) WITH getNodeAirports_Airport SKIP 2 LIMIT 10\n' +
            'OPTIONAL MATCH (getNodeAirports_Airport)<-[getNodeAirports_Airport_airportRoutesIn_route:route]-(getNodeAirports_Airport_airportRoutesIn:`airport`)\n' +
            'WITH getNodeAirports_Airport, CASE WHEN getNodeAirports_Airport_airportRoutesIn IS NULL THEN [] ' +
            'ELSE COLLECT({code: getNodeAirports_Airport_airportRoutesIn.`code`})[5..8] ' +
            'END AS getNodeAirports_Airport_airportRoutesIn_collect\n' +
            'RETURN collect({' +
            'code: getNodeAirports_Airport.`code`, ' +
            'airportRoutesIn: getNodeAirports_Airport_airportRoutesIn_collect' +
            '})[..10]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge limit and offset from variables', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirports',
        arguments: { options: { limit: 2, offset: 4 } },
        selectionSetGraphQL: '{code, airportRoutesOut(options: $nestedOptions) {code}}',
        variables: { nestedOptions: { limit: 3, offset: 6 } }
    });
    expect(result).toEqual({
        query: 'MATCH (getNodeAirports_Airport:`airport`) WITH getNodeAirports_Airport SKIP 4 LIMIT 2\n' +
            'OPTIONAL MATCH (getNodeAirports_Airport)-[getNodeAirports_Airport_airportRoutesOut_route:route]->(getNodeAirports_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getNodeAirports_Airport, CASE WHEN getNodeAirports_Airport_airportRoutesOut IS NULL THEN [] ' +
            'ELSE COLLECT({code: getNodeAirports_Airport_airportRoutesOut.`code`})[6..9] ' +
            'END AS getNodeAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({' +
            'code: getNodeAirports_Airport.`code`, ' +
            'airportRoutesOut: getNodeAirports_Airport_airportRoutesOut_collect' +
            '})[..2]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query zero limit and offset', () => {
    // zero limit and offset would be odd, but is allowed
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirports',
        arguments: { options: { limit: 0, offset: 0 } },
        selectionSetGraphQL: '{ code, airportRoutesIn(options: {offset: 0, limit: 0}) {code} }'
    });
    expect(result).toEqual({
        query: 'MATCH (getNodeAirports_Airport:`airport`) WITH getNodeAirports_Airport SKIP 0 LIMIT 0\n' +
            'OPTIONAL MATCH (getNodeAirports_Airport)<-[getNodeAirports_Airport_airportRoutesIn_route:route]-(getNodeAirports_Airport_airportRoutesIn:`airport`)\n' +
            'WITH getNodeAirports_Airport, CASE WHEN getNodeAirports_Airport_airportRoutesIn IS NULL THEN [] ' +
            'ELSE COLLECT({code: getNodeAirports_Airport_airportRoutesIn.`code`})[0..0] ' +
            'END AS getNodeAirports_Airport_airportRoutesIn_collect\n' +
            'RETURN collect({' +
            'code: getNodeAirports_Airport.`code`, ' +
            'airportRoutesIn: getNodeAirports_Airport_airportRoutesIn_collect' +
            '})[..0]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should throw error for query with negative limit', () => {
    expect(() => {
        resolveGraphDBQueryFromAppSyncEvent({
            field: 'getNodeAirports',
            arguments: {options: {limit: -1}},
            selectionSetGraphQL: '{ code }'
        });
    }).toThrow('The limit value must be a positive integer');
});

test('should throw error for query with negative offset', () => {
    expect(() => {
        resolveGraphDBQueryFromAppSyncEvent({
            field: 'getNodeAirports',
            arguments: {options: {offset: -1}},
            selectionSetGraphQL: '{ code }'
        });
    }).toThrow('The offset value must be a positive integer');
});

test('should resolve query with multiple fragments', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'getNodeAirport',
        arguments: {filter: {code: {eq: 'YVR'}}},
        selectionSet: gql`{ _id, ...locationFields, ...otherFields, runways }`.definitions[0].selectionSet,
        fragments: {
            locationFields: gql`fragment locationFields on Airport { city, country }`.definitions[0],
            otherFields: gql`fragment otherFields on Airport { code, elev }`.definitions[0]
        }
    });
    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`) ' +
            'WHERE getNodeAirport_Airport.code = $getNodeAirport_Airport_code\n' +
            'RETURN {' +
            '_id:ID(getNodeAirport_Airport), ' +
            'city: getNodeAirport_Airport.`city`, ' +
            'country: getNodeAirport_Airport.`country`, ' +
            'code: getNodeAirport_Airport.`code`, ' +
            'elev: getNodeAirport_Airport.`elev`, ' +
            'runways: getNodeAirport_Airport.`runways`' +
            '} ' +
            'LIMIT 1',
        parameters: {getNodeAirport_Airport_code: "YVR"},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge fragments', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'getNodeAirport',
        arguments: {filter: {code: {eq: 'YVR'}}},
        selectionSet: gql`{ _id, ...locationFields, airportRoutesIn(options: {limit: 2}) {...locationFields}, ...otherFields }`.definitions[0].selectionSet,
        fragments: {
            locationFields: gql`fragment locationFields on Airport { city, country }`.definitions[0],
            otherFields: gql`fragment otherFields on Airport { code, elev }`.definitions[0]
        }
    });
    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`) ' +
            'WHERE getNodeAirport_Airport.code = $getNodeAirport_Airport_code\n' +
            'OPTIONAL MATCH (getNodeAirport_Airport)<-[getNodeAirport_Airport_airportRoutesIn_route:route]-(getNodeAirport_Airport_airportRoutesIn:`airport`)\n' +
            'WITH getNodeAirport_Airport, ' +
            'CASE WHEN getNodeAirport_Airport_airportRoutesIn IS NULL THEN [] ' +
            'ELSE COLLECT({' +
            'city: getNodeAirport_Airport_airportRoutesIn.`city`, ' +
            'country: getNodeAirport_Airport_airportRoutesIn.`country`' +
            '})[..2] END AS getNodeAirport_Airport_airportRoutesIn_collect\n' +
            'RETURN {' +
            '_id:ID(getNodeAirport_Airport), ' +
            'city: getNodeAirport_Airport.`city`, ' +
            'country: getNodeAirport_Airport.`country`, ' +
            'airportRoutesIn: getNodeAirport_Airport_airportRoutesIn_collect, ' +
            'code: getNodeAirport_Airport.`code`, ' +
            'elev: getNodeAirport_Airport.`elev`' +
            '} LIMIT 1',
        parameters: {getNodeAirport_Airport_code: "YVR"},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to update node with fragment', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'updateNodeAirport',
        arguments: {input: {_id: 22, city: "Seattle"}},
        selectionSet: gql`{ _id, ...locationFields, ...otherFields }`.definitions[0].selectionSet,
        fragments: {
            locationFields: gql`fragment locationFields on Airport { city, country }`.definitions[0],
            otherFields: gql`fragment otherFields on Airport { code, elev }`.definitions[0]
        }
    });
    
    expect(result).toEqual({
        query: 'MATCH (updateNodeAirport_Airport)\n' +
            'WHERE ID(updateNodeAirport_Airport) = $updateNodeAirport_Airport__id\n' +
            'SET updateNodeAirport_Airport.city = $updateNodeAirport_Airport_city\n' +
            'RETURN {' +
            '_id:ID(updateNodeAirport_Airport), ' +
            'city: updateNodeAirport_Airport.`city`, ' +
            'country: updateNodeAirport_Airport.`country`, ' +
            'code: updateNodeAirport_Airport.`code`, ' +
            'elev: updateNodeAirport_Airport.`elev`' +
            '}',
        parameters: {
            updateNodeAirport_Airport__id: 22,
            updateNodeAirport_Airport_city: "Seattle",
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to update edge between nodes with fragment', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'updateEdgeRouteFromAirportToAirport',
        arguments: {from_id: "99", to_id: "48", edge: { dist: 123 }},
        selectionSet: gql`{ _id, ...routeFields }`.definitions[0].selectionSet,
        fragments: {
            routeFields: gql`fragment routeFields on Route { dist }`.definitions[0]
        }
    });
    
    expect(result).toMatchObject({
        query: 'MATCH (from)-[updateEdgeRouteFromAirportToAirport_Route:`route`]->(to)\n' +
            'WHERE ID(from) = $updateEdgeRouteFromAirportToAirport_Route_whereFromId ' +
            'AND ID(to) = $updateEdgeRouteFromAirportToAirport_Route_whereToId\n' +
            'SET updateEdgeRouteFromAirportToAirport_Route.dist = $updateEdgeRouteFromAirportToAirport_Route_dist\n' +
            'RETURN {' +
            '_id:ID(updateEdgeRouteFromAirportToAirport_Route), ' +
            'dist: updateEdgeRouteFromAirportToAirport_Route.`dist`' +
            '}',
        parameters: {
            updateEdgeRouteFromAirportToAirport_Route_whereFromId: '99',
            updateEdgeRouteFromAirportToAirport_Route_whereToId: '48',
            updateEdgeRouteFromAirportToAirport_Route_dist: 123
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to create node with fragment', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'createNodeAirport',
        arguments: {input: {code: "NAX", city: "Reggio Emilia"}},
        selectionSet: gql`{ _id, ...locationFields, ...otherFields }`.definitions[0].selectionSet,
        fragments: {
            locationFields: gql`fragment locationFields on Airport { city, country }`.definitions[0],
            otherFields: gql`fragment otherFields on Airport { runways }`.definitions[0]
        }
    });
    
    expect(result).toEqual({
        query: 'CREATE (createNodeAirport_Airport:`airport` {city: $createNodeAirport_Airport_city, code: $createNodeAirport_Airport_code})\n' +
            'RETURN {' +
            '_id:ID(createNodeAirport_Airport), ' +
            'city: createNodeAirport_Airport.`city`, ' +
            'country: createNodeAirport_Airport.`country`, ' +
            'runways: createNodeAirport_Airport.`runways`' +
            '}',
        parameters: {
            createNodeAirport_Airport_code: 'NAX',
            createNodeAirport_Airport_city: 'Reggio Emilia'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to connect nodes with fragment', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'connectNodeCountryToNodeAirportEdgeContains',
        arguments: {from_id: "ee71c547-ea32-4573-88bc-6ecb31942a1e", to_id: "99cb3321-9cda-41b6-b760-e88ead3e1ea1"},
        selectionSet: gql`{ ...containsFields }`.definitions[0].selectionSet,
        fragments: {
            containsFields: gql`fragment containsFields on Contains { _id }`.definitions[0]
        }
    });

    expect(result).toMatchObject({
        query: 'MATCH (from), (to)\n' +
            'WHERE ID(from) = $connectNodeCountryToNodeAirportEdgeContains_Contains_whereFromId ' +
            'AND ID(to) = $connectNodeCountryToNodeAirportEdgeContains_Contains_whereToId\n' +
            'CREATE (from)-[connectNodeCountryToNodeAirportEdgeContains_Contains:`contains`]->(to)\n' +
            'RETURN {_id:ID(connectNodeCountryToNodeAirportEdgeContains_Contains)}',
        parameters: {
            connectNodeCountryToNodeAirportEdgeContains_Contains_whereFromId: 'ee71c547-ea32-4573-88bc-6ecb31942a1e',
            connectNodeCountryToNodeAirportEdgeContains_Contains_whereToId: '99cb3321-9cda-41b6-b760-e88ead3e1ea1'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should throw error for query with unknown fragment', () => {
    expect(() => {
        resolveGraphDBQueryFromEvent({
            field: 'getNodeAirport',
            arguments: {},
            selectionSet: gql`{ _id, ...unknownFragment, code }`.definitions[0].selectionSet,
            fragments: {}
        });
    }).toThrow('Fragment unknownFragment not found');
});