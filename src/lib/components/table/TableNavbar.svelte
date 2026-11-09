<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import { copyToClipboard } from "#lib/utils/clipboard";
import { modalStore } from "#lib/modalStore.svelte";
import HostDropdown from "./HostDropdown.svelte";
import ScoreboardStrip from "./ScoreboardStrip.svelte";
import {
	Copy,
	Check,
	Crown,
	Volume2,
	VolumeX,
	BookOpen,
	LogOut,
} from "lucide-svelte";

let pinCopied = $state(false);
let soundEnabled = $state(sound.enabled);

let room = $derived(game.state.room);
let players = $derived(game.state.players);
let self = $derived(game.state.self);
let isCzar = $derived(Boolean(game.state.isCzar));

let currentCzarPlayer = $derived(
	players.find((p: any) => p.playerId === room?.currentCzarId),
);

function toggleSound() {
	soundEnabled = sound.toggle();
}

async function copyPin() {
	if (!room) return;
	sound.playSelect();
	const ok = await copyToClipboard(room.pin);
	if (ok) {
		pinCopied = true;
		setTimeout(() => (pinCopied = false), 2000);
	}
}
</script>

<header class="w-full border-b border-white/10 bg-[#121316]/95 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-4 py-2 sm:py-3">
  <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
    <!-- Left: Game Info & PIN -->
    <div class="flex items-center gap-2 sm:gap-3">
      <button
        onclick={copyPin}
        class="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-mono text-xs font-black transition-colors cursor-pointer"
        title="Click to copy PIN"
      >
        <span>PIN: {room?.pin}</span>
        {#if pinCopied}
          <Check class="w-4 h-4 text-emerald-400 stroke-[3]" />
        {:else}
          <Copy class="w-4 h-4 text-white/60" />
        {/if}
      </button>

      <div class="hidden md:flex items-center gap-2 text-xs text-white/60 font-bold">
        <span>Round {room?.currentRound}</span>
        <span>·</span>
        <span>First to {room?.targetScore} pts</span>
      </div>
    </div>

    <!-- Center: Czar Status Pill -->
    <div class="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-center sm:justify-start">
      {#if isCzar}
        <div class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-black shadow-sm">
          <Crown class="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>YOU ARE THE CARD CZAR</span>
        </div>
      {:else}
        <div class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-bold max-w-[240px] sm:max-w-none truncate">
          <Crown class="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span class="truncate">Czar: {currentCzarPlayer?.nickname || "Player"}</span>
        </div>
      {/if}
    </div>

    <!-- Right: Controls -->
    <div class="order-2 sm:order-3 flex items-center gap-1.5 sm:gap-2">
      {#if self?.isHost}
        <HostDropdown />
      {/if}

      <button
        onclick={toggleSound}
        class="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
        title={soundEnabled ? "Mute sounds" : "Enable sounds"}
      >
        {#if soundEnabled}
          <Volume2 class="w-4 h-4" />
        {:else}
          <VolumeX class="w-4 h-4 text-red-400" />
        {/if}
      </button>

      <button
        onclick={() => modalStore.openRules()}
        class="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
        aria-label="Game Rules"
        title="Game Rules"
      >
        <BookOpen class="w-4 h-4" />
      </button>

      <button
        onclick={() => game.leaveRoom()}
        class="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/25 text-red-400 transition-colors border border-red-500/20 flex items-center justify-center cursor-pointer"
        aria-label="Leave Game"
        title="Leave Game"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </div>

  <ScoreboardStrip />
</header>
