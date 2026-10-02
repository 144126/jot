import { describe, expect, it } from 'vitest';
import { apply, bare } from './edit';

describe('bare', () => {
	it('unwraps a fenced block', () => {
		expect(bare('```\nhello\n```')).toBe('hello');
	});

	it('leaves plain text alone', () => {
		expect(bare('hello')).toBe('hello');
	});
});

describe('apply', () => {
	it('inserts spoken words when the document is empty', async () => {
		const out = await apply('', 'hello world');
		expect(out).toEqual({ t: 'hello world' });
	});
});
