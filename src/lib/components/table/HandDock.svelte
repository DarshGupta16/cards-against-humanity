<script lang="ts">
import { game, type Submission } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import CardComponent from "../Card.svelte";
import { Check } from "lucide-svelte";

let room = $derived(game.state.room);
let self = $derived(game.state.self);
let isCzar = $derived(Boolean(game.state.isCzar));
let submissions = $derived(game.state.submissions);
let blackCard = $derived(room?.blackCard);
let selectedIds = $derived(game.selectedCardIds);

let requiredPick = $derived(blackCard?.pick ?? 1);
let hasSubmitted = $derived(
	Boolean(self && submissions.some((s: Submission) => s.isSelf)),
);
let canSubmit = $derived(
	!isCzar && !hasSubmitted && selectedIds.length === requiredPick,
);

let hasHandDock = $derived(
	!isCzar &&
		room?.status === "submitting" &&
		Boolean(self?.hand && self.hand.length > 0),
);

function handleCardClick(cardId: string) {
	if (isCzar || room?.status !== "submitting" || hasSubmitted) return;
	game.toggleCardSelection(cardId);
}

function handleClearSelection() {
	sound.playSelect();
	game.clearSelection();
}

function handleSubmit() {
	if (!canSubmit) return;
	game.submitCards();
}
</script>

{#if hasHandDock && self?.hand}
  <footer class="w-full border-t border-white/15 bg-[#121316]/95 backdrop-blur-xl fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 safe-pb shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
    <div class="max-w-6xl mx-auto flex flex-col gap-2.5 sm:gap-3">
      <!-- Hand Header and Submit Button -->
      <div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span class="text-xs font-black tracking-wider uppercase text-white/70">
            Your Hand ({self.hand.length})
          </span>
          <span class="text-[11px] text-white/40">
            Selected: {selectedIds.length} / {requiredPick}
          </span>
          {#if selectedIds.length > 0 && !hasSubmitted}
            <button
              onclick={handleClearSelection}
              class="min-h-[36px] px-2 py-1 flex items-center text-[11px] text-white/50 hover:text-white underline cursor-pointer"
            >
              Clear
            </button>
          {/if}
        </div>

        {#if !hasSubmitted}
          <button
            onclick={handleSubmit}
            disabled={!canSubmit || game.isSubmitting}
            class="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all shadow-lg flex items-center justify-center gap-2 {
              canSubmit
                ? 'bg-white hover:bg-neutral-200 text-black active:scale-95 cursor-pointer'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }"
          >
            <span>Submit Selection</span>
          </button>
        {:else}
          <span class="text-xs font-bold text-emerald-400 flex items-center gap-1 min-h-[44px]">
            <Check class="w-4 h-4 stroke-[3]" />
            Submitted
          </span>
        {/if}
      </div>

      <!-- Cards Horizontal Scroll Tray (F-07: Keyed loop) -->
      <div class="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 pt-1 hand-scroll touch-pan-x overscroll-x-contain">
        {#each self.hand as card (card.id)}
          {@const isSelected = selectedIds.includes(card.id)}
          {@const pickIdx = isSelected ? selectedIds.indexOf(card.id) + 1 : undefined}
          <CardComponent
            type="white"
            text={card.text}
            size="hand"
            selectable={!hasSubmitted}
            selected={isSelected}
            pickIndex={pickIdx}
            onclick={() => handleCardClick(card.id)}
          />
        {/each}
      </div>
    </div>
  </footer>
{/if}
