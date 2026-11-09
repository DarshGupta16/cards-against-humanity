<script lang="ts">
import { X, UserX, ShieldAlert, KeyRound } from "lucide-svelte";
import type { Player } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";

interface Props {
	isOpen: boolean;
	player: Player | null;
	onclose: () => void;
	onconfirm: (
		playerId: string,
		block: boolean,
		scramble: boolean,
	) => Promise<void>;
}

let { isOpen, player, onclose, onconfirm }: Props = $props();

let blockPlayer = $state(true);
let scramblePin = $state(false);
let isSubmitting = $state(false);

function close() {
	sound.playSelect();
	onclose();
}

async function handleKick() {
	if (!player || isSubmitting) return;
	isSubmitting = true;
	try {
		await onconfirm(player.playerId, blockPlayer, scramblePin);
		onclose();
	} finally {
		isSubmitting = false;
	}
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") {
		close();
	}
}
</script>

{#if isOpen && player}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Remove Player"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn safe-pb safe-pt"
    onclick={close}
    onkeydown={handleKeydown}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      role="document"
      class="bg-[#141518] text-white border border-red-500/25 rounded-3xl max-w-md w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-y-auto animate-scaleUp"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-[#18191d] shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 font-black flex items-center justify-center text-sm border border-red-500/30 shrink-0">
            <UserX class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              Remove Player
            </h3>
            <p class="text-xs text-white/50">
              Host administrative action
            </p>
          </div>
        </div>
        <button
          onclick={close}
          class="min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-white/10 active:bg-white/20 text-white/60 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Close dialog"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 sm:p-6 space-y-5 text-sm">
        <p class="text-white/80 leading-relaxed">
          Are you sure you want to remove <strong class="text-white font-extrabold">{player.nickname}</strong> from this game?
        </p>

        <!-- Options Checkboxes -->
        <div class="space-y-3 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <label class="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              bind:checked={blockPlayer}
              class="mt-1 w-4 h-4 rounded bg-white/10 border-white/20 text-red-500 focus:ring-0 focus:ring-offset-0"
            />
            <div class="space-y-0.5">
              <div class="flex items-center gap-1.5 font-bold text-white text-xs sm:text-sm">
                <ShieldAlert class="w-3.5 h-3.5 text-red-400" />
                <span>Block from rejoining</span>
              </div>
              <p class="text-[11px] text-white/50">
                Blacklists their browser device identifier on this room.
              </p>
            </div>
          </label>

          <label class="flex items-start gap-3 cursor-pointer select-none border-t border-white/5 pt-3">
            <input
              type="checkbox"
              bind:checked={scramblePin}
              class="mt-1 w-4 h-4 rounded bg-white/10 border-white/20 text-red-500 focus:ring-0 focus:ring-offset-0"
            />
            <div class="space-y-0.5">
              <div class="flex items-center gap-1.5 font-bold text-white text-xs sm:text-sm">
                <KeyRound class="w-3.5 h-3.5 text-amber-400" />
                <span>Scramble Room PIN</span>
              </div>
              <p class="text-[11px] text-white/50">
                Generates a new 6-digit PIN. Existing players update automatically, but this person cannot rejoin from any other device.
              </p>
            </div>
          </label>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="p-4 sm:p-6 border-t border-white/10 bg-[#18191d] flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          onclick={close}
          class="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-sm transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onclick={handleKick}
          class="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <UserX class="w-4 h-4" />
          <span>{isSubmitting ? "Removing..." : "Remove Player"}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.15s ease-out;
  }
</style>
