<script lang="ts">
import { game, type Submission } from "#lib/gameStore.svelte";
import CardComponent from "../Card.svelte";
import { Eye, Trophy, Check } from "lucide-svelte";

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

// F-13: Only the Card Czar can reveal submissions during judging
function handleReveal(sub: Submission) {
	if (!isCzar) return;
	game.revealSubmission(sub._id);
}

function handlePickWinner(sub: Submission) {
	if (!isCzar) return;
	game.pickWinner(sub._id);
}
</script>

<!-- Active Black Card -->
{#if blackCard}
  <div class="flex flex-col items-center gap-3">
    <CardComponent
      type="black"
      text={blackCard.text}
      pick={blackCard.pick}
      size="lg"
    />
    <div class="text-xs font-black tracking-widest uppercase text-white/50">
      {(blackCard.pick ?? 1) > 1 ? `Pick ${blackCard.pick} White Cards` : "Pick 1 White Card"}
    </div>
  </div>
{/if}

<!-- Round Status Banner -->
<div class="w-full max-w-xl text-center">
  {#if room?.status === "submitting"}
    {#if isCzar}
      <div class="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-200 text-sm font-bold flex items-center justify-center gap-2">
        <span>You are judging this round. Waiting for players to submit cards...</span>
      </div>
    {:else if hasSubmitted}
      <!-- F-08: Clean status for already submitted players -->
      <div class="p-4 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-bold flex items-center justify-center gap-2">
        <Check class="w-4 h-4 text-emerald-400 stroke-[3]" />
        <span>Cards submitted! Waiting for other players to finish...</span>
      </div>
    {:else if self?.hand && self.hand.length > 0 && selectedIds.length === 0}
      <div class="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 text-sm font-bold">
        Select {requiredPick === 1 ? "1 card" : `${requiredPick} cards in order`} from your hand below.
      </div>
    {:else if canSubmit}
      <div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-bold animate-pulse">
        Ready to submit! Click "Submit Selection" below.
      </div>
    {/if}
  {:else if room?.status === "judging"}
    <div class="p-4 rounded-2xl bg-white/10 border border-white/20 text-white text-sm font-extrabold flex flex-col items-center gap-1">
      <div class="flex items-center gap-2">
        <Eye class="w-4 h-4 text-amber-400" />
        <span>JUDGING PHASE</span>
      </div>
      <p class="text-xs text-white/70 font-normal">
        {#if isCzar}
          Click each card to reveal it in 3D, read it aloud, and select your favorite as the winner!
        {:else}
          The Card Czar is reviewing submissions and choosing a winner...
        {/if}
      </p>
      {#if isCzar}
        <button
          onclick={() => game.revealAll()}
          class="min-h-[44px] px-3 py-2 mt-2 text-xs font-bold underline text-white/70 hover:text-white inline-flex items-center justify-center cursor-pointer"
        >
          Reveal All Cards
        </button>
      {/if}
    </div>
  {/if}
</div>

<!-- Table Submissions Area (F-07: Keyed loops; F-06: 3D Flip; F-03: Anonymity) -->
<div class="w-full flex flex-col items-center gap-6">
  <div class="flex items-center gap-2 text-xs font-black tracking-widest uppercase text-white/40">
    <span>Table Submissions ({submissions.length})</span>
  </div>

  <div class="flex flex-wrap items-center justify-center gap-3 sm:gap-6 w-full">
    {#each submissions as sub, subIdx (sub._id)}
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-2">
          {#each sub.cards as card (card.id)}
            <!-- F-06: 3D Animated Flip Card -->
            <CardComponent
              type="white"
              text={card.text}
              size="md"
              flipMode={true}
              isFlipped={sub.isRevealed}
              selectable={isCzar && !sub.isRevealed}
              onclick={() => handleReveal(sub)}
            />
          {/each}
        </div>

        <!-- F-03: Submitter identity strictly hidden during judging -->
        <div class="flex flex-col items-center gap-1">
          {#if room?.status === "round_over" || room?.status === "game_over"}
            <span class="text-xs text-white/80 font-bold">
              {sub.playerName}
            </span>
          {:else}
            <span class="text-xs text-white/40 font-bold">
              Card #{subIdx + 1}
            </span>
          {/if}

          {#if isCzar && room?.status === "judging" && sub.isRevealed}
            <button
              onclick={() => handlePickWinner(sub)}
              class="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition-transform active:scale-95 shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Trophy class="w-3.5 h-3.5" />
              <span>Pick as Winner</span>
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
