<script lang="ts">
	import SnakeGame from './SnakeGame.svelte';

	let {
		status = 500,
		message = 'Internal Server Error',
		showGame = true
	}: {
		status?: number;
		message?: string;
		showGame?: boolean;
	} = $props();

	function handleGameOver(score: number) {
		console.log('Game over! Final score:', score);
	}

	function handleScoreUpdate(score: number) {
		// Optional: Could emit score updates
	}
</script>

<div class="error-page">
	<div class="error-content">
		{#if showGame}
			<div class="game-section">
				<SnakeGame onGameOver={handleGameOver} onScoreUpdate={handleScoreUpdate} />
				<div class="error-actions">
					<button 
						type="button"
						onclick={() => window.location.reload()} 
						class="reload-button"
					>
						<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<span>Reload</span>
					</button>
				</div>
			</div>
		{/if}

		<div class="error-header">
			<h1 class="error-status">{status}</h1>
			<h2 class="error-message">{message}</h2>
			<p class="error-description">
				{#if status === 404}
					The page you're looking for doesn't exist.
				{:else if status === 403}
					You don't have permission to access this resource.
				{:else if status === 401}
					You need to be authenticated to access this resource.
				{:else}
					Something went wrong on our end. We're working to fix it!
				{/if}
			</p>
		</div>
	</div>
</div>

<style>
	.error-page {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100vw;
		height: 100vh;
		overflow-y: auto;
		overflow-x: hidden;
		background: #fafafa; /* Simple light cream color */
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
	}

	.error-content {
		position: relative;
		z-index: 10;
		width: 100%;
		max-width: 600px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
		padding: 1rem 1rem 2rem 1rem;
		box-sizing: border-box;
		min-height: min-content;
	}

	.game-section {
		position: relative;
		width: 100%;
		max-width: min(500px, 90vw);
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.error-header {
		text-align: center;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 2px solid rgba(0, 66, 170, 0.2);
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		width: 100%;
		flex-shrink: 0;
		margin-top: 1rem;
	}

	.error-status {
		font-size: 4rem;
		font-weight: bold;
		background: linear-gradient(135deg, var(--color-primary-600), var(--color-secondary-500));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 0.25rem 0;
		line-height: 1;
	}

	.error-message {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-primary-700);
		margin: 0 0 0.5rem 0;
	}

	.error-description {
		font-size: 0.875rem;
		color: var(--color-slate-600);
		margin: 0;
		line-height: 1.5;
	}

	.error-actions {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
		z-index: 20;
		pointer-events: auto;
	}

	.reload-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 2px solid rgba(0, 66, 170, 0.3);
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: var(--color-primary-700);
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		white-space: nowrap;
	}

	.reload-button:hover {
		background: rgba(255, 255, 255, 1);
		border-color: rgba(0, 66, 170, 0.5);
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
	}

	.reload-button:active {
		transform: translateY(0);
	}

	@media (max-width: 640px) {
		.error-page {
			padding: 0.5rem;
		}

		.error-content {
			gap: 0;
			padding: 0.5rem 0.5rem 1.5rem 0.5rem;
		}

		.error-header {
			padding: 1rem;
			margin-top: 0.75rem;
		}

		.error-status {
			font-size: 3rem;
		}

		.error-message {
			font-size: 1rem;
		}

		.error-description {
			font-size: 0.75rem;
		}

		.game-section {
			max-width: min(400px, 85vw);
		}

		.error-actions {
			bottom: 0.5rem;
			gap: 0.5rem;
			flex-direction: row;
			width: auto;
		}

		.reload-button {
			width: 100%;
			justify-content: center;
			font-size: 0.875rem;
			padding: 0.625rem 1rem;
		}
	}

	@media (max-height: 800px) {
		.error-content {
			gap: 0;
		}

		.error-actions {
			bottom: 0.5rem;
		}

		.error-header {
			margin-top: 0.75rem;
		}

		.error-status {
			font-size: 3rem;
		}

		.error-message {
			font-size: 1rem;
		}

		.error-description {
			font-size: 0.75rem;
		}

		.game-section {
			max-width: min(400px, 80vh);
		}

		.error-header {
			padding: 1rem;
		}
	}

	@media (max-height: 600px) {
		.error-content {
			gap: 0;
		}

		.error-actions {
			bottom: 0.5rem;
			gap: 0.5rem;
		}

		.error-header {
			margin-top: 0.5rem;
		}

		.error-status {
			font-size: 2.5rem;
		}

		.error-message {
			font-size: 0.875rem;
		}

		.error-description {
			font-size: 0.6875rem;
		}

		.game-section {
			max-width: min(300px, 70vh);
		}

		.error-header {
			padding: 0.75rem;
		}

		.error-actions {
			gap: 0.5rem;
		}

		.reload-button {
			padding: 0.5rem 1rem;
			font-size: 0.8125rem;
		}
	}
</style>

