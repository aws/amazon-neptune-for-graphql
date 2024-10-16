/*
Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at
    http://www.apache.org/licenses/LICENSE-2.0
or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
*/

const MIN_HOST_PARTS = 5;
const NUM_DOMAIN_PARTS = 3;
const HOST_DELIMITER = '.';
const NEPTUNE_GRAPH = 'neptune-graph';
const NEPTUNE_DB = 'neptune-db';

/**
 * Splits a neptune host into its parts, throwing an Error if there are unexpected number of parts.
 *
 * @param neptuneHost
 */
function splitHost(neptuneHost) {
    let parts = neptuneHost.split(HOST_DELIMITER);
    if (parts.length < MIN_HOST_PARTS) {
        throw Error('Cannot parse neptune host ' + neptuneHost + ' because it has ' + parts.length +
            ' part(s) delimited by ' + HOST_DELIMITER + ' but expected at least ' + MIN_HOST_PARTS);
    }
    return parts;
}

function getDomainFromHostParts(hostParts) {
    // last 3 parts of the host make up the domain
    // ie. neptune.amazonaws.com or neptune-graph.amazonaws.com
    let domainParts = hostParts.splice(hostParts.length - NUM_DOMAIN_PARTS, NUM_DOMAIN_PARTS);
    return domainParts.join(HOST_DELIMITER);
}

/**
 * Parses the domain from the given neptune db or neptune analytics host.
 *
 * Example: g-abcdef.us-west-2.neptune-graph.amazonaws.com ==> neptune-graph.amazonaws.com
 * Example: db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com ==> neptune.amazonaws.com
 *
 * @param neptuneHost
 */
function parseNeptuneDomainFromHost(neptuneHost) {
    return getDomainFromHostParts(splitHost(neptuneHost));
}

/**
 * Parses a neptune endpoint into its parts.
 *
 * @param neptuneEndpoint
 * @returns {{graphName: (string), port: (string), domain: (string), neptuneType: (string), host: (string), region: (string)}}
 */
function parseNeptuneEndpoint(neptuneEndpoint) {
    let endpointParts = neptuneEndpoint.split(':');
    if (endpointParts.length !== 2) {
        throw Error('Cannot parse neptune endpoint ' + neptuneEndpoint + ' because it is not in expected format of host:port');
    }

    const host = endpointParts[0];
    const hostParts = splitHost(host);
    const domain = getDomainFromHostParts(hostParts);
    const neptuneType = domain.includes(NEPTUNE_GRAPH) ? NEPTUNE_GRAPH : NEPTUNE_DB;
    const region = neptuneType === NEPTUNE_DB ? hostParts[2] : hostParts[1];

    return {
        port: endpointParts[1],
        host: host,
        domain: domain,
        region: region,
        graphName: hostParts[0],
        neptuneType: neptuneType
    };
}

export {parseNeptuneDomainFromHost, parseNeptuneEndpoint};