<script lang="ts">
	import { goto } from '$app/navigation';
	import { GlassCard, GlassInfoCard, LoadingSpinner } from '@hominio/brand';
	import { createAuthClient } from '@hominio/auth';

	const authClient = createAuthClient();
	const session = authClient.useSession();

	// Hardcoded agents list - can be expanded later
	const agents = [
		{
			id: 'charles',
			name: 'Charles',
			role: 'Hotel Concierge',
			description: 'Your personal AI hotel concierge assistant. Charles helps you with bookings, recommendations, and all your hotel needs.',
			color: 'from-[#45b8c8] to-[#2da6b4]', // Secondary brand color gradient
			avatar: '/brand/agents/charles.png'
		},
		{
			id: 'karl',
			name: 'Karl',
			role: 'Calendar Assistant',
			description: 'Your personal calendar assistant. Karl helps you create, edit, and manage your calendar entries.',
			color: 'from-[#45b8c8] to-[#2da6b4]', // Secondary brand color gradient (same as Charles)
			avatar: '/brand/agents/karl.png'
		}
	];

</script>

<div class="relative min-h-screen overflow-x-hidden bg-glass-gradient px-6 pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))]">

	<div class="relative z-10 mb-8 text-center md:mb-12">
		<h1 class="mb-1 text-3xl font-bold tracking-tight text-slate-900 md:mb-2 md:text-4xl lg:text-5xl">My Agents</h1>
		<p class="text-sm font-normal text-slate-600 md:text-base">To start, just click the mic button and ask for Karl or Charles to help you.</p>
	</div>

	<!-- Agents Grid -->
	<div class="grid relative z-10 gap-4 mx-auto mb-8 max-w-6xl md:gap-8 md:mb-12 md:grid-cols-2 lg:grid-cols-3">
		{#each agents as agent (agent.id)}
		<GlassCard 
			lifted={true} 
			class="overflow-hidden relative p-4 md:p-8"
		>
				<!-- Gradient Background -->
				<div class="absolute inset-0 bg-gradient-to-br {agent.color} opacity-5"></div>
				
				<!-- Mobile: Horizontal Layout -->
				<div class="flex relative flex-row items-start gap-3 md:hidden">
					<!-- Left: Avatar and Name -->
					<div class="flex-shrink-0 flex flex-col items-center">
						<img 
							src={agent.avatar} 
							alt={agent.name}
							class="w-12 h-12 rounded-full object-cover mb-1"
						/>
						<h2 class="text-sm font-bold text-slate-900 text-center">
							{agent.name}
						</h2>
					</div>
					
					<!-- Right: Description -->
					<div class="flex-1 min-w-0">
						<div class="mb-1">
							<div class="inline-block rounded-full bg-gradient-to-r {agent.color} px-2 py-0.5 text-xs font-semibold text-white">
								{agent.role}
							</div>
						</div>
						<p class="text-xs leading-tight text-slate-600">
							{agent.description}
						</p>
					</div>
				</div>

				<!-- Tablet/Desktop: Vertical Centered Layout -->
				<div class="hidden md:flex relative flex-col items-center text-center">
					<!-- Avatar -->
					<div class="mb-2">
						<img 
							src={agent.avatar} 
							alt={agent.name}
							class="w-16 h-16 rounded-full object-cover"
						/>
					</div>
					
					<!-- Name -->
					<h2 class="mb-2 text-2xl font-bold text-slate-900">
						{agent.name}
					</h2>
					
					<!-- Role -->
					<div class="mb-4 inline-block rounded-full bg-gradient-to-r {agent.color} px-4 py-1 text-sm font-semibold text-white">
						{agent.role}
					</div>
					
					<!-- Description -->
					<p class="text-sm leading-relaxed text-slate-600">
						{agent.description}
					</p>
				</div>
			</GlassCard>
		{/each}
	</div>
</div>
