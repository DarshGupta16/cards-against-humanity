<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import { copyToClipboard } from "#lib/utils/clipboard";
import { AlertTriangle, Copy, Bot, RotateCcw } from "lucide-svelte";

let room = $derived(game.state.room);
let players = $derived(game.state.players);
let self = $derived(game.state.self);

async function copyPin() {
	if (!room) return;
	sound.playSelect();
	await copyToClipboard(room.pin);
}

function handleHostStopToLobby() {
	if (confirm("Return to Lobby? Current round progress will end.")) {
		game.stopGameToLobby();
	}
}
</script>

{#if players.length === 1 && !room?.randoCardrissian && room?.status !== "game_over"}
  <div class="w-full max-w-xl p-5 rounded-3xl bg-amber-500/15 border border-amber-500/35 text-center flex flex-col items-center gap-3 animate-fadeIn shadow-2xl">
    <div class="flex items-center gap-2 text-amber-300 font-black text-sm uppercase tracking-wider">
      <AlertTriangle class="w-4 h-4" />
      <span>Match Paused — Waiting for Players</span>
    </div>
    <p class="text-xs text-white/80 max-w-md leading-relaxed">
      You are currently the only player remaining in this room. Invite friends using your Room PIN or enable the chaos bot to resume playing.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
      <button
        onclick={copyPin}
        class="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <Copy class="w-3.5 h-3.5" />
        <span>Copy PIN ({room?.pin})</span>
      </button>
      {#if self?.isHost}
        <button
          onclick={() => game.updateSettings(undefined, true)}
          class="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Bot class="w-3.5 h-3.5" />
          <span>Enable Chaos Bot</span>
        </button>
        <button
          onclick={handleHostStopToLobby}
          class="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Return to Lobby</span>
        </button>
      {/if}
    </div>
  </div>
{/if}
