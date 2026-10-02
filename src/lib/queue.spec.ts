import { describe, expect, it } from 'vitest';
import { Queue } from './queue';

function wait(): Promise<void> {
	return new Promise((r) => setTimeout(r, 0));
}

describe('Queue', () => {
	it('runs jobs in order, one at a time', async () => {
		const seen: string[] = [];
		let gate: () => void = () => {};
		const hold = new Promise<void>((r) => {
			gate = r;
		});
		const q = new Queue<string>(async (s) => {
			if (s === 'a') await hold;
			seen.push(s);
		});
		q.push('a');
		q.push('b');
		q.push('c');
		expect(q.n).toBe(3);
		expect(q.waiting.map((j) => j.v)).toEqual(['b', 'c']);
		gate();
		await wait();
		await wait();
		await wait();
		expect(seen).toEqual(['a', 'b', 'c']);
		expect(q.n).toBe(0);
	});

	it('keeps going after a job throws', async () => {
		const seen: string[] = [];
		const q = new Queue<string>(async (s) => {
			if (s === 'bad') throw new Error('no');
			seen.push(s);
		});
		q.push('ok');
		q.push('bad');
		q.push('later');
		await wait();
		await wait();
		await wait();
		expect(seen).toEqual(['ok', 'later']);
	});
});
