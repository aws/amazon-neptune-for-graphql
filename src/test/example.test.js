
import { jest } from '@jest/globals';
import { main } from "../main";

test('adds 1 + 2 to equal 3', () => {
    expect(1+2).toBe(3);
});


test('main', async () => {
    expect(main()).not.toBe(null);
});