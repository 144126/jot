// Wrap float samples in a 16-bit PCM mono WAV header.

export function encode_wav(pcm: Float32Array, sample_rate: number): ArrayBuffer {
	const buf = new ArrayBuffer(44 + pcm.length * 2);
	const v = new DataView(buf);
	const w = (o: number, s: string) => {
		for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
	};
	w(0, 'RIFF');
	v.setUint32(4, 36 + pcm.length * 2, true);
	w(8, 'WAVEfmt ');
	v.setUint32(16, 16, true);
	v.setUint16(20, 1, true);
	v.setUint16(22, 1, true);
	v.setUint32(24, sample_rate, true);
	v.setUint32(28, sample_rate * 2, true);
	v.setUint16(32, 2, true);
	v.setUint16(34, 16, true);
	w(36, 'data');
	v.setUint32(40, pcm.length * 2, true);
	for (let i = 0; i < pcm.length; i++) {
		const s = Math.max(-1, Math.min(1, pcm[i]));
		v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
	}
	return buf;
}
