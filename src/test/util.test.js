import {parseNeptuneDomain, parseNeptuneGraphName} from '../util.js';

test('parse domain from neptune cluster host', () => {
    expect(parseNeptuneDomain('db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com')).toBe('neptune.amazonaws.com');
});

test('parse domain from neptune analytics host', () => {
    expect(parseNeptuneDomain('g-abcdef.us-west-2.neptune-graph.amazonaws.com')).toBe('neptune-graph.amazonaws.com');
});

test('parse domain from host without enough parts throws error', () => {
    expect(() => parseNeptuneDomain('invalid.com')).toThrow('Cannot parse neptune host invalid.com because it has 2 parts but expected at least 5');
});

test('parse name from neptune cluster host', () => {
    expect(parseNeptuneGraphName('db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com')).toBe('db-neptune-abc-def');
});

test('parse name from neptune analytics host', () => {
    expect(parseNeptuneGraphName('g-abcdef.us-west-2.neptune-graph.amazonaws.com')).toBe('g-abcdef');
});

test('parse name from host without enough parts throws error', () => {
    expect(() => parseNeptuneGraphName('invalid.com')).toThrow('Cannot parse neptune host invalid.com because it has 2 parts but expected at least 5');
});