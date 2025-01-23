const BATCH_SIZE = 20;

/**
 * @callback MapCallback
 * @param {T} value
 * @param {number} index
 * @param {T[]} array
 * @returns {U}
 * @template T, U
 */

/**
 * Calls a Promise-returning callback function on each element of an array and creates a Promise
 * that is resolved with an array of results when all of the returned Promises resolve, or rejected
 * when any Promise is rejected.
 *
 * The elements of the array are mapped and then resolved in batches of size `batchSize`, ensuring
 * that no more than `batchSize` Promises are pending at one time. This is useful for e.g. avoiding
 * too many simultaneous web requests.
 *
 * @param {T[]} array an array to map over
 * @param {MapCallback<T, Promise<U>>} callbackfn a function that accepts up to three arguments. The
 * mapAll function calls the callbackfn function one time for each element in the array
 * @param {number} batchSize the number of Promises to concurrently resolve
 * @returns {Promise<U[]>}
 * @template T, U
 */
async function mapAll(array, callbackfn, batchSize = BATCH_SIZE) {
    if (batchSize <= 0) {
        return [];
    }

    const results = [];

    for (let i = 0; i < array.length; i += batchSize) {
        const promises = array.slice(i, i + batchSize).map(callbackfn);
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
    }

    return results;
}

export { mapAll };
