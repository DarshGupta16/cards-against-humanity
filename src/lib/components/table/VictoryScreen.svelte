<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import { Crown, Clock, RotateCcw, Trash2 } from "lucide-svelte";

let isAdvancing = $state(false);
let now = $state(Date.now());

let room = $derived(game.state.room);
let players = $derived(game.state.players);
let self = $derived(game.state.self);

let gameWinnerPlayer = $derived(
	players.find((p: any) => p.playerId === room?.gameWinnerPlayerId),
);

$effect(() => {
	if (!room?.scheduledDeletionAt) return;
	const interval = setInterval(() => {
		now = Date.now();
	}, 1000);
	return () => clearInterval(interval);
});

let timeRemainingFormatted = $derived.by(() => {
	if (!room?.scheduledDeletionAt) return "";
	const diffMs = Math.max(0, room.scheduledDeletionAt - now);
	const mins = Math.floor(diffMs / 60000);
	const secs = Math.floor((diffMs % 60000) / 1000);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
});

async function handleRestart() {
	if (isAdvancing) return;
	isAdvancing = true;
	try {
		await game.restartGame();
	} finally {
		setTimeout(() => (isAdvancing = false), 500);
	}
}

function handleHostStopToLobby() {
	if (confirm("Return to Lobby? Current round progress will end.")) {
		game.stopGameToLobby();
	}
}

function handleHostDisband() {
	if (
		confirm(
			"Disband room? All match data will be permanently deleted from the server.",
		)
	) {
		sound.playThud();
		game.deleteRoom();
	}
}
</script>

{#if room?.status === "game_over"}
  <div class="w-full max-w-2xl bg-gradient-to-b from-[#202228] to-[#131418] border border-amber-400/50 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
    <div class="w-16 h-16 rounded-3xl bg-amber-400 text-black flex items-center justify-center shadow-lg">
      <Crown class="w-10 h-10" />
    </div>
    <div>
      <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight">
        Game Over!
      </h2>
      <p class="text-lg text-amber-300 font-bold mt-2">
        🏆 {gameWinnerPlayer?.nickname || (room.gameWinnerPlayerId === "rando" ? "Rando Cardrissian (Bot)" : "The Winner")} wins the game!
      </p>
    </div>

    <!-- Final Leaderboard -->
    <div class="w-full max-w-md bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-2">
      {#each [...players].sort((a, b) => b.score - a.score) as p, idx (p.playerId)}
        <div class="flex items-center justify-between p-2 rounded-xl bg-white/5">
          <div class="flex items-center gap-2">
            <span class="font-bold text-xs text-white/50">#{idx + 1}</span>
            <span class="font-extrabold text-sm text-white">{p.nickname}</span>
          </div>
          <span class="font-black text-sm text-amber-400">{p.score} pts</span>
        </div>
      {/each}
    </div>

    {#if room?.scheduledDeletionAt}
      <div class="text-xs font-bold text-amber-300/80 flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 px-3.5 py-2 rounded-xl">
        <Clock class="w-4 h-4 text-amber-400 shrink-0" />
        <span>Room auto-disbands in {timeRemainingFormatted}</span>
      </div>
    {/if}

    {#if self?.isHost}
      <div class="flex flex-wrap items-center justify-center gap-3">
        <button
          onclick={handleRestart}
          disabled={isAdvancing}
          class="min-h-[48px] px-7 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-base transition-all shadow-xl active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw class="w-5 h-5" />
          <span>Play Again</span>
        </button>

        <button
          onclick={handleHostStopToLobby}
          class="min-h-[48px] px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/15 cursor-pointer"
        >
          <span>Back to Lobby</span>
        </button>

        <button
          onclick={handleHostDisband}
          class="min-h-[48px] px-5 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm transition-all border border-red-500/20 cursor-pointer flex items-center gap-1.5"
        >
          <Trash2 class="w-4 h-4" />
          <span>Disband</span>
        </button>
      </div>
    {/if}
  </div>
{/if}
