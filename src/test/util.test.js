import {parseNeptuneDomainFromHost, parseNeptuneEndpoint} from '../util.js';

test('parse domain from neptune cluster host', () => {
    expect(parseNeptuneDomainFromHost('db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com'))
        .toBe('neptune.amazonaws.com');
});

test('parse domain from neptune analytics host', () => {
    expect(parseNeptuneDomainFromHost('g-abcdef.us-west-2.neptune-graph.amazonaws.com'))
        .toBe('neptune-graph.amazonaws.com');
});

test('parse domain from host without enough parts throws error', () => {
    expect(() => parseNeptuneDomainFromHost('invalid.com'))
        .toThrow('Cannot parse neptune host invalid.com because it has 2 part(s) delimited by . but expected at least 5');
});

test('parse neptune db endpoint', () => {
    let neptuneInfo = parseNeptuneEndpoint('db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com:8182');
    expect(neptuneInfo).toHaveProperty('port', '8182');
    expect(neptuneInfo).toHaveProperty('host', 'db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com');
    expect(neptuneInfo).toHaveProperty('domain', 'neptune.amazonaws.com');
    expect(neptuneInfo).toHaveProperty('region', 'us-west-2');
    expect(neptuneInfo).toHaveProperty('graphName', 'db-neptune-abc-def');
    expect(neptuneInfo).toHaveProperty('neptuneType', 'neptune-db');
});

test('parse neptune analytics endpoint', () => {
    let neptuneInfo = parseNeptuneEndpoint('g-abcdef.us-east-1.neptune-graph.amazonaws.com:8183');
    expect(neptuneInfo).toHaveProperty('port', '8183');
    expect(neptuneInfo).toHaveProperty('host', 'g-abcdef.us-east-1.neptune-graph.amazonaws.com');
    expect(neptuneInfo).toHaveProperty('domain', 'neptune-graph.amazonaws.com');
    expect(neptuneInfo).toHaveProperty('region', 'us-east-1');
    expect(neptuneInfo).toHaveProperty('graphName', 'g-abcdef');
    expect(neptuneInfo).toHaveProperty('neptuneType', 'neptune-graph');
});

test('parse neptune endpoint without port throws error', () => {
    expect(() => parseNeptuneEndpoint('db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com'))
        .toThrow('Cannot parse neptune endpoint db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com because it is not in expected format of host:port');
});

test('parse neptune endpoint not enough parts in domain throws error', () => {
    expect(() => parseNeptuneEndpoint('invalid.com:1234'))
        .toThrow('Cannot parse neptune host invalid.com because it has 2 part(s) delimited by . but expected at least 5');
});