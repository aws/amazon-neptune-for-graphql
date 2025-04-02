import { initSchema, resolveGraphDBQueryFromAppSyncEvent, resolveGraphDBQuery } from '../../../templates/JSResolverOCHTTPS.js'
import {readFileSync} from "fs";
import {schemaParser} from "../../schemaParser.js";
import {validatedSchemaModel} from "../../schemaModelValidator.js";

// Initialize resolver
const airportsGraphQL = readFileSync('src/test/airports.customized.graphql', 'utf-8');

let schemaDataModel = schemaParser(airportsGraphQL);
schemaDataModel = validatedSchemaModel(schemaDataModel, false)

schemaDataModel = JSON.stringify(schemaDataModel, null, 2);
const schemaModel = JSON.parse(schemaDataModel);
initSchema(schemaModel);

test('should resolve queries with a filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirport',
        arguments: { filter: { code: 'SEA' } },
        selectionSetGraphQL: '{ city }'
    });
    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`{code: $getNodeAirport_Airport_code})\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve queries with an empty filter object', () => {
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

test('should resolve queries without a filter', () => {
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

test('should resolve queries with a filter that contains numeric and string values', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirports',
        arguments: { filter: { country: 'US', runways: 3 } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getNodeAirports_Airport:`airport`{country: $getNodeAirports_Airport_country, runways: $getNodeAirports_Airport_runways})\n' +
            'RETURN collect({city: getNodeAirports_Airport.`city`})',
        parameters: { getNodeAirports_Airport_country: 'US',  getNodeAirports_Airport_runways: 3},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve queries with a string id filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirport',
        arguments: { filter: { _id: '22' } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE ID(getNodeAirport_Airport) = $getNodeAirport_Airport_whereId\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_whereId: '22'},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve queries with an integer id filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getNodeAirport',
        arguments: { filter: { _id: 22 } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE ID(getNodeAirport_Airport) = $getNodeAirport_Airport_whereId\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_whereId: '22'},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve gremlin query with argument', () => {
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

test('should resolve gremlin query without arguments or selection set', () => {
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

// Resolver Query Tests

// Query0001
test('should inference query from return type (Query0001)', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getAirport(code: \"SEA\") {\n city \n }\n}');

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
    const result = resolveGraphDBQuery('query MyQuery {\n getAirport(code: \"SEA\") {\n _id\n }\n }');

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
    const result = resolveGraphDBQuery('query MyQuery {\n getAirport(code: \"YKM\") {\n city\n continentContainsIn {\n desc\n }\n countryContainsIn {\n desc\n }\n airportRoutesOut {\n code\n }\n }\n }');

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'YKM'})\n" +
            'OPTIONAL MATCH (getAirport_Airport)<-[getAirport_Airport_continentContainsIn_contains:contains]-(getAirport_Airport_continentContainsIn:`continent`)\n' +
            'OPTIONAL MATCH (getAirport_Airport)<-[getAirport_Airport_countryContainsIn_contains:contains]-(getAirport_Airport_countryContainsIn:`country`)\n' +
            'OPTIONAL MATCH (getAirport_Airport)-[getAirport_Airport_airportRoutesOut_route:route]->(getAirport_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getAirport_Airport, getAirport_Airport_continentContainsIn, getAirport_Airport_countryContainsIn, collect({code: getAirport_Airport_airportRoutesOut.`code`}) AS getAirport_Airport_airportRoutesOut_collect\n' +
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
    const result = resolveGraphDBQuery('query MyQuery {\n getAirport(code: \"SEA\") {\n airportRoutesOut {\n code\n route {\n dist\n }\n }\n }\n }\n');

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'OPTIONAL MATCH (getAirport_Airport)-[getAirport_Airport_airportRoutesOut_route:route]->(getAirport_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getAirport_Airport, getAirport_Airport_airportRoutesOut, {dist: getAirport_Airport_airportRoutesOut_route.`dist`} AS getAirport_Airport_airportRoutesOut_route_one\n' +
            'WITH getAirport_Airport, collect({code: getAirport_Airport_airportRoutesOut.`code`, route: getAirport_Airport_airportRoutesOut_route_one}) AS getAirport_Airport_airportRoutesOut_collect\n' +
            'RETURN {airportRoutesOut: getAirport_Airport_airportRoutesOut_collect} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0005
test('should return type with graph query returning a scalar (Query0005)', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getAirport(code: \"SEA\") {\n outboundRoutesCount\n }\n }\n');

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
    const result = resolveGraphDBQuery('query MyQuery {\n getAirport(code: \"SEA\") {\n desc\n }\n }\n');

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
    const result = resolveGraphDBQuery('query MyQuery {\n getAirportConnection(fromCode: \"SEA\", toCode: \"BLQ\") {\n city\n code\n }\n }\n');

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
    const result = resolveGraphDBQuery('query MyQuery {\n getAirportWithGremlin(code: \"SEA\") {\n _id\n city\n runways\n }\n }\n');

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
    const result = resolveGraphDBQuery('query MyQuery {\n  getContinentsWithGremlin {\n code\n }\n }\n');

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
    const result = resolveGraphDBQuery('query MyQuery {\n getCountriesCountGremlin\n }\n');

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
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeAirport(filter: {code: \"SEA\"}) {\n city \n }\n}');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`{code: $getNodeAirport_Airport_code})\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0012
test('should apply limit to results returned from a nested edge (Query0012)', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeAirport(filter: {code: \"SEA\"}) {\n airportRoutesOut(options: {limit: 2}) {\n code\n }\n }\n }');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`{code: $getNodeAirport_Airport_code})\n' +
            'OPTIONAL MATCH (getNodeAirport_Airport)-[getNodeAirport_Airport_airportRoutesOut_route:route]->(getNodeAirport_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getNodeAirport_Airport, collect({code: getNodeAirport_Airport_airportRoutesOut.`code`})[..2] AS getNodeAirport_Airport_airportRoutesOut_collect\n' +
            'RETURN {airportRoutesOut: getNodeAirport_Airport_airportRoutesOut_collect} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0013
test('should inference query with filter in nested edge (Query0013)', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeAirport(filter: {code: \"SEA\"}) {\n airportRoutesOut(filter: {code: \"LAX\"}) {\n city\n }\n city\n }\n }');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`{code: $getNodeAirport_Airport_code})\n' +
            'OPTIONAL MATCH (getNodeAirport_Airport)-[getNodeAirport_Airport_airportRoutesOut_route:route]->(getNodeAirport_Airport_airportRoutesOut:`airport`{code: $getNodeAirport_Airport_airportRoutesOut_code})\n' +
            'WITH getNodeAirport_Airport, collect({city: getNodeAirport_Airport_airportRoutesOut.`city`}) AS getNodeAirport_Airport_airportRoutesOut_collect\n' +
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
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeAirport(filter: {code: \"SEA\"}) {\n outboundRoutesCount\n }\n }');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`{code: $getNodeAirport_Airport_code})\n' +
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
    const result = resolveGraphDBQuery('mutation MyMutation {\n createNodeAirport(input: {code: \"NAX\", city: \"Reggio Emilia\"}) {\n code\n }\n }');

    expect(result).toMatchObject({
        query: 'CREATE (createNodeAirport_Airport:`airport` {city: $createNodeAirport_Airport_city, code: $createNodeAirport_Airport_code})\n' +
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
    const result = resolveGraphDBQuery('mutation MyMutation {\n updateNodeAirport(input: {_id: \"22\", city: \"Seattle\"}) {\n city\n }\n }');

    expect(result).toMatchObject({
        query: 'MATCH (updateNodeAirport_Airport)\n' +
            'WHERE ID(updateNodeAirport_Airport) = $updateNodeAirport_Airport_whereId\n' +
            'SET  updateNodeAirport_Airport.city = $updateNodeAirport_Airport_city\n' +
            'RETURN {city: updateNodeAirport_Airport.`city`}',
        parameters: {
            updateNodeAirport_Airport_city: 'Seattle',
            updateNodeAirport_Airport_whereId: '22'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0017
test('should inference query using _id as filter (Query0017)', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeAirport(filter: {_id: \"22\"}) {\n city\n }\n }');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE ID(getNodeAirport_Airport) = $getNodeAirport_Airport_whereId\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_whereId: '22' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0018
test('should control number of result using limit option (Query0018)', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeAirports(options: {limit: 1}, filter: {code: \"SEA\"}) {\n city }\n }');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirports_Airport:`airport`{code: $getNodeAirports_Airport_code})\n' +
            'WITH getNodeAirports_Airport LIMIT 1\n' +
            'RETURN collect({city: getNodeAirports_Airport.`city`})[..1]',
        parameters: { getNodeAirports_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0019
test('should resolve query that gets multiple different type of fields (Query0019)', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeAirport(filter: {code: \"SEA\"}) {\n _id\n city\n elev\n runways\n lat\n lon\n }\n }');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`{code: $getNodeAirport_Airport_code})\n' +
            'RETURN {_id:ID(getNodeAirport_Airport), city: getNodeAirport_Airport.`city`, elev: getNodeAirport_Airport.`elev`, runways: getNodeAirport_Airport.`runways`, lat: getNodeAirport_Airport.`lat`, lon: getNodeAirport_Airport.`lon`} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0020
test('should filter by parameter with numeric value and return mix of numeric value types (Query0020)', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeAirports(filter: { city: \"Seattle\", runways: 3 }) {\n code\n lat\n lon\n elev\n}\n }');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirports_Airport:`airport`{city: $getNodeAirports_Airport_city, runways: $getNodeAirports_Airport_runways})\n' +
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
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeContinents {\n code\n desc\n }\n }\n');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeContinents_Continent:`continent`)\n' +
            'RETURN collect({code: getNodeContinents_Continent.`code`, desc: getNodeContinents_Continent.`desc`})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with parameters that have constant values', () => {
    const result = resolveGraphDBQuery('query MyQuery {\n getNodeCountry(filter: {_id: \"3541\", code: \"CA\"}) {\n desc\n }\n }\n');

    expect(result).toMatchObject({
        query: 'MATCH (getNodeCountry_Country:`country`{code: $getNodeCountry_Country_code}) WHERE ID(getNodeCountry_Country) = $getNodeCountry_Country_whereId\n' +
            'RETURN {desc: getNodeCountry_Country.`desc`} LIMIT 1',
        parameters: {
            getNodeCountry_Country_code: 'CA',
            getNodeCountry_Country_whereId: '3541'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});
