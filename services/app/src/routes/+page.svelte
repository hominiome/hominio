<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		// Redirect to /me (projects page)
		goto('/me');
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-[#f2f4f6] to-[#e9ecef] flex flex-col items-center justify-center font-sans text-slate-800">
	<!-- Decorative background blobs -->
	<div class="fixed -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-blue-200/20 blur-3xl filter pointer-events-none"></div>
	<div class="fixed top-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-purple-200/20 blur-3xl filter pointer-events-none"></div>
	<div class="relative flex flex-col items-center">
		<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800"></div>
		<p class="mt-4 text-sm font-medium text-slate-500">Loading...</p>
	</div>
</div>
