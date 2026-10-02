<script lang="ts">
	import { Mic, SAMPLE_RATE } from '#lib/mic';
	import { Queue } from '#lib/queue';
	import { Stt } from '#lib/stt';
	import { encode_wav } from '#lib/wav';

	let text = $state('');
	let live = $state('');
	let error = $state('');
	let listening = $state(false);
	let speaking = $state(false);
	let now = $state('');
	let wait = $state<{ id: number; v: string }[]>([]);

	const stt = new Stt(async (pcm, signal) => {
		const r = await fetch('/api/transcribe', {
			method: 'POST',
			body: encode_wav(pcm, SAMPLE_RATE),
			signal
		});
		if (!r.ok) {
			error = (await r.text()).trim() || `stt ${r.status}`;
			return '';
		}
		error = '';
		return (await r.text()).trim();
	});
	stt.on_live = (t) => {
		if (speaking) live = t;
	};

	const edits = new Queue<string>(async (s) => {
		now = s;
		wait = edits.waiting;
		error = '';
		try {
			const r = await fetch('/api/edit', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ t: text, s })
			});
			if (!r.ok) throw new Error(await r.text());
			text = await r.text();
		} catch (e) {
			error = String(e);
		} finally {
			now = '';
			wait = edits.waiting;
		}
	});

	function enqueue(s: string): void {
		edits.push(s);
		wait = edits.waiting;
	}

	async function on_utterance(pcm: Float32Array): Promise<void> {
		const say = await stt.final(pcm);
		if (!say) return;
		live = '';
		enqueue(say);
	}

	const mic = new Mic();
	mic.on_partial = (pcm) => stt.partial(pcm);
	mic.on_utterance = (pcm) => void on_utterance(pcm);
	mic.on_event = (e) => {
		speaking = e === 'speech_start';
		if (e === 'speech_start') live = '';
	};

	const label = $derived(now ? 'editing' : speaking ? 'hearing' : listening ? 'listening' : 'off');

	async function toggle(): Promise<void> {
		if (listening) {
			mic.stop();
			listening = false;
			speaking = false;
			live = '';
			return;
		}
		error = '';
		try {
			await mic.start();
			listening = true;
		} catch {
			error = 'mic blocked. allow microphone access.';
		}
	}
</script>

<svelte:head>
	<title>jot</title>
</svelte:head>

<main class="mx-auto flex h-dvh max-w-2xl flex-col gap-3 p-6">
	<button
		class="flex min-h-11 items-center gap-3 self-start pr-3"
		onclick={toggle}
		aria-label={listening ? 'stop listening' : 'start listening'}
	>
		<span class="h-3 w-3 rounded-full transition-colors {listening ? 'bg-bad' : 'bg-line'}"></span>
		<span class="text-mut text-sm">{label}</span>
	</button>

	{#if live && speaking}
		<p class="text-fg text-sm">{live}</p>
	{/if}

	<textarea
		bind:value={text}
		class="border-line focus:border-accent min-h-0 flex-1 resize-none rounded-lg border bg-transparent p-4 text-lg outline-none"
		placeholder="talk to edit this"
		spellcheck="false"></textarea>

	{#if now || wait.length}
		<ol class="text-mut flex flex-col gap-1 text-sm">
			{#if now}
				<li class="text-fg">{now}</li>
			{/if}
			{#each wait as j (j.id)}
				<li>{j.v}</li>
			{/each}
		</ol>
	{/if}

	{#if error}
		<p class="text-bad text-sm">{error}</p>
	{/if}
</main>
