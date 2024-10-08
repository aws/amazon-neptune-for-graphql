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
const DELIMITER = '.';

/**
 * Splits a neptune host into its parts, throwing an Error if there are unexpected number of parts.
 *
 * @param neptuneHost
 */
function splitHost(neptuneHost) {
    let parts = neptuneHost.split(DELIMITER);
    if (parts.length < MIN_HOST_PARTS) {
        throw Error('Cannot parse neptune host ' + neptuneHost + ' because it has ' + parts.length + ' parts but expected at least ' + MIN_HOST_PARTS);
    }
    return parts;
}

/**
 * Parses the domain from the given neptune db or neptune analytics host.
 *
 * Example: g-abcdef.us-west-2.neptune-graph.amazonaws.com ==> neptune-graph.amazonaws.com
 * Example: db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com ==> neptune.amazonaws.com
 *
 * @param neptuneHost
 */
function parseNeptuneDomain(neptuneHost) {
    let parts = splitHost(neptuneHost);
    // last 3 parts of the host make up the domain
    // ie. neptune.amazonaws.com or neptune-graph.amazonaws.com
    let domainParts = parts.splice(parts.length - NUM_DOMAIN_PARTS, NUM_DOMAIN_PARTS);
    return domainParts.join(DELIMITER);
}

/**
 * Parses the neptune graph name from the given neptune db or neptune analytics host.
 *
 * Example: g-abcdef.us-west-2.neptune-graph.amazonaws.com ==> g-abcdef
 * Example: db-neptune-abc-def.cluster-xyz.us-west-2.neptune.amazonaws.com ==> db-neptune-abc-def
 *
 * @param neptuneHost
 */
function parseNeptuneGraphName(neptuneHost) {
    let parts = splitHost(neptuneHost);
    // graph name is the first part
    return parts[0];
}

export {parseNeptuneDomain, parseNeptuneGraphName};