<script lang="ts">
	import { GlassCard } from '@hominio/brand';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatJSON(obj: any): string {
		return JSON.stringify(obj, null, 2);
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		// Could add a toast notification here
	}
</script>

<div class="min-h-screen bg-glass-gradient pt-6 pb-12">
	<div class="container mx-auto px-4 max-w-7xl">
		<div class="mb-8">
			<h1 class="text-4xl font-bold tracking-tight text-slate-900 mb-2">Prompts & Context Management</h1>
			<p class="text-slate-600">View and manage all system prompts, context prompts, and ingestion data</p>
		</div>

		<!-- Call Configuration -->
		<GlassCard class="p-6 mb-6">
			<div class="mb-4">
				<h2 class="text-2xl font-bold text-slate-900">Call Configuration</h2>
			</div>

			<div class="space-y-6">
				<!-- Raw Call Config JSON -->
				<div>
					<h3 class="text-lg font-semibold text-slate-800 mb-2">Raw Call Config JSON</h3>
					<div class="relative">
						<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 max-h-96 overflow-y-auto">{formatJSON(data.callConfig.raw)}</pre>
						<button
							onclick={() => copyToClipboard(formatJSON(data.callConfig.raw))}
							class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
						>
							Copy
						</button>
					</div>
				</div>

				<!-- Call Prompt vs Repeated Prompt -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div>
						<h3 class="text-lg font-semibold text-slate-800 mb-2">Call Prompt (Initial System Instruction)</h3>
						<div class="relative">
							<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto">{data.callConfig.raw.callPrompt}</pre>
							<button
								onclick={() => copyToClipboard(data.callConfig.raw.callPrompt)}
								class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
							>
								Copy
							</button>
						</div>
						<p class="text-xs text-slate-500 mt-2">
							This is the base system instruction. Repeated Prompt is appended to this at call start and after every tool call.
						</p>
					</div>

					<div>
						<h3 class="text-lg font-semibold text-slate-800 mb-2">Repeated Prompt (Injected with Every Tool Call)</h3>
						<div class="relative">
							<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto">{data.callConfig.repeatedPrompt}</pre>
							<button
								onclick={() => copyToClipboard(data.callConfig.repeatedPrompt)}
								class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
							>
								Copy
							</button>
						</div>
						<p class="text-xs text-slate-500 mt-2">
							This context is automatically injected at call start (appended to Call Prompt) and after every tool call with current date/time.
						</p>
					</div>
				</div>
			</div>
		</GlassCard>

		<!-- Root Agent (Hominio) System Prompts -->
		<GlassCard class="p-6 mb-6">
			<div class="mb-4">
				<h2 class="text-2xl font-bold text-slate-900">Root Agent: Hominio</h2>
			</div>

			<div class="space-y-4">
				<div>
					<h3 class="text-lg font-semibold text-slate-800 mb-2">System Instruction (Built from Call Prompt + Dynamic Additions)</h3>
					<div class="relative">
						<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto">{data.rootSystemInstruction}</pre>
						<button
							onclick={() => copyToClipboard(data.rootSystemInstruction)}
							class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
						>
							Copy
						</button>
					</div>
					<p class="text-xs text-slate-500 mt-2">
						This is built from the Call Prompt (base instruction) + dynamically added vibe list and available schemas. The Repeated Prompt is injected separately at call start and after every tool call.
					</p>
				</div>
			</div>
		</GlassCard>

		<!-- Sub Vibes -->
		<div class="mb-6">
			<h2 class="text-2xl font-bold text-slate-900 mb-4">Sub Vibes</h2>
			<div class="space-y-4">
				{#each data.vibeIds as vibeId}
					{@const vibeConfig = data.vibeConfigs[vibeId]}
					{@const vibeContext = data.vibeContexts[vibeId]}
					<GlassCard class="p-6">
						<div class="mb-4">
							<h3 class="text-xl font-bold text-slate-900">{vibeConfig.name} ({vibeId})</h3>
							<p class="text-sm text-slate-600 mt-1">{vibeConfig.description}</p>
						</div>

						<div class="space-y-6 mt-4">
							<!-- Raw Config JSON vs Prompt -->
							<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<div>
									<h4 class="text-lg font-semibold text-slate-800 mb-2">Raw Config JSON</h4>
									<div class="relative">
										<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 max-h-96 overflow-y-auto">{formatJSON(vibeConfig)}</pre>
										<button
											onclick={() => copyToClipboard(formatJSON(vibeConfig))}
											class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
										>
											Copy
										</button>
									</div>
								</div>

								{#if vibeConfig.vibePrompt}
									<div>
										<h4 class="text-lg font-semibold text-slate-800 mb-2">Vibe Prompt (Unified - Pure, No Dynamic Data)</h4>
										<div class="relative">
											<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto">{vibeConfig.vibePrompt}</pre>
											<button
												onclick={() => copyToClipboard(vibeConfig.vibePrompt)}
												class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
											>
												Copy
											</button>
										</div>
										<p class="text-xs text-slate-500 mt-2">
											Note: AI should use tools (queryDataContext) to get dynamic data when needed. Current date/time is automatically available in context.now for every tool call.
										</p>
									</div>
								{/if}
							</div>

							<!-- Skills Configuration -->
							{#if vibeConfig.skills && vibeConfig.skills.length > 0}
								<div>
									<h4 class="text-lg font-semibold text-slate-800 mb-2">Skills Configuration (JSON)</h4>
									<div class="relative">
										<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 max-h-96 overflow-y-auto">{formatJSON(vibeConfig.skills)}</pre>
										<button
											onclick={() => copyToClipboard(formatJSON(vibeConfig.skills))}
											class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
										>
											Copy
										</button>
									</div>
								</div>
							{/if}
						</div>
					</GlassCard>
				{/each}
			</div>
		</div>

		<!-- Context Ingestion Data -->
		<div class="mb-6">
			<h2 class="text-2xl font-bold text-slate-900 mb-4">Context Ingestion Data</h2>
			<div class="space-y-4">
				<!-- Menu Data -->
				<GlassCard class="p-6">
					<div class="mb-4">
						<h3 class="text-xl font-bold text-slate-900">Menu Data</h3>
					</div>

					<div>
						<h4 class="text-lg font-semibold text-slate-800 mb-2">Raw Menu Data (JSON)</h4>
						<p class="text-xs text-slate-500 mb-2">AI should use queryDataContext with schemaId: "menu" to get this data dynamically</p>
						<div class="relative">
							<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 max-h-96 overflow-y-auto">{formatJSON(data.contextData.menu.raw)}</pre>
							<button
								onclick={() => copyToClipboard(formatJSON(data.contextData.menu.raw))}
								class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
							>
								Copy
							</button>
						</div>
					</div>
				</GlassCard>

				<!-- Wellness Data -->
				<GlassCard class="p-6">
					<div class="mb-4">
						<h3 class="text-xl font-bold text-slate-900">Wellness Data</h3>
					</div>

					<div>
						<h4 class="text-lg font-semibold text-slate-800 mb-2">Raw Wellness Data (JSON)</h4>
						<p class="text-xs text-slate-500 mb-2">AI should use queryDataContext with schemaId: "wellness" to get this data dynamically</p>
						<div class="relative">
							<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 max-h-96 overflow-y-auto">{formatJSON(data.contextData.wellness.raw)}</pre>
							<button
								onclick={() => copyToClipboard(formatJSON(data.contextData.wellness.raw))}
								class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
							>
								Copy
							</button>
						</div>
					</div>
				</GlassCard>

				<!-- Calendar Data -->
				<GlassCard class="p-6">
					<div class="mb-4">
						<h3 class="text-xl font-bold text-slate-900">Calendar Data</h3>
					</div>

					<div>
						<h4 class="text-lg font-semibold text-slate-800 mb-2">Raw Calendar Data (JSON)</h4>
						<p class="text-xs text-slate-500 mb-2">AI should use queryDataContext with schemaId: "calendar" to get this data dynamically</p>
						<div class="relative">
							<pre class="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border border-slate-200 max-h-96 overflow-y-auto">{formatJSON(data.contextData.calendar.raw)}</pre>
							<button
								onclick={() => copyToClipboard(formatJSON(data.contextData.calendar.raw))}
								class="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
							>
								Copy
							</button>
						</div>
					</div>
				</GlassCard>
			</div>
		</div>
	</div>
</div>

