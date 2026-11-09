<script lang="ts">
import { game, type Submission } from "#lib/gameStore.svelte";
import CardComponent from "../Card.svelte";
import { Trophy, ChevronRight } from "lucide-svelte";

let isAdvancing = $state(false);

let room = $derived(game.state.room);
let players = $derived(game.state.players);
let self = $derived(game.state.self);
let isCzar = $derived(Boolean(game.state.isCzar));
let submissions = $derived(game.state.submissions);

let winningSubmission = $derived(
	submissions.find((s: Submission) => s._id === room?.winningSubmissionId),
);

let roundWinnerPlayer = $derived(
	players.find((p: any) => p.playerId === room?.roundWinnerPlayerId),
);

async function handleNextRound() {
	if (isAdvancing) return;
	isAdvancing = true;
	try {
		await game.nextRound();
	} finally {
		setTimeout(() => (isAdvancing = false), 500);
	}
}
</script>

{#if room?.status === "round_over" && winningSubmission}
  <div class="w-full max-w-2xl bg-gradient-to-b from-[#1c1e24] to-[#121316] border border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-4 animate-scaleUp">
    <div class="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black">
      <Trophy class="w-6 h-6" />
    </div>
    <div>
      <h3 class="text-2xl sm:text-3xl font-black text-white">
        {roundWinnerPlayer?.nickname || winningSubmission.playerName} won the round!
      </h3>
      <p class="text-sm text-white/60 mt-1">+1 Awesome Point awarded</p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-3 my-2">
      {#each winningSubmission.cards as card (card.id)}
        <CardComponent
          type="white"
          text={card.text}
          size="sm"
        />
      {/each}
    </div>

    {#if self?.isHost || isCzar}
      <button
        onclick={handleNextRound}
        disabled={isAdvancing}
        class="min-h-[48px] px-8 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-base transition-all shadow-xl active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
      >
        <span>Next Round</span>
        <ChevronRight class="w-5 h-5" />
      </button>
    {:else}
      <p class="text-xs text-white/50 animate-pulse">Waiting for host/czar to begin next round...</p>
    {/if}
  </div>
{/if}

<style>
  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-scaleUp {
    animation: scaleUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
</style>
