import { mapAll } from '../util-promise.js'

describe('mapAll', () => {
    test('should map each element, resolve each Promise, and resolve to the mapped values', async () => {
        await expect(mapAll([1, 2, 3, 4, 5, 6, 7, 8], double))
            .resolves
            .toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
    });

    test('should map each element in batches', async () => {
        const count = 100;
        const batchSize = 50;
        const batchCounter = makeBatchCounter(count);

        await expect(mapAll(Array(count + 1).fill(0), (i) => batchCounter.fn(i), batchSize))
            .rejects
            .toThrow(Error);
        expect(batchCounter.count).toEqual(count);
    });

    test('should reject with the same error as a rejected mapped Promise', async () => {
        await expect(mapAll([2, 4, 6, 3, 8, 10], assertEven))
            .rejects
            .toThrow(OddNumberError);
    });

    test('should resolve to an empty array for empty input arrays', async () => {
        await expect(mapAll([], Promise.resolve)).resolves.toEqual([]);
    });

    test('should resolve to an empty array for non-positive batch sizes', async () => {
        await expect(mapAll([1, 2, 3], Promise.resolve, -1)).resolves.toEqual([]);
        await expect(mapAll([1, 2, 3], Promise.resolve, 0)).resolves.toEqual([]);
    });

    function double(i) {
        return Promise.resolve(i * 2);
    }

    function makeBatchCounter(n) {
        return {
            count: 0,
            fn: function (i) {
                if (this.count >= n) {
                    throw new Error();
                }
                this.count++;
                return Promise.resolve(i);
            }
        };
    }

    function assertEven(i) {
        if (i % 2 !== 0) {
            throw new OddNumberError();
        }

        return Promise.resolve(i);
    }

    class OddNumberError extends Error {}
});
