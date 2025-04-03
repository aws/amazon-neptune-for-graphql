import { initSchema, resolveGraphDBQueryFromAppSyncEvent, resolveGraphDBQuery } from './output.resolver.graphql.js'
import fs, { readFileSync } from "fs";
import gql from "graphql-tag";

// Initialize resolver
const schemaDataModelJSON = readFileSync('src/test/output.resolver.schema.json', 'utf-8');
let schemaModel = JSON.parse(schemaDataModelJSON);
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

// Resolver query tests
const results = [];
const queryFiles = fs.readdirSync('src/test/queries');

for (const queryFile of queryFiles) {
    const query = JSON.parse(fs.readFileSync('src/test/queries/' + queryFile));

    if (query.graphql != "") {
        const result = resolveGraphDBQuery(gql(query.graphql));
        results.push(result);
    } else {
        results.push(null);
    }
}

// Query0001
test('should return correct query for Query0001', () => {
    const result = results[1];

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

/// Query0002
test('should return correct query for Query0002', () => {
    const result = results[2];

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {_id:ID(getAirport_Airport)} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

/// Query0003
test('should return correct query for Query0003', () => {
    const result = results[3];

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

/// Query0004
test('should return correct query for Query0004', () => {
    const result = results[4];

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

/// Query0005
test('should return correct query for Query0005', () => {
    const result = results[5];

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

/// Query0006
test('should return correct query for Query0006', () => {
    const result = results[6];

    expect(result).toMatchObject({
        query: "MATCH (getAirport_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {desc2: getAirport_Airport.`desc`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

/// Query0007
test('should return correct query for Query0007', () => {
    const result = results[7];

    expect(result).toMatchObject({
        query: "MATCH (:airport{code: 'SEA'})-[:route]->(getAirportConnection_Airport:airport)-[:route]->(:airport{code:'BLQ'})\n" +
            'RETURN {city: getAirportConnection_Airport.`city`, code: getAirportConnection_Airport.`code`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

/// Query0008
test('should return correct query for Query0008', () => {
    const result = results[8];

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
            desc: 'desc2',
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

/// Query0009
test('should return correct query for Query0009', () => {
    const result = results[9];

    expect(result).toMatchObject({
        query: "g.V().hasLabel('continent').elementMap().fold()",
        language: 'gremlin',
        parameters: {},
        refactorOutput: null,
        fieldsAlias: {
            id: 'id',
            code: 'code',
            type: 'type',
            desc: 'desc',
            airportContainssOut: 'airportContainssOut',
            contains: 'contains'
        }
    });
});

/// Query0010
test('should return correct query for Query0010', () => {
    const result = results[10];

    expect(result).toMatchObject({
        query: "g.V().hasLabel('country').count()",
        language: 'gremlin',
        parameters: {},
        refactorOutput: null,
        fieldsAlias: {}
    });
});

/// Query0011
test('should return correct query for Query0011', () => {
    const result = results[11];

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`{code: $getNodeAirport_Airport_code})\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

/// Query0012
test('should return correct query for Query0012', () => {
    const result = results[12];

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

/// Query0013
test('should return correct query for Query0013', () => {
    const result = results[13];

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

/// Query0014
test('should return correct query for Query0014', () => {
    const result = results[14];

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

/// Query0015
test('should return correct query for Query0015', () => {
    const result = results[15];

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

/// Query0016
test('should return correct query for Query0016', () => {
    const result = results[16];

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

/// Query0017
test('should return correct query for Query0017', () => {
    const result = results[17];

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`) WHERE ID(getNodeAirport_Airport) = $getNodeAirport_Airport_whereId\n' +
            'RETURN {city: getNodeAirport_Airport.`city`} LIMIT 1',
        parameters: { getNodeAirport_Airport_whereId: '22' },
        language: 'opencypher',
        refactorOutput: null
    });
});

/// Query0018
test('should return correct query for Query0018', () => {
    const result = results[18];

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirports_Airport:`airport`{code: $getNodeAirports_Airport_code})\n' +
            'WITH getNodeAirports_Airport LIMIT 1\n' +
            'RETURN collect({city: getNodeAirports_Airport.`city`})[..1]',
        parameters: { getNodeAirports_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

/// Query0019
test('should return correct query for Query0019', () => {
    const result = results[19];

    expect(result).toMatchObject({
        query: 'MATCH (getNodeAirport_Airport:`airport`{code: $getNodeAirport_Airport_code})\n' +
            'RETURN {_id:ID(getNodeAirport_Airport), city: getNodeAirport_Airport.`city`, elev: getNodeAirport_Airport.`elev`, runways: getNodeAirport_Airport.`runways`, lat: getNodeAirport_Airport.`lat`, lon: getNodeAirport_Airport.`lon`} LIMIT 1',
        parameters: { getNodeAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

/// Query0020
test('should return correct query for Query0020', () => {
    const result = results[20];

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

// Query0021
test('should return correct query for Query0021', () => {
    const result = results[21];

    expect(result).toMatchObject({
        query: 'MATCH (getNodeContinents_Continent:`continent`)\n' +
            'RETURN collect({code: getNodeContinents_Continent.`code`, desc: getNodeContinents_Continent.`desc`})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0022
test('should return correct query for Query0022', () => {
    const result = results[22];

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
