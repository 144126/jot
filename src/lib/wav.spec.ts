import { describe, expect, it } from 'vitest';
import { encode_wav } from './wav';

describe('encode_wav', () => {
	it('writes a 16-bit mono header', () => {
		const pcm = new Float32Array([0, 0.5, -0.5]);
		const buf = encode_wav(pcm, 16000);
		const v = new DataView(buf);
		expect(buf.byteLength).toBe(44 + 6);
		expect(String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3))).toBe(
			'RIFF'
		);
		expect(v.getUint16(22, true)).toBe(1);
		expect(v.getUint32(24, true)).toBe(16000);
		expect(v.getUint16(34, true)).toBe(16);
	});
});
