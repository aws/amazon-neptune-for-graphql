
import { jest } from '@jest/globals';
import { loadResolver } from '../../testLib';

describe('AppSync resolver', () => {
    let resolverModule;

    beforeAll(async () => {
        resolverModule = await loadResolver('./TestCases/Case01/output/output.resolver.graphql.cjs');
    });

    test('should resolve queries with a filter', () => {
        const result = resolve({
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
        const result = resolve({
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
        const result = resolve({
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

    function resolve(event) {
        return resolverModule.resolveGraphDBQueryFromAppSyncEvent(event);
    }
});
