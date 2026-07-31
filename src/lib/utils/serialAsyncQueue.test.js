/**
 * @fileoverview Tests for {@link createSerialEnqueue}.
 * @module lib/utils/serialAsyncQueue.test
 */
import { createSerialEnqueue } from './serialAsyncQueue';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
describe('createSerialEnqueue', () => {
    it('runs tasks strictly in order', async () => {
        const enqueue = createSerialEnqueue();
        const order = [];
        await Promise.all([
            enqueue(async () => {
                await delay(8);
                order.push(1);
            }),
            enqueue(async () => {
                order.push(2);
            }),
            enqueue(async () => {
                order.push(3);
            }),
        ]);
        expect(order).toEqual([1, 2, 3]);
    });
    it('continues the chain after a rejected task', async () => {
        const enqueue = createSerialEnqueue();
        const order = [];
        await enqueue(async () => {
            order.push('a');
            throw new Error('fail');
        }).catch(() => {
            order.push('catch');
        });
        await enqueue(async () => {
            order.push('b');
        });
        expect(order).toEqual(['a', 'catch', 'b']);
    });
});
