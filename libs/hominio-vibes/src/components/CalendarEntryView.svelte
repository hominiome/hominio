<!--
	Calendar Entry UI Component
	Displays created or edited calendar entry with success confirmation
-->
<script>
	import { GlassCard } from '@hominio/brand';
	
	let { data, onClose } = $props();
	
	// Extract the entry (created or edited)
	const entry = $derived(data?.entry);
	const message = $derived(data?.message || 'Termin erfolgreich erstellt');
	
	// Detect if this is an edit or create based on message
	const isEdit = $derived(message?.toLowerCase().includes('aktualisiert') || message?.toLowerCase().includes('bearbeitet'));
	const actionTitle = $derived(isEdit ? 'Termin aktualisiert' : 'Termin erstellt');
	const badgeText = $derived(isEdit ? 'AKTUALISIERT' : 'NEU');
	const errorTitle = $derived(isEdit ? 'Fehler beim Aktualisieren' : 'Fehler beim Erstellen');
	const errorMessage = $derived(isEdit ? 'Der Termin konnte nicht aktualisiert werden.' : 'Der Termin konnte nicht erstellt werden.');
	
	// Helper functions for formatting
	function formatDate(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00'); // Parse as local date
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		
		if (date.toDateString() === today.toDateString()) {
			return 'Heute';
		}
		if (date.toDateString() === tomorrow.toDateString()) {
			return 'Morgen';
		}
		
		return date.toLocaleDateString('de-DE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}
	
	function formatTime(time) {
		return time; // Already in HH:MM format
	}
	
	function calculateEndTime(startTime, duration) {
		const [hours, minutes] = startTime.split(':').map(Number);
		const startMinutes = hours * 60 + minutes;
		const endMinutes = startMinutes + duration;
		const endHours = Math.floor(endMinutes / 60) % 24;
		const endMins = endMinutes % 60;
		return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
	}
	
	function formatDuration(duration) {
		if (duration < 60) {
			return `${duration} Min`;
		}
		const hours = Math.floor(duration / 60);
		const minutes = duration % 60;
		if (minutes === 0) {
			return `${hours} ${hours === 1 ? 'Std' : 'Std'}`;
		}
		return `${hours} ${hours === 1 ? 'Std' : 'Std'} ${minutes} Min`;
	}
	
</script>

<div class="w-full max-w-2xl mx-auto p-6">
	{#if entry}
		<!-- Success Header -->
		<div class="text-center mb-10">
			<div class="w-10 h-10 mx-auto mb-5 bg-gradient-to-br from-success-500/10 to-success-500/20 rounded-full flex items-center justify-center animate-scale-in">
				<svg class="w-5 h-5 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<h2 class="text-2xl font-extrabold text-primary-800 mb-3 tracking-tight">{actionTitle}</h2>
			<p class="text-sm text-primary-600 font-medium m-0">{message}</p>
		</div>
		
		<!-- Entry Card -->
		<GlassCard class="p-0 overflow-hidden border-0 bg-white/70 backdrop-blur-md shadow-xl shadow-success-500/10 rounded-3xl mb-8 animate-slide-up" lifted={true}>
			<div class="flex flex-row items-stretch">
				<!-- Time Column -->
				<div class="flex flex-col items-center justify-center py-10 px-7 bg-gradient-to-br from-success-500/5 to-secondary-500/5 min-w-[110px]">
					<span class="text-2xl font-extrabold text-primary-800 leading-none mb-2">{formatTime(entry.time)}</span>
					<div class="w-1 h-5 bg-gradient-to-b from-success-400/50 to-success-500/30 my-2.5 rounded-full"></div>
					<span class="text-base font-semibold text-primary-600">{calculateEndTime(entry.time, entry.duration)}</span>
				</div>
				
				<!-- Details Column -->
				<div class="flex-1 py-8 px-9 flex flex-col justify-center">
					<div class="flex items-center justify-between mb-5 gap-4">
						<h3 class="text-2xl font-bold text-primary-800 m-0 leading-tight flex-1">{entry.title}</h3>
						<span class="text-[0.7rem] bg-gradient-to-r from-success-500 to-success-600 text-white px-3 py-1.5 rounded-full font-bold tracking-wider uppercase flex-shrink-0 shadow-sm">
							{badgeText}
						</span>
					</div>
					
					<div class="flex flex-col gap-4 mb-5">
						<div class="flex items-center gap-3">
							<span class="text-base text-primary-600 font-medium">{formatDate(entry.date)}</span>
						</div>
						
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-secondary-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="12 6 12 12 16 14"></polyline>
							</svg>
							<span class="text-base text-primary-600 font-medium">{formatDuration(entry.duration)}</span>
						</div>
					</div>
					
					{#if entry.description}
						<p class="text-sm text-primary-600 leading-relaxed mt-3 pt-5 border-t border-slate-200/30">{entry.description}</p>
					{/if}
				</div>
			</div>
		</GlassCard>
	{:else}
		<!-- Error State -->
		<div class="mt-8">
			<GlassCard class="p-8 text-center">
				<div class="flex flex-col items-center gap-4">
					<svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<h3 class="text-xl font-bold text-primary-800 m-0">{errorTitle}</h3>
					<p class="text-sm text-primary-600 m-0">{errorMessage}</p>
				</div>
			</GlassCard>
		</div>
	{/if}
</div>

<style>
	@keyframes scale-in {
		from {
			transform: scale(0);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
	
	@keyframes slide-up {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	
	.animate-scale-in {
		animation: scale-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	.animate-slide-up {
		animation: slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Mobile Responsive */
	@media (max-width: 640px) {
		:global(.new-entry-card .flex-row) {
			flex-direction: column;
		}
		
		:global(.new-entry-card .flex-row > div:first-child) {
			flex-direction: row;
			padding: 1rem 1.5rem;
			border-right: none;
			border-bottom: 2px solid rgba(16, 185, 129, 0.15);
			justify-content: flex-start;
			gap: 1rem;
			width: 100%;
		}
		
		:global(.new-entry-card .flex-row > div:first-child > div:first-child) {
			width: 16px;
			height: 3px;
			margin: 0;
		}
		
		:global(.new-entry-card .flex-row > div:last-child) {
			padding: 1.25rem 1.5rem;
		}
	}
</style>
