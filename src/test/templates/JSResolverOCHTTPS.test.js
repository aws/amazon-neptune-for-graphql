import { initSchema, resolveGraphDBQueryFromAppSyncEvent, resolveGraphDBQuery, resolveGraphDBQueryFromEvent } from '../../../templates/JSResolverOCHTTPS.js'
import {readFileSync} from "fs";
import {schemaParser} from "../../schemaParser.js";
import {validatedSchemaModel} from "../../schemaModelValidator.js";
import {injectAwsScalarDefinitions} from "../../../templates/util.mjs";
import { gql } from "graphql-tag";
import { jest } from "@jest/globals";

beforeAll(() => {
    // Initialize resolver
    const airportsGraphQL = readFileSync('src/test/airports.customized.graphql', 'utf-8');

    let schemaDataModel = schemaParser(airportsGraphQL);
    schemaDataModel = validatedSchemaModel(schemaDataModel, false)

    schemaDataModel = JSON.stringify(schemaDataModel, null, 2);
    const schemaModel = JSON.parse(schemaDataModel);
    injectAwsScalarDefinitions(schemaModel);
    initSchema(schemaModel);
});

afterEach(() => {
    // gql retains state which needs to be cleared after each test
    gql.resetCaches();
});

test('should resolve app sync event queries with a filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirport',
        arguments: { filter: { code: {eq: 'SEA'} } },
        selectionSetGraphQL: '{ city }'
    });
    expect(result).toEqual({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE getAirport_Airport.code = $getAirport_Airport_code\n' +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: { getAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event for query with prefix', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'airportQuery_getAirport',
        arguments: { filter: { code: {eq: 'SEA'} } },
        selectionSetGraphQL: '{ city }'
    });
    expect(result).toEqual({
        query: 'MATCH (airportQuery_getAirport_Airport:`airport`) WHERE airportQuery_getAirport_Airport.code = $airportQuery_getAirport_Airport_code\n' +
            'RETURN {city: airportQuery_getAirport_Airport.`city`} LIMIT 1',
        parameters: { airportQuery_getAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries with an empty filter object', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirport',
        arguments: { filter: {} },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirport_Airport:`airport`)\n' +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries without a filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirport',
        arguments: {},
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirport_Airport:`airport`)\n' +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries with a filter that contains numeric and string values', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { filter: { country: {eq: 'US'}, runways: 3 } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WHERE getAirports_Airport.country = $getAirports_Airport_country AND getAirports_Airport.runways = $getAirports_Airport_runways\n' +
            'RETURN collect({city: getAirports_Airport.`city`})',
        parameters: { getAirports_Airport_country: 'US',  getAirports_Airport_runways: 3},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries with a string id filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirport',
        arguments: { filter: { _id: '22' } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE ID(getAirport_Airport) = $getAirport_Airport__id\n' +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: { getAirport_Airport__id: '22'},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event queries with an integer id filter', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirport',
        arguments: { filter: { _id: 22 } },
        selectionSetGraphQL: '{ city }'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE ID(getAirport_Airport) = $getAirport_Airport__id\n' +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: { getAirport_Airport__id: '22'},
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
        field: 'getAirports',
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
        query: "MATCH (getAirports_Airport:`airport`) " +
            "WHERE getAirports_Airport.country = $getAirports_Airport_country " +
            "WITH getAirports_Airport LIMIT 6\n" +
            "OPTIONAL MATCH (getAirports_Airport)-[`getAirports_Airport_airportRoutesOut_route`:`route`]->(getAirports_Airport_airportRoutesOut:`airport`) " +
            "WHERE getAirports_Airport_airportRoutesOut.country STARTS WITH $getAirports_Airport_airportRoutesOut_country\n" +
            "WITH getAirports_Airport, " +
            "CASE WHEN getAirports_Airport_airportRoutesOut IS NULL THEN [] " +
            "ELSE COLLECT({_id:ID(getAirports_Airport_airportRoutesOut), city: getAirports_Airport_airportRoutesOut.`city`, code: getAirports_Airport_airportRoutesOut.`code`})[..2] " +
            "END AS getAirports_Airport_airportRoutesOut_collect\n" +
            "RETURN collect({_id:ID(getAirports_Airport), city: getAirports_Airport.`city`, code: getAirports_Airport.`code`, airportRoutesOut: getAirports_Airport_airportRoutesOut_collect})[..6]",
        parameters: {
            "getAirports_Airport_country": "CA",
            "getAirports_Airport_airportRoutesOut_country": "M"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event with sort arguments as a list', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { sort: [{ desc: 'ASC' }, { code: 'DESC' }, { city: 'DESC' }] },
        selectionSetGraphQL: '{\n  desc\n  code\n  city\n}'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`)' +
            ' WITH getAirports_Airport' +
            ' ORDER BY getAirports_Airport.desc ASC, getAirports_Airport.code DESC, getAirports_Airport.city DESC\n' +
            'RETURN collect({desc: getAirports_Airport.`desc`, code: getAirports_Airport.`code`, city: getAirports_Airport.`city`})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event with nested sort arguments', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { sort: [{desc: 'ASC'}, {code: 'DESC'}] },
        variables: {},
        selectionSetGraphQL: '{\n' +
            '  desc\n' +
            '  code\n' +
            '  airportRoutesIn(sort: [{country : ASC}, {city : DESC}]) {\n' +
            '    country\n' +
            '    city\n' +
            '  }\n' +
            '}'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport ORDER BY getAirports_Airport.desc ASC, getAirports_Airport.code DESC\n' +
            'OPTIONAL MATCH (getAirports_Airport)<-[`getAirports_Airport_airportRoutesIn_route`:`route`]-(getAirports_Airport_airportRoutesIn:`airport`) ' +
            'WITH getAirports_Airport, getAirports_Airport_airportRoutesIn, `getAirports_Airport_airportRoutesIn_route` ORDER BY getAirports_Airport_airportRoutesIn.country ASC, getAirports_Airport_airportRoutesIn.city DESC\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesIn IS NULL THEN [] ELSE COLLECT({country: getAirports_Airport_airportRoutesIn.`country`, city: getAirports_Airport_airportRoutesIn.`city`}) END AS getAirports_Airport_airportRoutesIn_collect\n' +
            'RETURN collect({desc: getAirports_Airport.`desc`, code: getAirports_Airport.`code`, airportRoutesIn: getAirports_Airport_airportRoutesIn_collect})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event with nested sort arguments and variables', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { options: { limit: 1 }, sort: [ { country: 'ASC' }, { city: 'ASC' } ] },
        variables: {
            nestedOptions: { limit: 1 },
            nestedSort: [ { country: 'DESC'}, { code: 'DESC' } ]
        },
        selectionSetGraphQL: '{\n' +
            '  _id\n' +
            '  city\n' +
            '  code\n' +
            '  country\n' +
            '  airportRoutesIn(options: $nestedOptions, sort: $nestedSort) {\n' +
            '    _id\n' +
            '    city\n' +
            '    code\n' +
            '    country\n' +
            '  }\n' +
            '}'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport ORDER BY getAirports_Airport.country ASC, getAirports_Airport.city ASC LIMIT 1\n' +
            'OPTIONAL MATCH (getAirports_Airport)<-[`getAirports_Airport_airportRoutesIn_route`:`route`]-(getAirports_Airport_airportRoutesIn:`airport`) ' +
            'WITH getAirports_Airport, getAirports_Airport_airportRoutesIn, `getAirports_Airport_airportRoutesIn_route` ORDER BY getAirports_Airport_airportRoutesIn.country DESC, getAirports_Airport_airportRoutesIn.code DESC\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesIn IS NULL THEN [] ELSE COLLECT({_id:ID(getAirports_Airport_airportRoutesIn), city: getAirports_Airport_airportRoutesIn.`city`, code: getAirports_Airport_airportRoutesIn.`code`, country: getAirports_Airport_airportRoutesIn.`country`})[..1] END AS getAirports_Airport_airportRoutesIn_collect\n' +
            'RETURN collect({_id:ID(getAirports_Airport), city: getAirports_Airport.`city`, code: getAirports_Airport.`code`, country: getAirports_Airport.`country`, airportRoutesIn: getAirports_Airport_airportRoutesIn_collect})[..1]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event with nested sort and nested selection', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: {},
        variables: {
            nestedSort: [ { country: 'DESC'} ]
        },
        selectionSetGraphQL: '{\n' +
            '  code\n' +
            '  airportRoutesIn(sort: $nestedSort) {\n' +
            '    code\n' +
            '    route {\n' +
            '       dist\n' +
            '    }\n' +
            '  }\n' +
            '}'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`)\n' +
            'OPTIONAL MATCH (getAirports_Airport)<-[`getAirports_Airport_airportRoutesIn_route`:`route`]-(getAirports_Airport_airportRoutesIn:`airport`) ' +
            'WITH getAirports_Airport, getAirports_Airport_airportRoutesIn, `getAirports_Airport_airportRoutesIn_route` ' +
            'ORDER BY getAirports_Airport_airportRoutesIn.country DESC\n' +
            'WITH getAirports_Airport, getAirports_Airport_airportRoutesIn, {dist: getAirports_Airport_airportRoutesIn_route.`dist`} AS getAirports_Airport_airportRoutesIn_route_one\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesIn IS NULL THEN [] ' +
            'ELSE COLLECT({code: getAirports_Airport_airportRoutesIn.`code`, route: getAirports_Airport_airportRoutesIn_route_one}) ' +
            'END AS getAirports_Airport_airportRoutesIn_collect\n' +
            'RETURN collect({code: getAirports_Airport.`code`, airportRoutesIn: getAirports_Airport_airportRoutesIn_collect})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event with ID field as both top-level and nested sort argument', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { sort: [ { _id: 'ASC' } ] },
        variables: {
            nestedSort: [ { _id: 'DESC'} ]
        },
        selectionSetGraphQL: '{\n' +
            '  _id\n' +
            '  airportRoutesIn(sort: $nestedSort) {\n' +
            '    _id\n' +
            '  }\n' +
            '}'
    });

    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport ORDER BY ID(getAirports_Airport) ASC\n' +
            'OPTIONAL MATCH (getAirports_Airport)<-[`getAirports_Airport_airportRoutesIn_route`:`route`]-(getAirports_Airport_airportRoutesIn:`airport`) ' +
            'WITH getAirports_Airport, getAirports_Airport_airportRoutesIn, `getAirports_Airport_airportRoutesIn_route` ORDER BY ID(getAirports_Airport_airportRoutesIn) DESC\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesIn IS NULL THEN [] ELSE COLLECT({_id:ID(getAirports_Airport_airportRoutesIn)}) END AS getAirports_Airport_airportRoutesIn_collect\n' +
            'RETURN collect({_id:ID(getAirports_Airport), airportRoutesIn: getAirports_Airport_airportRoutesIn_collect})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve app sync event with AWS AppSync scalars as field types', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getCountry',
        arguments: {},
        variables: {},
        selectionSetGraphQL: '{\n' +
            '  createdTimestamp\n' +
            '  emergencyLine\n' +
            '  foundingDate\n' +
            '  gatewayIp\n' +
            '  governmentSite\n' +
            '  localOfficeTime\n' +
            '  metadataJson\n' +
            '  officialEmail\n' +
            '  updatedAt\n' +
            '}',
        source: null
    });

    expect(result).toEqual({
        query: 'MATCH (getCountry_Country:`country`)\n' +
            'RETURN {createdTimestamp: getCountry_Country.`createdTimestamp`, ' +
            'emergencyLine: getCountry_Country.`emergencyLine`, ' +
            'foundingDate: getCountry_Country.`foundingDate`, ' +
            'gatewayIp: getCountry_Country.`gatewayIp`, ' +
            'governmentSite: getCountry_Country.`governmentSite`, ' +
            'localOfficeTime: getCountry_Country.`localOfficeTime`, ' +
            'metadataJson: getCountry_Country.`metadataJson`, ' +
            'officialEmail: getCountry_Country.`officialEmail`, ' +
            'updatedAt: getCountry_Country.`updatedAt`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Resolver Query Tests

// Query0001
test('should inference query from return type (Query0001)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirportByCode(code: \"SEA\") {\n city \n }\n}'});

    expect(result).toMatchObject({
        query: "MATCH (getAirportByCode_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {city: getAirportByCode_Airport.`city`} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0002
test('should get neptune_id (Query0002)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirportByCode(code: \"SEA\") {\n _id\n }\n }'});

    expect(result).toMatchObject({
        query: "MATCH (getAirportByCode_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {_id:ID(getAirportByCode_Airport)} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0003
test('should inference query with nested types single and array, references in and out (Query0003)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirportByCode(code: \"YKM\") {\n city\n continentContainsIn {\n desc\n }\n countryContainsIn {\n desc\n }\n airportRoutesOut {\n code\n }\n }\n }'});

    expect(result).toMatchObject({
        query: "MATCH (getAirportByCode_Airport:`airport`{code:'YKM'})\n" +
            'OPTIONAL MATCH (getAirportByCode_Airport)<-[`getAirportByCode_Airport_continentContainsIn_contains`:`contains`]-(getAirportByCode_Airport_continentContainsIn:`continent`)\n' +
            'OPTIONAL MATCH (getAirportByCode_Airport)<-[`getAirportByCode_Airport_countryContainsIn_contains`:`contains`]-(getAirportByCode_Airport_countryContainsIn:`country`)\n' +
            'OPTIONAL MATCH (getAirportByCode_Airport)-[`getAirportByCode_Airport_airportRoutesOut_route`:`route`]->(getAirportByCode_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getAirportByCode_Airport, getAirportByCode_Airport_continentContainsIn, getAirportByCode_Airport_countryContainsIn, CASE WHEN getAirportByCode_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({code: getAirportByCode_Airport_airportRoutesOut.`code`}) END AS getAirportByCode_Airport_airportRoutesOut_collect\n' +
            'WITH getAirportByCode_Airport, getAirportByCode_Airport_continentContainsIn, getAirportByCode_Airport_airportRoutesOut_collect, {desc: getAirportByCode_Airport_countryContainsIn.`desc`} AS getAirportByCode_Airport_countryContainsIn_one\n' +
            'WITH getAirportByCode_Airport, getAirportByCode_Airport_countryContainsIn_one, getAirportByCode_Airport_airportRoutesOut_collect, {desc: getAirportByCode_Airport_continentContainsIn.`desc`} AS getAirportByCode_Airport_continentContainsIn_one\n' +
            'RETURN {city: getAirportByCode_Airport.`city`, continentContainsIn: getAirportByCode_Airport_continentContainsIn_one, countryContainsIn: getAirportByCode_Airport_countryContainsIn_one, airportRoutesOut: getAirportByCode_Airport_airportRoutesOut_collect} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0004
test('should get edge properties in nested array (Query0004)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirportByCode(code: \"SEA\") {\n airportRoutesOut {\n code\n route {\n dist\n }\n }\n }\n }\n'});

    expect(result).toMatchObject({
        query: "MATCH (getAirportByCode_Airport:`airport`{code:'SEA'})\n" +
            'OPTIONAL MATCH (getAirportByCode_Airport)-[`getAirportByCode_Airport_airportRoutesOut_route`:`route`]->(getAirportByCode_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getAirportByCode_Airport, getAirportByCode_Airport_airportRoutesOut, {dist: getAirportByCode_Airport_airportRoutesOut_route.`dist`} AS getAirportByCode_Airport_airportRoutesOut_route_one\n' +
            'WITH getAirportByCode_Airport, CASE WHEN getAirportByCode_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({code: getAirportByCode_Airport_airportRoutesOut.`code`, route: getAirportByCode_Airport_airportRoutesOut_route_one}) END AS getAirportByCode_Airport_airportRoutesOut_collect\n' +
            'RETURN {airportRoutesOut: getAirportByCode_Airport_airportRoutesOut_collect} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0005
test('should return type with graph query returning a scalar (Query0005)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirportByCode(code: \"SEA\") {\n outboundRoutesCount\n }\n }\n'});

    expect(result).toMatchObject({
        query: "MATCH (getAirportByCode_Airport:`airport`{code:'SEA'})\n" +
            'OPTIONAL MATCH (getAirportByCode_Airport)-[getAirportByCode_Airport_outboundRoutesCount_r:route]->(getAirportByCode_Airport_outboundRoutesCount_a)\n' +
            'WITH getAirportByCode_Airport, count(getAirportByCode_Airport_outboundRoutesCount_r) AS getAirportByCode_Airport_outboundRoutesCount\n' +
            'RETURN {outboundRoutesCount:getAirportByCode_Airport_outboundRoutesCount} LIMIT 1',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0006
test('should map type name to different graph db property name (Query0006)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirportByCode(code: \"SEA\") {\n desc\n }\n }\n'});

    expect(result).toMatchObject({
        query: "MATCH (getAirportByCode_Airport:`airport`{code:'SEA'})\n" +
            'RETURN {desc: getAirportByCode_Airport.`desc`} LIMIT 1',
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
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(filter: {code: {eq: \"SEA\"}}) {\n city \n }\n}'});

    expect(result).toMatchObject({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE getAirport_Airport.code = $getAirport_Airport_code\n' +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: { getAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0012
test('should apply limit to results returned from a nested edge (Query0012)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(filter: {code: {eq: \"SEA\"}}) {\n airportRoutesOut(options: {limit: 2}) {\n code\n }\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE getAirport_Airport.code = $getAirport_Airport_code\n' +
            'OPTIONAL MATCH (getAirport_Airport)-[`getAirport_Airport_airportRoutesOut_route`:`route`]->(getAirport_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getAirport_Airport, CASE WHEN getAirport_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({code: getAirport_Airport_airportRoutesOut.`code`})[..2] END AS getAirport_Airport_airportRoutesOut_collect\n' +
            'RETURN {airportRoutesOut: getAirport_Airport_airportRoutesOut_collect} LIMIT 1',
        parameters: { getAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0013
test('should inference query with filter in nested edge (Query0013)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(filter: {code: {eq: \"SEA\"}}) {\n airportRoutesOut(filter: {code: {eq: \"LAX\"}}) {\n city\n }\n city\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE getAirport_Airport.code = $getAirport_Airport_code\n' +
            'OPTIONAL MATCH (getAirport_Airport)-[`getAirport_Airport_airportRoutesOut_route`:`route`]->(getAirport_Airport_airportRoutesOut:`airport`) WHERE getAirport_Airport_airportRoutesOut.code = $getAirport_Airport_airportRoutesOut_code\n' +
            'WITH getAirport_Airport, CASE WHEN getAirport_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({city: getAirport_Airport_airportRoutesOut.`city`}) END AS getAirport_Airport_airportRoutesOut_collect\n' +
            'RETURN {airportRoutesOut: getAirport_Airport_airportRoutesOut_collect, city: getAirport_Airport.`city`} LIMIT 1',
        parameters: {
            getAirport_Airport_code: 'SEA',
            getAirport_Airport_airportRoutesOut_code: 'LAX'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0014
test('should inference query using field graphQuery outboundRoutesCount (Query0014)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(filter: {code: {eq: \"SEA\"}}) {\n outboundRoutesCount\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE getAirport_Airport.code = $getAirport_Airport_code\n' +
            'OPTIONAL MATCH (getAirport_Airport)-[getAirport_Airport_outboundRoutesCount_r:route]->(getAirport_Airport_outboundRoutesCount_a)\n' +
            'WITH getAirport_Airport, count(getAirport_Airport_outboundRoutesCount_r) AS getAirport_Airport_outboundRoutesCount\n' +
            'RETURN {outboundRoutesCount:getAirport_Airport_outboundRoutesCount} LIMIT 1',
        parameters: { getAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0015
test('should inference query with mutation create node (Query0015)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'mutation MyMutation {\n createAirport(input: {code: \"NAX\", city: \"Reggio Emilia\"}) {\n code\n }\n }'});

    expect(result).toMatchObject({
        query: 'CREATE (createAirport_Airport:`airport` {code: $createAirport_Airport_code, city: $createAirport_Airport_city})\n' +
            'RETURN {code: createAirport_Airport.`code`}',
        parameters: {
            createAirport_Airport_code: 'NAX',
            createAirport_Airport_city: 'Reggio Emilia'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0016
test('should inference query with mutation update node (Query0016)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'mutation MyMutation {\n updateAirport(input: {_id: \"22\", city: \"Seattle\"}) {\n city\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (updateAirport_Airport)\n' +
            'WHERE ID(updateAirport_Airport) = $updateAirport_Airport__id\n' +
            'SET updateAirport_Airport.city = $updateAirport_Airport_city\n' +
            'RETURN {city: updateAirport_Airport.`city`}',
        parameters: {
            updateAirport_Airport_city: 'Seattle',
            updateAirport_Airport__id: '22'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should inference query with mutation update node from event', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'updateAirport',
        arguments: {input: {_id: "22", city: "Seattle"}},
        selectionSet: gql`{ city }`.definitions[0].selectionSet,
        fragments: {}
    });
    expect(result).toMatchObject({
        query: 'MATCH (updateAirport_Airport)\n' +
            'WHERE ID(updateAirport_Airport) = $updateAirport_Airport__id\n' +
            'SET updateAirport_Airport.city = $updateAirport_Airport_city\n' +
            'RETURN {city: updateAirport_Airport.`city`}',
        parameters: {
            updateAirport_Airport_city: 'Seattle',
            updateAirport_Airport__id: '22'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to connect nodes', () => {
    const query = 'mutation ConnectCountryToAirport {\n' +
        '  connectCountryToAirportThroughContains(from_id: \"ee71c547-ea32-4573-88bc-6ecb31942a1e\", to_id: \"99cb3321-9cda-41b6-b760-e88ead3e1ea1\") {\n' +
        '    _id\n' +
        '  }\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from), (to)\n' +
            'WHERE ID(from) = $connectCountryToAirportThroughContains_Contains_whereFromId ' +
            'AND ID(to) = $connectCountryToAirportThroughContains_Contains_whereToId\n' +
            'CREATE (from)-[connectCountryToAirportThroughContains_Contains:`contains`]->(to)\n' +
            'RETURN {_id:ID(connectCountryToAirportThroughContains_Contains)}',
        parameters: {
            connectCountryToAirportThroughContains_Contains_whereFromId: 'ee71c547-ea32-4573-88bc-6ecb31942a1e',
            connectCountryToAirportThroughContains_Contains_whereToId: '99cb3321-9cda-41b6-b760-e88ead3e1ea1'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to delete edge between nodes', () => {
    const query = 'mutation DeleteContainsConnectionFromCountryToAirport {\n' +
        '  deleteContainsConnectionFromCountryToAirport(from_id: \"ee71c547-ea32-4573-88bc-6ecb31942a1e\", to_id: \"99cb3321-9cda-41b6-b760-e88ead3e1ea1\")\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from)-[deleteContainsConnectionFromCountryToAirport_Boolean]->(to)\n' +
            'WHERE ID(from) = $deleteContainsConnectionFromCountryToAirport_Boolean_whereFromId ' +
            'AND ID(to) = $deleteContainsConnectionFromCountryToAirport_Boolean_whereToId\n' +
            'DELETE deleteContainsConnectionFromCountryToAirport_Boolean\n' +
            'RETURN true',
        parameters: {
            deleteContainsConnectionFromCountryToAirport_Boolean_whereFromId: 'ee71c547-ea32-4573-88bc-6ecb31942a1e',
            deleteContainsConnectionFromCountryToAirport_Boolean_whereToId: '99cb3321-9cda-41b6-b760-e88ead3e1ea1'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to update edge between nodes', () => {
    const query = 'mutation UpdateRouteConnectionFromAirportToAirport {\n' +
        '  updateRouteConnectionFromAirportToAirport(from_id: \"99\", to_id: \"48\", edge: { dist: 123 }) {\n' +
        '    _id\n' +
        '    dist\n' +
        '  }\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from)-[updateRouteConnectionFromAirportToAirport_Route:`route`]->(to)\n' +
            'WHERE ID(from) = $updateRouteConnectionFromAirportToAirport_Route_whereFromId ' +
            'AND ID(to) = $updateRouteConnectionFromAirportToAirport_Route_whereToId\n' +
            'SET updateRouteConnectionFromAirportToAirport_Route.dist = $updateRouteConnectionFromAirportToAirport_Route_dist\n' +
            'RETURN {_id:ID(updateRouteConnectionFromAirportToAirport_Route), dist: updateRouteConnectionFromAirportToAirport_Route.`dist`}',
        parameters: {
            updateRouteConnectionFromAirportToAirport_Route_whereFromId: '99',
            updateRouteConnectionFromAirportToAirport_Route_whereToId: '48',
            updateRouteConnectionFromAirportToAirport_Route_dist: 123
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0017
test('should inference query using _id as filter (Query0017)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(filter: {_id: \"22\"}) {\n city\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE ID(getAirport_Airport) = $getAirport_Airport__id\n' +
            'RETURN {city: getAirport_Airport.`city`} LIMIT 1',
        parameters: { getAirport_Airport__id: '22' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0018
test('should control number of result using limit option (Query0018)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirports(options: {limit: 1}, filter: {code: {eq: \"SEA\"}}) {\n city }\n }'});
    expect(result).toMatchObject({
        query: 'MATCH (getAirports_Airport:`airport`) WHERE getAirports_Airport.code = $getAirports_Airport_code WITH getAirports_Airport LIMIT 1\n' +
            'RETURN collect({city: getAirports_Airport.`city`})[..1]',
        parameters: { getAirports_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0019
test('should resolve query that gets multiple different type of fields (Query0019)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirport(filter: {code: {eq: \"SEA\"}}) {\n _id\n city\n elev\n runways\n lat\n lon\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getAirport_Airport:`airport`) WHERE getAirport_Airport.code = $getAirport_Airport_code\n' +
            'RETURN {_id:ID(getAirport_Airport), city: getAirport_Airport.`city`, elev: getAirport_Airport.`elev`, runways: getAirport_Airport.`runways`, lat: getAirport_Airport.`lat`, lon: getAirport_Airport.`lon`} LIMIT 1',
        parameters: { getAirport_Airport_code: 'SEA' },
        language: 'opencypher',
        refactorOutput: null
    });
});

// Query0020
test('should filter by parameter with numeric value and return mix of numeric value types (Query0020)', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getAirports(filter: { city: {eq: \"Seattle\"}, runways: 3 }) {\n code\n lat\n lon\n elev\n}\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (getAirports_Airport:`airport`) WHERE getAirports_Airport.city = $getAirports_Airport_city AND getAirports_Airport.runways = $getAirports_Airport_runways\n' +
            'RETURN collect({code: getAirports_Airport.`code`, lat: getAirports_Airport.`lat`, lon: getAirports_Airport.`lon`, elev: getAirports_Airport.`elev`})',
        parameters: {
            getAirports_Airport_city: 'Seattle',
            getAirports_Airport_runways: 3
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with no parameters', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getContinents {\n code\n desc\n }\n }\n'});

    expect(result).toMatchObject({
        query: 'MATCH (getContinents_Continent:`continent`)\n' +
            'RETURN collect({code: getContinents_Continent.`code`, desc: getContinents_Continent.`desc`})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with parameters that have constant values', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'query MyQuery {\n getCountry(filter: {_id: \"3541\", code: {eq: \"CA\"}}) {\n desc\n }\n }\n'});

    expect(result).toMatchObject({
        query: 'MATCH (getCountry_Country:`country`) WHERE ID(getCountry_Country) = $getCountry_Country__id AND getCountry_Country.code = $getCountry_Country_code\n' +
            'RETURN {desc: getCountry_Country.`desc`} LIMIT 1',
        parameters: {
            getCountry_Country_code: 'CA',
            getCountry_Country__id: '3541'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with filter that uses various string comparison operators', () => {
    const query = 'query getAirports {\n' +
        '  getAirports(filter: {\n' +
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
        query: 'MATCH (getAirports_Airport:`airport`) ' +
            'WHERE getAirports_Airport.country = $getAirports_Airport_country ' +
            'AND getAirports_Airport.code STARTS WITH $getAirports_Airport_code ' +
            'AND getAirports_Airport.city ENDS WITH $getAirports_Airport_city ' +
            'AND getAirports_Airport.desc CONTAINS $getAirports_Airport_desc ' +
            'AND getAirports_Airport.runways = $getAirports_Airport_runways ' +
            'WITH getAirports_Airport LIMIT 5\n' +
            'RETURN collect({' +
            '_id:ID(getAirports_Airport), ' +
            'code: getAirports_Airport.`code`, ' +
            'city: getAirports_Airport.`city`, ' +
            'country: getAirports_Airport.`country`, ' +
            'runways: getAirports_Airport.`runways`, ' +
            'desc: getAirports_Airport.`desc`' +
            '})[..5]',
        parameters: {
            getAirports_Airport_city: "n",
            getAirports_Airport_code: "Y",
            getAirports_Airport_country: "CA",
            getAirports_Airport_runways: 3,
            getAirports_Airport_desc: "Airport"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge filter that uses string comparison operator', () => {
    const query = 'query getAirports {\n' +
        '  getAirports(filter:  {\n' +
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
        query: 'MATCH (getAirports_Airport:`airport`) ' +
            'WHERE getAirports_Airport.country = $getAirports_Airport_country ' +
            'WITH getAirports_Airport LIMIT 5\n' +
            'OPTIONAL MATCH (getAirports_Airport)-[`getAirports_Airport_airportRoutesOut_route`:`route`]->(getAirports_Airport_airportRoutesOut:`airport`) ' +
            'WHERE getAirports_Airport_airportRoutesOut.country STARTS WITH $getAirports_Airport_airportRoutesOut_country ' +
            'AND getAirports_Airport_airportRoutesOut.code CONTAINS $getAirports_Airport_airportRoutesOut_code\n' +
            'WITH getAirports_Airport, ' +
            'CASE WHEN getAirports_Airport_airportRoutesOut IS NULL THEN [] ' +
            'ELSE COLLECT({' +
            '_id:ID(getAirports_Airport_airportRoutesOut), ' +
            'code: getAirports_Airport_airportRoutesOut.`code`, ' +
            'city: getAirports_Airport_airportRoutesOut.`city`, ' +
            'country: getAirports_Airport_airportRoutesOut.`country`' +
            '})[..3] ' +
            'END AS getAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({' +
            '_id:ID(getAirports_Airport), ' +
            'code: getAirports_Airport.`code`, ' +
            'city: getAirports_Airport.`city`, ' +
            'country: getAirports_Airport.`country`, ' +
            'airportRoutesOut: getAirports_Airport_airportRoutesOut_collect' +
            '})[..5]',
        parameters: {
            getAirports_Airport_country: "CA",
            getAirports_Airport_airportRoutesOut_code: "M",
            getAirports_Airport_airportRoutesOut_country: "M"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge filter and variables', () => {
    const query = 'query getAirports($filter: AirportInput, $options: Options, $nestedFilter: AirportInput, $nestedOptions: Options) {\n' +
        '  getAirports(filter: $filter, options: $options) {\n' +
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
        query: 'MATCH (getAirports_Airport:`airport`) ' +
            'WHERE getAirports_Airport.country = $getAirports_Airport_country ' +
            'WITH getAirports_Airport LIMIT 6\n' +
            'OPTIONAL MATCH (getAirports_Airport)-[`getAirports_Airport_airportRoutesOut_route`:`route`]->(getAirports_Airport_airportRoutesOut:`airport`) ' +
            'WHERE getAirports_Airport_airportRoutesOut.country STARTS WITH $getAirports_Airport_airportRoutesOut_country\n' +
            'WITH getAirports_Airport, ' +
            'CASE WHEN getAirports_Airport_airportRoutesOut IS NULL THEN [] ' +
            'ELSE COLLECT({' +
            '_id:ID(getAirports_Airport_airportRoutesOut), ' +
            'city: getAirports_Airport_airportRoutesOut.`city`, ' +
            'code: getAirports_Airport_airportRoutesOut.`code`' +
            '})[..2] ' +
            'END AS getAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({' +
            '_id:ID(getAirports_Airport), ' +
            'city: getAirports_Airport.`city`, ' +
            'code: getAirports_Airport.`code`, ' +
            'airportRoutesOut: getAirports_Airport_airportRoutesOut_collect' +
            '})[..6]',
        parameters: {
            getAirports_Airport_country: "CA",
            getAirports_Airport_airportRoutesOut_country: "M"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge filter and nested scalar variables', () => {
    const query = 'query getAirports($filter: AirportInput, $options: Options, $nestedFilter: AirportInput, $nestedOptions: Options) {\n' +
        '  getAirports(filter: {country: {eq: $country}}, options: {limit: $limit}) {\n' +
        '    code\n' +
        '    airportRoutesOut(filter: {country: {eq: $country}}, options: {limit: $limit}) {\n' +
        '      code\n' +
        '    }\n' +
        '  }\n' +
        '}';
    const variables = {
        "country": "CA",
        "limit": 6
    }
    const result = resolveGraphDBQuery({queryObjOrStr: query, variables: variables});

    expect(result).toMatchObject({
        query: 'MATCH (getAirports_Airport:`airport`) ' +
            'WHERE getAirports_Airport.country = $getAirports_Airport_country ' +
            'WITH getAirports_Airport LIMIT 6\n' +
            'OPTIONAL MATCH (getAirports_Airport)-[`getAirports_Airport_airportRoutesOut_route`:`route`]->(getAirports_Airport_airportRoutesOut:`airport`) ' +
            'WHERE getAirports_Airport_airportRoutesOut.country = $getAirports_Airport_airportRoutesOut_country\n' +
            'WITH getAirports_Airport, ' +
            'CASE WHEN getAirports_Airport_airportRoutesOut IS NULL THEN [] ' +
            'ELSE COLLECT({' +
            'code: getAirports_Airport_airportRoutesOut.`code`' +
            '})[..6] ' +
            'END AS getAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({' +
            'code: getAirports_Airport.`code`, ' +
            'airportRoutesOut: getAirports_Airport_airportRoutesOut_collect' +
            '})[..6]',
        parameters: {
            getAirports_Airport_country: "CA",
            getAirports_Airport_airportRoutesOut_country: "CA"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve custom mutation with @graphQuery directive and $input parameter', () => {
    const query = 'mutation MyMutation {\n' +
        '  createAirportCustom(\n' +
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
        query: 'CREATE (createAirportCustom_Airport:airport {' +
            'city: $createAirportCustom_Airport_city, ' +
            'code: $createAirportCustom_Airport_code, ' +
            'country: $createAirportCustom_Airport_country, ' +
            'desc: $createAirportCustom_Airport_desc})\n' +
            'RETURN {' +
            '_id:ID(createAirportCustom_Airport), ' +
            'city: createAirportCustom_Airport.`city`, ' +
            'code: createAirportCustom_Airport.`code`, ' +
            'country: createAirportCustom_Airport.`country`' +
            '}',
        parameters: {
            createAirportCustom_Airport_city: "Test",
            createAirportCustom_Airport_code: "TEST",
            createAirportCustom_Airport_country: "CA",
            createAirportCustom_Airport_desc: "Test Airport"
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should inference create mutation with a prefix', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'mutation MyMutation {\n airportMutation_createAirport(input: {code: \"NAX\", city: \"Reggio Emilia\"}) {\n code\n }\n }'});

    expect(result).toMatchObject({
        query: 'CREATE (airportMutation_createAirport_Airport:`airport` {code: $airportMutation_createAirport_Airport_code, city: $airportMutation_createAirport_Airport_city})\n' +
            'RETURN {code: airportMutation_createAirport_Airport.`code`}',
        parameters: {
            airportMutation_createAirport_Airport_code: 'NAX',
            airportMutation_createAirport_Airport_city: 'Reggio Emilia'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should inference update mutation with a prefix', () => {
    const result = resolveGraphDBQuery({queryObjOrStr: 'mutation MyMutation {\n airportMutation_updateAirport(input: {_id: \"22\", city: \"Seattle\"}) {\n city\n }\n }'});

    expect(result).toMatchObject({
        query: 'MATCH (airportMutation_updateAirport_Airport)\n' +
            'WHERE ID(airportMutation_updateAirport_Airport) = $airportMutation_updateAirport_Airport__id\n' +
            'SET airportMutation_updateAirport_Airport.city = $airportMutation_updateAirport_Airport_city\n' +
            'RETURN {city: airportMutation_updateAirport_Airport.`city`}',
        parameters: {
            airportMutation_updateAirport_Airport_city: 'Seattle',
            airportMutation_updateAirport_Airport__id: '22'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to connect nodes with a prefix', () => {
    const query = 'mutation ConnectCountryToAirport {\n' +
        '  airportMutation_connectCountryToAirportThroughContains(from_id: \"ee71c547-ea32-4573-88bc-6ecb31942a1e\", to_id: \"99cb3321-9cda-41b6-b760-e88ead3e1ea1\") {\n' +
        '    _id\n' +
        '  }\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from), (to)\n' +
            'WHERE ID(from) = $airportMutation_connectCountryToAirportThroughContains_Contains_whereFromId ' +
            'AND ID(to) = $airportMutation_connectCountryToAirportThroughContains_Contains_whereToId\n' +
            'CREATE (from)-[airportMutation_connectCountryToAirportThroughContains_Contains:`contains`]->(to)\n' +
            'RETURN {_id:ID(airportMutation_connectCountryToAirportThroughContains_Contains)}',
        parameters: {
            airportMutation_connectCountryToAirportThroughContains_Contains_whereFromId: 'ee71c547-ea32-4573-88bc-6ecb31942a1e',
            airportMutation_connectCountryToAirportThroughContains_Contains_whereToId: '99cb3321-9cda-41b6-b760-e88ead3e1ea1'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to delete connection between nodes with a prefix', () => {
    const query = 'mutation DeleteContainsConnectionFromCountryToAirport {\n' +
        '  airportMutation_deleteContainsConnectionFromCountryToAirport(from_id: \"ee71c547-ea32-4573-88bc-6ecb31942a1e\", to_id: \"99cb3321-9cda-41b6-b760-e88ead3e1ea1\")\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from)-[airportMutation_deleteContainsConnectionFromCountryToAirport_Boolean]->(to)\n' +
            'WHERE ID(from) = $airportMutation_deleteContainsConnectionFromCountryToAirport_Boolean_whereFromId ' +
            'AND ID(to) = $airportMutation_deleteContainsConnectionFromCountryToAirport_Boolean_whereToId\n' +
            'DELETE airportMutation_deleteContainsConnectionFromCountryToAirport_Boolean\n' +
            'RETURN true',
        parameters: {
            airportMutation_deleteContainsConnectionFromCountryToAirport_Boolean_whereFromId: 'ee71c547-ea32-4573-88bc-6ecb31942a1e',
            airportMutation_deleteContainsConnectionFromCountryToAirport_Boolean_whereToId: '99cb3321-9cda-41b6-b760-e88ead3e1ea1'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to update connection between nodes with a prefix', () => {
    const query = 'mutation UpdateRouteConnectionFromAirportToAirport {\n' +
        '  airportMutation_updateRouteConnectionFromAirportToAirport(from_id: \"99\", to_id: \"48\", edge: { dist: 123 }) {\n' +
        '    _id\n' +
        '    dist\n' +
        '  }\n' +
        '}';
    const result = resolveGraphDBQuery({queryObjOrStr: query});

    expect(result).toMatchObject({
        query: 'MATCH (from)-[airportMutation_updateRouteConnectionFromAirportToAirport_Route:`route`]->(to)\n' +
            'WHERE ID(from) = $airportMutation_updateRouteConnectionFromAirportToAirport_Route_whereFromId ' +
            'AND ID(to) = $airportMutation_updateRouteConnectionFromAirportToAirport_Route_whereToId\n' +
            'SET airportMutation_updateRouteConnectionFromAirportToAirport_Route.dist = $airportMutation_updateRouteConnectionFromAirportToAirport_Route_dist\n' +
            'RETURN {_id:ID(airportMutation_updateRouteConnectionFromAirportToAirport_Route), dist: airportMutation_updateRouteConnectionFromAirportToAirport_Route.`dist`}',
        parameters: {
            airportMutation_updateRouteConnectionFromAirportToAirport_Route_whereFromId: '99',
            airportMutation_updateRouteConnectionFromAirportToAirport_Route_whereToId: '48',
            airportMutation_updateRouteConnectionFromAirportToAirport_Route_dist: 123
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with special characters in edge label', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getVersions',
        arguments: {},
        selectionSetGraphQL: '{ _id date desc dataSourcePulled_cn_fromOut(sort: [{ name: ASC }]) { _id name type } }'
    });

    expect(result).toEqual({
        query: 'MATCH (getVersions_Version:`version`)\n' +
            'OPTIONAL MATCH (getVersions_Version)-[`getVersions_Version_dataSourcePulled_cn_fromOut_pulled:From`:`pulled:From`]->(getVersions_Version_dataSourcePulled_cn_fromOut:`dataSource`) WITH getVersions_Version, getVersions_Version_dataSourcePulled_cn_fromOut, `getVersions_Version_dataSourcePulled_cn_fromOut_pulled:From` ORDER BY getVersions_Version_dataSourcePulled_cn_fromOut.name ASC\n' +
            'WITH getVersions_Version, CASE WHEN getVersions_Version_dataSourcePulled_cn_fromOut IS NULL THEN [] ELSE COLLECT({_id:ID(getVersions_Version_dataSourcePulled_cn_fromOut), name: getVersions_Version_dataSourcePulled_cn_fromOut.`name`, type: getVersions_Version_dataSourcePulled_cn_fromOut.`type`}) END AS getVersions_Version_dataSourcePulled_cn_fromOut_collect\n' +
            'RETURN collect({_id:ID(getVersions_Version), date: getVersions_Version.`date`, desc: getVersions_Version.`desc`, dataSourcePulled_cn_fromOut: getVersions_Version_dataSourcePulled_cn_fromOut_collect})',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with limit and offset', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { options: { limit: 10, offset: 3 } },
        selectionSetGraphQL: '{ code }'
    });
    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport SKIP 3 LIMIT 10\n' +
            'RETURN collect({code: getAirports_Airport.`code`})[..10]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge limit and offset', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { options: { limit: 10, offset: 2 } },
        selectionSetGraphQL: '{ code, airportRoutesIn(options: {offset: 5, limit: 3}) {code} }'
    });
    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport SKIP 2 LIMIT 10\n' +
            'OPTIONAL MATCH (getAirports_Airport)<-[`getAirports_Airport_airportRoutesIn_route`:`route`]-(getAirports_Airport_airportRoutesIn:`airport`)\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesIn IS NULL THEN [] ' +
            'ELSE COLLECT({code: getAirports_Airport_airportRoutesIn.`code`})[5..8] ' +
            'END AS getAirports_Airport_airportRoutesIn_collect\n' +
            'RETURN collect({' +
            'code: getAirports_Airport.`code`, ' +
            'airportRoutesIn: getAirports_Airport_airportRoutesIn_collect' +
            '})[..10]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge limit and offset from variables', () => {
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { options: { limit: 2, offset: 4 } },
        selectionSetGraphQL: '{code, airportRoutesOut(options: $nestedOptions) {code}}',
        variables: { nestedOptions: { limit: 3, offset: 6 } }
    });
    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport SKIP 4 LIMIT 2\n' +
            'OPTIONAL MATCH (getAirports_Airport)-[`getAirports_Airport_airportRoutesOut_route`:`route`]->(getAirports_Airport_airportRoutesOut:`airport`)\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesOut IS NULL THEN [] ' +
            'ELSE COLLECT({code: getAirports_Airport_airportRoutesOut.`code`})[6..9] ' +
            'END AS getAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({' +
            'code: getAirports_Airport.`code`, ' +
            'airportRoutesOut: getAirports_Airport_airportRoutesOut_collect' +
            '})[..2]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query zero limit and offset', () => {
    // zero limit and offset would be odd, but is allowed
    const result = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { options: { limit: 0, offset: 0 } },
        selectionSetGraphQL: '{ code, airportRoutesIn(options: {offset: 0, limit: 0}) {code} }'
    });
    expect(result).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport SKIP 0 LIMIT 0\n' +
            'OPTIONAL MATCH (getAirports_Airport)<-[`getAirports_Airport_airportRoutesIn_route`:`route`]-(getAirports_Airport_airportRoutesIn:`airport`)\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesIn IS NULL THEN [] ' +
            'ELSE COLLECT({code: getAirports_Airport_airportRoutesIn.`code`})[0..0] ' +
            'END AS getAirports_Airport_airportRoutesIn_collect\n' +
            'RETURN collect({' +
            'code: getAirports_Airport.`code`, ' +
            'airportRoutesIn: getAirports_Airport_airportRoutesIn_collect' +
            '})[..0]',
        parameters: {},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should throw error for query with negative limit', () => {
    expect(() => {
        resolveGraphDBQueryFromAppSyncEvent({
            field: 'getAirports',
            arguments: {options: {limit: -1}},
            selectionSetGraphQL: '{ code }'
        });
    }).toThrow('The limit value must be a positive integer');
});

test('should throw error for query with negative offset', () => {
    expect(() => {
        resolveGraphDBQueryFromAppSyncEvent({
            field: 'getAirports',
            arguments: {options: {offset: -1}},
            selectionSetGraphQL: '{ code }'
        });
    }).toThrow('The offset value must be a positive integer');
});

test('should resolve query with multiple fragments', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'getAirport',
        arguments: {filter: {code: {eq: 'YVR'}}},
        selectionSet: gql`{ _id, ...locationFields, ...otherFields, runways }`.definitions[0].selectionSet,
        fragments: {
            locationFields: gql`fragment locationFields on Airport { city, country }`.definitions[0],
            otherFields: gql`fragment otherFields on Airport { code, elev }`.definitions[0]
        }
    });
    expect(result).toEqual({
        query: 'MATCH (getAirport_Airport:`airport`) ' +
            'WHERE getAirport_Airport.code = $getAirport_Airport_code\n' +
            'RETURN {' +
            '_id:ID(getAirport_Airport), ' +
            'city: getAirport_Airport.`city`, ' +
            'country: getAirport_Airport.`country`, ' +
            'code: getAirport_Airport.`code`, ' +
            'elev: getAirport_Airport.`elev`, ' +
            'runways: getAirport_Airport.`runways`' +
            '} ' +
            'LIMIT 1',
        parameters: {getAirport_Airport_code: "YVR"},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve query with nested edge fragments', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'getAirport',
        arguments: {filter: {code: {eq: 'YVR'}}},
        selectionSet: gql`{ _id, ...locationFields, airportRoutesIn(options: {limit: 2}) {...locationFields}, ...otherFields }`.definitions[0].selectionSet,
        fragments: {
            locationFields: gql`fragment locationFields on Airport { city, country }`.definitions[0],
            otherFields: gql`fragment otherFields on Airport { code, elev }`.definitions[0]
        }
    });
    expect(result).toEqual({
        query: 'MATCH (getAirport_Airport:`airport`) ' +
            'WHERE getAirport_Airport.code = $getAirport_Airport_code\n' +
            'OPTIONAL MATCH (getAirport_Airport)<-[`getAirport_Airport_airportRoutesIn_route`:`route`]-(getAirport_Airport_airportRoutesIn:`airport`)\n' +
            'WITH getAirport_Airport, ' +
            'CASE WHEN getAirport_Airport_airportRoutesIn IS NULL THEN [] ' +
            'ELSE COLLECT({' +
            'city: getAirport_Airport_airportRoutesIn.`city`, ' +
            'country: getAirport_Airport_airportRoutesIn.`country`' +
            '})[..2] END AS getAirport_Airport_airportRoutesIn_collect\n' +
            'RETURN {' +
            '_id:ID(getAirport_Airport), ' +
            'city: getAirport_Airport.`city`, ' +
            'country: getAirport_Airport.`country`, ' +
            'airportRoutesIn: getAirport_Airport_airportRoutesIn_collect, ' +
            'code: getAirport_Airport.`code`, ' +
            'elev: getAirport_Airport.`elev`' +
            '} LIMIT 1',
        parameters: {getAirport_Airport_code: "YVR"},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to update node with fragment', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'updateAirport',
        arguments: {input: {_id: 22, city: "Seattle"}},
        selectionSet: gql`{ _id, ...locationFields, ...otherFields }`.definitions[0].selectionSet,
        fragments: {
            locationFields: gql`fragment locationFields on Airport { city, country }`.definitions[0],
            otherFields: gql`fragment otherFields on Airport { code, elev }`.definitions[0]
        }
    });
    
    expect(result).toEqual({
        query: 'MATCH (updateAirport_Airport)\n' +
            'WHERE ID(updateAirport_Airport) = $updateAirport_Airport__id\n' +
            'SET updateAirport_Airport.city = $updateAirport_Airport_city\n' +
            'RETURN {' +
            '_id:ID(updateAirport_Airport), ' +
            'city: updateAirport_Airport.`city`, ' +
            'country: updateAirport_Airport.`country`, ' +
            'code: updateAirport_Airport.`code`, ' +
            'elev: updateAirport_Airport.`elev`' +
            '}',
        parameters: {
            updateAirport_Airport__id: '22',
            updateAirport_Airport_city: "Seattle",
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to update edge between nodes with fragment', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'updateRouteConnectionFromAirportToAirport',
        arguments: {from_id: "99", to_id: "48", edge: { dist: 123 }},
        selectionSet: gql`{ _id, ...routeFields }`.definitions[0].selectionSet,
        fragments: {
            routeFields: gql`fragment routeFields on Route { dist }`.definitions[0]
        }
    });
    
    expect(result).toMatchObject({
        query: 'MATCH (from)-[updateRouteConnectionFromAirportToAirport_Route:`route`]->(to)\n' +
            'WHERE ID(from) = $updateRouteConnectionFromAirportToAirport_Route_whereFromId ' +
            'AND ID(to) = $updateRouteConnectionFromAirportToAirport_Route_whereToId\n' +
            'SET updateRouteConnectionFromAirportToAirport_Route.dist = $updateRouteConnectionFromAirportToAirport_Route_dist\n' +
            'RETURN {' +
            '_id:ID(updateRouteConnectionFromAirportToAirport_Route), ' +
            'dist: updateRouteConnectionFromAirportToAirport_Route.`dist`' +
            '}',
        parameters: {
            updateRouteConnectionFromAirportToAirport_Route_whereFromId: '99',
            updateRouteConnectionFromAirportToAirport_Route_whereToId: '48',
            updateRouteConnectionFromAirportToAirport_Route_dist: 123
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to create node with fragment', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'createAirport',
        arguments: {input: {code: "NAX", city: "Reggio Emilia"}},
        selectionSet: gql`{ _id, ...locationFields, ...otherFields }`.definitions[0].selectionSet,
        fragments: {
            locationFields: gql`fragment locationFields on Airport { city, country }`.definitions[0],
            otherFields: gql`fragment otherFields on Airport { runways }`.definitions[0]
        }
    });
    
    expect(result).toEqual({
        query: 'CREATE (createAirport_Airport:`airport` {city: $createAirport_Airport_city, code: $createAirport_Airport_code})\n' +
            'RETURN {' +
            '_id:ID(createAirport_Airport), ' +
            'city: createAirport_Airport.`city`, ' +
            'country: createAirport_Airport.`country`, ' +
            'runways: createAirport_Airport.`runways`' +
            '}',
        parameters: {
            createAirport_Airport_code: 'NAX',
            createAirport_Airport_city: 'Reggio Emilia'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should resolve mutation to connect nodes with fragment', () => {
    const result = resolveGraphDBQueryFromEvent({
        field: 'connectCountryToAirportThroughContains',
        arguments: {from_id: "ee71c547-ea32-4573-88bc-6ecb31942a1e", to_id: "99cb3321-9cda-41b6-b760-e88ead3e1ea1"},
        selectionSet: gql`{ ...containsFields }`.definitions[0].selectionSet,
        fragments: {
            containsFields: gql`fragment containsFields on Contains { _id }`.definitions[0]
        }
    });

    expect(result).toMatchObject({
        query: 'MATCH (from), (to)\n' +
            'WHERE ID(from) = $connectCountryToAirportThroughContains_Contains_whereFromId ' +
            'AND ID(to) = $connectCountryToAirportThroughContains_Contains_whereToId\n' +
            'CREATE (from)-[connectCountryToAirportThroughContains_Contains:`contains`]->(to)\n' +
            'RETURN {_id:ID(connectCountryToAirportThroughContains_Contains)}',
        parameters: {
            connectCountryToAirportThroughContains_Contains_whereFromId: 'ee71c547-ea32-4573-88bc-6ecb31942a1e',
            connectCountryToAirportThroughContains_Contains_whereToId: '99cb3321-9cda-41b6-b760-e88ead3e1ea1'
        },
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should throw error for query with unknown fragment', () => {
    expect(() => {
        resolveGraphDBQueryFromEvent({
            field: 'getAirport',
            arguments: {},
            selectionSet: gql`{ _id, ...unknownFragment, code }`.definitions[0].selectionSet,
            fragments: {}
        });
    }).toThrow('Fragment unknownFragment not found');
});

test('should throw error for query with multiple sort arguments in one object', () => {
    expect(() => {
        resolveGraphDBQueryFromEvent({
            field: 'getAirports',
            arguments: {sort: [{desc: 'ASC'}, {code: 'DESC', country: 'ASC'}]},
            variables: {},
            selectionSetGraphQL: '{\n  desc\n  code\n  country\n}',
        });
    }).toThrow('Cannot have more than one field in a single sort object. Please use multiple single-field sort objects instead');
});

test('should resolve multiple app sync events with updated variable values', () => {
    const firstResult = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { options: { limit: 3 } },
        selectionSetGraphQL: '{ code, airportRoutesOut(filter: {country: {eq: $country}}, options: {limit: $limit}) { code } }',
        // initial variable values
        variables: { country: 'CA',  limit: 2}
    });

    // first result should reflect initial variable values
    expect(firstResult).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport LIMIT 3\n' +
            'OPTIONAL MATCH (getAirports_Airport)-[`getAirports_Airport_airportRoutesOut_route`:`route`]->(getAirports_Airport_airportRoutesOut:`airport`) WHERE getAirports_Airport_airportRoutesOut.country = $getAirports_Airport_airportRoutesOut_country\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({code: getAirports_Airport_airportRoutesOut.`code`})[..2] END AS getAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({code: getAirports_Airport.`code`, airportRoutesOut: getAirports_Airport_airportRoutesOut_collect})[..3]',
        parameters: { getAirports_Airport_airportRoutesOut_country: 'CA'},
        language: 'opencypher',
        refactorOutput: null
    });

    const secondResult = resolveGraphDBQueryFromAppSyncEvent({
        field: 'getAirports',
        arguments: { options: { limit: 3 } },
        selectionSetGraphQL: '{ code, airportRoutesOut(filter: {country: {eq: $country}}, options: {limit: $limit}) { code } }',
        // updated variable values
        variables: { country: 'MX',  limit: 1}
    });

    // second result should reflect updated variable values
    expect(secondResult).toEqual({
        query: 'MATCH (getAirports_Airport:`airport`) WITH getAirports_Airport LIMIT 3\n' +
            'OPTIONAL MATCH (getAirports_Airport)-[`getAirports_Airport_airportRoutesOut_route`:`route`]->(getAirports_Airport_airportRoutesOut:`airport`) WHERE getAirports_Airport_airportRoutesOut.country = $getAirports_Airport_airportRoutesOut_country\n' +
            'WITH getAirports_Airport, CASE WHEN getAirports_Airport_airportRoutesOut IS NULL THEN [] ELSE COLLECT({code: getAirports_Airport_airportRoutesOut.`code`})[..1] END AS getAirports_Airport_airportRoutesOut_collect\n' +
            'RETURN collect({code: getAirports_Airport.`code`, airportRoutesOut: getAirports_Airport_airportRoutesOut_collect})[..3]',
        parameters: { getAirports_Airport_airportRoutesOut_country: 'MX'},
        language: 'opencypher',
        refactorOutput: null
    });
});

test('should log detailed error when GraphQL selection set field type cannot be resolved', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
        resolveGraphDBQueryFromEvent({
            field: 'getAirport',
            arguments: {},
            selectionSet: gql`{ invalid }`.definitions[0].selectionSet,
            fragments: {}
        });
    } catch (error) {
        // Expected to fail due to unhandled type
        console.log(error);
    }
    
    expect(consoleSpy).toHaveBeenCalledWith(
        'GraphQL field type not found - field: invalid type: Airport path: getAirport_Airport.'
    );
    
    consoleSpy.mockRestore();
});
