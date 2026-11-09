<script lang="ts">
import { game, type Submission } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import CardComponent from "./Card.svelte";
import RulesModal from "./RulesModal.svelte";
import EditDisplayNameModal from "./EditDisplayNameModal.svelte";
import {
	Volume2,
	VolumeX,
	LogOut,
	Crown,
	BookOpen,
	Copy,
	Check,
	Trophy,
	Eye,
	ChevronRight,
	RotateCcw,
	Sparkles,
	Pencil,
} from "lucide-svelte";

let showRules = $state(false);
let showEditName = $state(false);
let soundEnabled = $state(sound.enabled);
let pinCopied = $state(false);
let isAdvancing = $state(false); // F-12: guard against double-clicks

let room = $derived(game.state.room);
let players = $derived(game.state.players);
let self = $derived(game.state.self);
let isCzar = $derived(Boolean(game.state.isCzar));
let submissions = $derived(game.state.submissions);
let blackCard = $derived(room?.blackCard);
let selectedIds = $derived(game.selectedCardIds);

let requiredPick = $derived(blackCard?.pick ?? 1);
let hasSubmitted = $derived(Boolean(self && submissions.some((s) => s.isSelf)));
let canSubmit = $derived(
	!isCzar && !hasSubmitted && selectedIds.length === requiredPick,
);

let currentCzarPlayer = $derived(
	players.find((p) => p.playerId === room?.currentCzarId),
);

let winningSubmission = $derived(
	submissions.find((s) => s._id === room?.winningSubmissionId),
);

let roundWinnerPlayer = $derived(
	players.find((p) => p.playerId === room?.roundWinnerPlayerId),
);

let gameWinnerPlayer = $derived(
	players.find((p) => p.playerId === room?.gameWinnerPlayerId),
);

function toggleSound() {
	soundEnabled = sound.toggle();
}

async function copyPin() {
	if (!room) return;
	sound.playSelect();
	try {
		await navigator.clipboard.writeText(room.pin);
		pinCopied = true;
		setTimeout(() => (pinCopied = false), 2000);
	} catch {
		// fallback
	}
}

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

// F-13: Only the Card Czar can reveal submissions during judging
function handleReveal(sub: Submission) {
	if (!isCzar) return;
	game.revealSubmission(sub._id);
}

function handlePickWinner(sub: Submission) {
	if (!isCzar) return;
	game.pickWinner(sub._id);
}

async function handleNextRound() {
	if (isAdvancing) return;
	isAdvancing = true;
	try {
		await game.nextRound();
	} finally {
		setTimeout(() => (isAdvancing = false), 500);
	}
}

async function handleRestart() {
	if (isAdvancing) return;
	isAdvancing = true;
	try {
		await game.startGame();
	} finally {
		setTimeout(() => (isAdvancing = false), 500);
	}
}
</script>

<div class="min-h-screen flex flex-col justify-between bg-[#0a0a0c] text-white select-none">
  <!-- Top Navigation & Status Bar -->
  <header class="w-full border-b border-white/10 bg-[#121316]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
    <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
      <!-- Left: Game Info & PIN -->
      <div class="flex items-center gap-3">
        <button
          onclick={copyPin}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-black transition-colors"
          title="Click to copy PIN"
        >
          <span>PIN: {room?.pin}</span>
          {#if pinCopied}
            <Check class="w-3.5 h-3.5 text-emerald-400" />
          {:else}
            <Copy class="w-3.5 h-3.5 text-white/60" />
          {/if}
        </button>

        <div class="hidden sm:flex items-center gap-2 text-xs text-white/60 font-bold">
          <span>Round {room?.currentRound}</span>
          <span>·</span>
          <span>First to {room?.targetScore} pts</span>
        </div>
      </div>

      <!-- Center: Czar Status Pill -->
      <div class="flex items-center gap-2">
        {#if isCzar}
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-black shadow-sm">
            <Crown class="w-3.5 h-3.5 text-amber-400" />
            <span>YOU ARE THE CARD CZAR</span>
          </div>
        {:else}
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold">
            <Crown class="w-3.5 h-3.5 text-amber-400" />
            <span>Czar: {currentCzarPlayer?.nickname || "Player"}</span>
          </div>
        {/if}
      </div>

      <!-- Right: Controls -->
      <div class="flex items-center gap-2">
        <button
          onclick={toggleSound}
          class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title={soundEnabled ? "Mute sounds" : "Enable sounds"}
        >
          {#if soundEnabled}
            <Volume2 class="w-4 h-4" />
          {:else}
            <VolumeX class="w-4 h-4 text-red-400" />
          {/if}
        </button>

        <button
          onclick={() => (showRules = true)}
          class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Game Rules"
        >
          <BookOpen class="w-4 h-4" />
        </button>

        <button
          onclick={() => game.leaveRoom()}
          class="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
          title="Leave Game"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Mobile Mini Score Strip (F-07: Keyed) -->
    <div class="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto pt-2 text-xs hand-scroll">
      {#each players as player (player.playerId)}
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 flex-shrink-0">
          <span class="font-bold text-white/80">{player.nickname}</span>
          {#if player.playerId === self?.playerId}
            <span class="bg-white/20 text-white text-[9px] font-black px-1 rounded">YOU</span>
            <button
              onclick={() => (showEditName = true)}
              class="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
              title="Change your display name"
            >
              <Pencil class="w-3 h-3" />
            </button>
          {/if}
          <span class="bg-white/15 px-1.5 py-0.2 rounded font-black text-[11px] text-white">
            {player.score}
          </span>
        </div>
      {/each}
    </div>
  </header>

  <!-- Main Game Stage (F-29: Added pb-80 bottom padding so sticky hand dock never obscures table) -->
  <main class="max-w-6xl mx-auto w-full px-4 py-6 pb-80 sm:pb-88 flex-1 flex flex-col items-center justify-start gap-8">
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
          {blackCard.pick > 1 ? `Pick ${blackCard.pick} White Cards` : "Pick 1 White Card"}
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
              class="mt-2 text-xs font-bold underline text-white/70 hover:text-white"
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

      <div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 w-full">
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
                  class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition-transform active:scale-95 shadow-lg flex items-center gap-1.5"
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

    <!-- Round Winner Overlay (Round Over) -->
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
            class="px-8 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-base transition-all shadow-xl active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            <span>Next Round</span>
            <ChevronRight class="w-5 h-5" />
          </button>
        {:else}
          <p class="text-xs text-white/50 animate-pulse">Waiting for host/czar to begin next round...</p>
        {/if}
      </div>
    {/if}

    <!-- Game Over Victory Screen -->
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

        {#if self?.isHost}
          <button
            onclick={handleRestart}
            disabled={isAdvancing}
            class="px-8 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-base transition-all shadow-xl flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCcw class="w-5 h-5" />
            <span>Play Again</span>
          </button>
        {/if}
      </div>
    {/if}
  </main>

  <!-- Bottom Dock: Player's Hand -->
  {#if !isCzar && room?.status === "submitting" && self?.hand && self.hand.length > 0}
    <footer class="w-full border-t border-white/15 bg-[#121316]/95 backdrop-blur-xl fixed bottom-0 left-0 right-0 z-40 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      <div class="max-w-6xl mx-auto flex flex-col gap-3">
        <!-- Hand Header and Submit Button -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xs font-black tracking-wider uppercase text-white/70">
              Your Hand ({self.hand.length} cards)
            </span>
            <span class="text-[11px] text-white/40">
              Selected: {selectedIds.length} / {requiredPick}
            </span>
            {#if selectedIds.length > 0 && !hasSubmitted}
              <button
                onclick={handleClearSelection}
                class="text-[11px] text-white/50 hover:text-white underline cursor-pointer"
              >
                Clear
              </button>
            {/if}
          </div>

          {#if !hasSubmitted}
            <button
              onclick={handleSubmit}
              disabled={!canSubmit || game.isSubmitting}
              class="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 {
                canSubmit
                  ? 'bg-white hover:bg-neutral-200 text-black active:scale-95 cursor-pointer'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }"
            >
              <span>Submit Selection</span>
            </button>
          {:else}
            <span class="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check class="w-3.5 h-3.5 stroke-[3]" />
              Submitted
            </span>
          {/if}
        </div>

        <!-- Cards Horizontal Scroll Tray (F-07: Keyed loop) -->
        <div class="flex items-center gap-3 overflow-x-auto pb-2 pt-1 hand-scroll">
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
</div>

<RulesModal isOpen={showRules} onclose={() => (showRules = false)} />
<EditDisplayNameModal isOpen={showEditName} onclose={() => (showEditName = false)} />

<style>
  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-scaleUp {
    animation: scaleUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
</style>
