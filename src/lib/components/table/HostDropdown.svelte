<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import { Crown, RotateCcw, Trash2 } from "lucide-svelte";

let showHostMenu = $state(false);

function handleHostStopToLobby() {
	if (confirm("Return to Lobby? Current round progress will end.")) {
		game.stopGameToLobby();
	}
}

function handleHostRestart() {
	if (confirm("Restart game with scores reset to 0?")) {
		game.restartGame();
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

<div class="relative">
  <button
    onclick={() => (showHostMenu = !showHostMenu)}
    class="min-w-[44px] min-h-[44px] px-2.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 active:bg-amber-400/30 text-amber-300 font-bold text-xs transition-colors border border-amber-400/30 flex items-center gap-1 cursor-pointer"
    title="Host Actions Menu"
  >
    <Crown class="w-3.5 h-3.5" />
    <span class="hidden sm:inline">Host</span>
  </button>

  {#if showHostMenu}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-40"
      onclick={() => (showHostMenu = false)}
    ></div>
    <div class="absolute right-0 top-full mt-2 w-48 bg-[#181a1f] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 text-xs font-bold text-white">
      <button
        onclick={() => {
          showHostMenu = false;
          handleHostStopToLobby();
        }}
        class="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5 text-white/70" />
        <span>Return to Lobby</span>
      </button>
      <button
        onclick={() => {
          showHostMenu = false;
          handleHostRestart();
        }}
        class="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5 text-amber-400" />
        <span>Restart Match</span>
      </button>
      <button
        onclick={() => {
          showHostMenu = false;
          handleHostDisband();
        }}
        class="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Trash2 class="w-3.5 h-3.5" />
        <span>Disband Room</span>
      </button>
    </div>
  {/if}
</div>
