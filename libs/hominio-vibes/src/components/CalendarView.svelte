<!--
	Calendar UI Component
	Displays calendar entries in a week view (today + next 6 days)
	Top-to-bottom list with glass card styling
-->
<script>
	import { GlassCard } from '@hominio/brand';
	import { calendarEntries } from '@hominio/vibes';
	
	let { data, onClose } = $props();
	
	// Get entries from data or store
	const entries = $derived(data?.entries || []);
	const entriesByDate = $derived(data?.entriesByDate || {});
	const weekStart = $derived(data?.weekStart);
	const weekEnd = $derived(data?.weekEnd);
	
	// Helper to parse YYYY-MM-DD as local date (midnight)
	function parseLocalYMD(dateStr) {
		if (!dateStr) return new Date();
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	// Helper to check if two dates are the same day
	function isSameDay(d1, d2) {
		return d1.getFullYear() === d2.getFullYear() &&
			   d1.getMonth() === d2.getMonth() &&
			   d1.getDate() === d2.getDate();
	}

	// Generate dates with appointments (up to next 7 appointments worth of days)
	const datesWithAppointments = $derived.by(() => {
		if (!entries || entries.length === 0) return [];
		
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		
		// Sort entries by date and time
		const sortedEntries = [...entries].sort((a, b) => {
			const dateA = parseLocalYMD(a.date);
			const dateB = parseLocalYMD(b.date);
			if (dateA.getTime() !== dateB.getTime()) {
				return dateA.getTime() - dateB.getTime();
			}
			// If same date, sort by time
			const [hoursA, minsA] = a.time.split(':').map(Number);
			const [hoursB, minsB] = b.time.split(':').map(Number);
			return (hoursA * 60 + minsA) - (hoursB * 60 + minsB);
		});
		
		// Get unique dates that have appointments, sorted chronologically
		const uniqueDates = new Set();
		const datesMap = new Map();
		
		for (const entry of sortedEntries) {
			const dateStr = entry.date;
			if (!uniqueDates.has(dateStr)) {
				uniqueDates.add(dateStr);
				const dateObj = parseLocalYMD(dateStr);
				datesMap.set(dateStr, {
					date: dateStr,
					dateObj: dateObj,
					isToday: isSameDay(dateObj, today)
				});
			}
		}
		
		// Convert to array and sort by date
		const datesArray = Array.from(datesMap.values()).sort((a, b) => {
			return a.dateObj.getTime() - b.dateObj.getTime();
		});
		
		// Limit to next 7 appointments worth of days (or all if less than 7)
		return datesArray.slice(0, 7);
	});
	
	function formatDate(dateObj) {
		const today = new Date();
		const date = new Date(dateObj);
		
		if (isSameDay(date, today)) {
			return 'Heute';
		}
		
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		if (isSameDay(date, tomorrow)) {
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

<div class="w-full max-w-3xl mx-auto p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-12 text-center">
		<h2 class="text-3xl sm:text-4xl font-extrabold mb-2 bg-gradient-to-br from-secondary-400 to-secondary-500 bg-clip-text text-transparent tracking-tight">
			Dein Kalender
		</h2>
	</div>
	
	<!-- Appointments View: Only show days with appointments -->
	<div class="flex flex-col gap-12">
		{#each datesWithAppointments as { date, dateObj, isToday } (date)}
			{@const dayEntries = entriesByDate[date] || []}
			{#if dayEntries.length > 0}
				<div class="w-full relative">
					<!-- Day Header - Organic, no borders -->
					<div class="flex items-center justify-between mb-6">
						<h3 class="text-2xl font-bold {isToday ? 'text-secondary-500' : 'text-primary-800'} m-0 flex items-center gap-3">
							{formatDate(dateObj)}
							{#if isToday}
								<span class="text-xs bg-gradient-to-r from-secondary-400 to-secondary-500 text-white px-3 py-1 rounded-full font-bold tracking-wider uppercase shadow-sm">
									HEUTE
								</span>
							{/if}
						</h3>
						{#if dayEntries.length > 0}
							<span class="text-sm text-primary-600 font-medium bg-gradient-to-r from-primary-50 to-primary-100/50 px-4 py-1.5 rounded-full shadow-sm">
								{dayEntries.length} {dayEntries.length === 1 ? 'Termin' : 'Termine'}
							</span>
						{/if}
					</div>
					
					<!-- Day Entries -->
					<div class="flex flex-col gap-5">
						{#each dayEntries as entry (entry.id)}
							<GlassCard class="p-0 overflow-hidden bg-white/70 backdrop-blur-md shadow-lg rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:bg-white/90 hover:shadow-xl hover:shadow-secondary-500/20 border-0">
								<div class="flex flex-row items-stretch">
									<!-- Time Column - Organic styling -->
									<div class="flex flex-col items-center justify-center py-8 px-6 bg-gradient-to-br from-secondary-500/5 to-secondary-500/10 min-w-[100px]">
										<span class="text-xl font-bold text-primary-800 leading-none mb-2">{formatTime(entry.time)}</span>
										<div class="w-1 h-4 bg-gradient-to-b from-secondary-400/40 to-secondary-500/20 my-2 rounded-full"></div>
										<span class="text-sm font-semibold text-primary-600">{calculateEndTime(entry.time, entry.duration)}</span>
									</div>
									
									<!-- Details Column -->
									<div class="flex-1 py-6 px-7 flex flex-col justify-center">
										<h4 class="text-xl font-bold text-primary-800 mb-3 leading-tight">{entry.title}</h4>
										
										<div class="flex items-center gap-3 mb-3">
											<span class="inline-flex items-center gap-2 text-xs text-secondary-600 bg-gradient-to-r from-secondary-500/10 to-secondary-500/5 px-3 py-1.5 rounded-lg font-semibold">
												<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<circle cx="12" cy="12" r="10"></circle>
													<polyline points="12 6 12 12 16 14"></polyline>
												</svg>
												{formatDuration(entry.duration)}
											</span>
										</div>
										
										{#if entry.description}
											<p class="text-sm text-primary-600 leading-relaxed mt-2">{entry.description}</p>
										{/if}
									</div>
								</div>
							</GlassCard>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>
	
	<!-- Empty State (if no entries at all) - Elegant Brand Styling -->
	{#if entries.length === 0}
		<div class="mt-20 flex justify-center">
			<GlassCard class="p-16 max-w-lg text-center border-0 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl shadow-2xl shadow-secondary-500/10 rounded-3xl">
				<div class="flex flex-col items-center gap-8">
					<!-- Icon with gradient background -->
					<div class="w-24 h-24 bg-gradient-to-br from-secondary-400/20 via-secondary-500/15 to-secondary-600/10 rounded-3xl flex items-center justify-center shadow-lg shadow-secondary-500/20">
						<svg class="w-12 h-12 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
						</svg>
					</div>
					
					<!-- Text Content -->
					<div class="space-y-3">
						<h3 class="text-2xl font-bold bg-gradient-to-br from-primary-800 to-primary-700 bg-clip-text text-transparent m-0">
							Keine Termine vorhanden
						</h3>
						<p class="text-base text-primary-600/80 m-0 leading-relaxed font-medium">
							Erstelle einen neuen Termin, um zu beginnen.
						</p>
					</div>
				</div>
			</GlassCard>
		</div>
	{/if}
</div>

<style>
	/* Mobile Responsive */
	@media (max-width: 640px) {
		:global(.calendar-entry-card .flex-row) {
			flex-direction: column;
		}
		
		:global(.calendar-entry-card .flex-row > div:first-child) {
			flex-direction: row;
			padding: 0.75rem 1rem;
			border-right: none;
			border-bottom: 1px solid rgba(45, 166, 180, 0.08);
			justify-content: flex-start;
			gap: 0.75rem;
			width: 100%;
		}
		
		:global(.calendar-entry-card .flex-row > div:first-child > div:first-child) {
			width: 12px;
			height: 2px;
			margin: 0;
		}
		
		:global(.calendar-entry-card .flex-row > div:last-child) {
			padding: 1rem;
		}
	}
</style>
