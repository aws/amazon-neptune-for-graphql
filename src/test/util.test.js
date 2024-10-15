import {parseNeptuneDomainFromEndpoint, parseNeptuneDomainFromHost, parseNeptuneGraphName} from '../util.js';

test('parse domain from neptune cluster host', () => {
    expect(parseNeptuneDomainFromHost('db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com')).toBe('neptune.amazonaws.com');
});

test('parse domain from neptune analytics host', () => {
    expect(parseNeptuneDomainFromHost('g-abcdef.us-west-2.neptune-graph.amazonaws.com')).toBe('neptune-graph.amazonaws.com');
});

test('parse domain from host without enough parts throws error', () => {
    expect(() => parseNeptuneDomainFromHost('invalid.com')).toThrow('Cannot parse neptune host invalid.com because it has 2 part(s) delimited by . but expected at least 5');
});

test('parse domain from neptune cluster endpoint', () => {
    expect(parseNeptuneDomainFromEndpoint('db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com:8182')).toBe('neptune.amazonaws.com');
});

test('parse domain from neptune analytics endpoint', () => {
    expect(parseNeptuneDomainFromEndpoint('g-abcdef.us-west-2.neptune-graph.amazonaws.com:8182')).toBe('neptune-graph.amazonaws.com');
});

test('parse domain from endpoint without enough parts throws error', () => {
    expect(() => parseNeptuneDomainFromEndpoint('g-abcdef.us-west-2.neptune-graph.amazonaws.com')).toThrow('Cannot parse domain from neptune endpoint g-abcdef.us-west-2.neptune-graph.amazonaws.com because it has 1 part(s) delimited by : but expected 2');
});

test('parse name from neptune cluster host', () => {
    expect(parseNeptuneGraphName('db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com')).toBe('db-neptune-abc-def');
});

test('parse name from neptune analytics host', () => {
    expect(parseNeptuneGraphName('g-abcdef.us-west-2.neptune-graph.amazonaws.com')).toBe('g-abcdef');
});

test('parse name from host without enough parts throws error', () => {
    expect(() => parseNeptuneGraphName('invalid.com')).toThrow('Cannot parse neptune host invalid.com because it has 2 part(s) delimited by . but expected at least 5');
});