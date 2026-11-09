<script lang="ts">
import { game, type Submission, type Player } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import CardComponent from "./Card.svelte";
import RulesModal from "./RulesModal.svelte";
import EditDisplayNameModal from "./EditDisplayNameModal.svelte";
import KickPlayerModal from "./KickPlayerModal.svelte";
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
	AlertTriangle,
	Bot,
	Clock,
	Trash2,
	UserX,
} from "lucide-svelte";

let showRules = $state(false);
let showEditName = $state(false);
let soundEnabled = $state(sound.enabled);
let pinCopied = $state(false);
let isAdvancing = $state(false); // F-12: guard against double-clicks
let showHostMenu = $state(false);
let kickTargetPlayer = $state<Player | null>(null);
let now = $state(Date.now());

let room = $derived(game.state.room);
let players = $derived(game.state.players);
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

let currentCzarPlayer = $derived(
	players.find((p: any) => p.playerId === room?.currentCzarId),
);

let winningSubmission = $derived(
	submissions.find((s: Submission) => s._id === room?.winningSubmissionId),
);

let roundWinnerPlayer = $derived(
	players.find((p: any) => p.playerId === room?.roundWinnerPlayerId),
);

let gameWinnerPlayer = $derived(
	players.find((p: any) => p.playerId === room?.gameWinnerPlayerId),
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
		await game.restartGame();
	} finally {
		setTimeout(() => (isAdvancing = false), 500);
	}
}

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

<div class="min-h-screen flex flex-col justify-between bg-[#0a0a0c] text-white select-none">
  <!-- Top Navigation & Status Bar -->
  <header class="w-full border-b border-white/10 bg-[#121316]/95 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-4 py-2 sm:py-3">
    <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
      <!-- Left: Game Info & PIN -->
      <div class="flex items-center gap-2 sm:gap-3">
        <button
          onclick={copyPin}
          class="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-mono text-xs font-black transition-colors"
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
          onclick={() => (showRules = true)}
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

    <!-- Mobile Mini Score Strip (F-07: Keyed) -->
    <div class="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto pt-2 text-xs hand-scroll touch-pan-x overscroll-x-contain">
      {#each players as player (player.playerId)}
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 flex-shrink-0">
          <span class="font-bold text-white/80">{player.nickname}</span>
          {#if player.playerId === self?.playerId}
            <span class="bg-white/20 text-white text-[9px] font-black px-1 rounded">YOU</span>
            <button
              onclick={() => (showEditName = true)}
              class="min-w-[28px] min-h-[28px] text-white/50 hover:text-white active:bg-white/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Change your display name"
              title="Change your display name"
            >
              <Pencil class="w-3 h-3" />
            </button>
          {/if}
          <span class="bg-white/15 px-1.5 py-0.5 rounded-md font-black text-[11px] text-white">
            {player.score}
          </span>
          {#if self?.isHost && player.playerId !== self?.playerId}
            <button
              onclick={() => (kickTargetPlayer = player)}
              class="min-w-[28px] min-h-[28px] text-red-400/60 hover:text-red-400 active:bg-red-500/15 rounded-lg transition-colors cursor-pointer flex items-center justify-center ml-0.5"
              title={`Remove ${player.nickname}`}
            >
              <UserX class="w-3 h-3" />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </header>

  <!-- Main Game Stage -->
  <main class="max-w-6xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 flex-1 flex flex-col items-center justify-start gap-6 sm:gap-8 {hasHandDock ? 'pb-72 sm:pb-84 md:pb-92' : 'pb-12 sm:pb-16'}">
    <!-- Edge case: Only 1 Player Remaining in Room and no Bot -->
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
  </main>

  <!-- Bottom Dock: Player's Hand -->
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
</div>

<RulesModal isOpen={showRules} onclose={() => (showRules = false)} />
<EditDisplayNameModal isOpen={showEditName} onclose={() => (showEditName = false)} />
<KickPlayerModal
  isOpen={Boolean(kickTargetPlayer)}
  player={kickTargetPlayer}
  onclose={() => (kickTargetPlayer = null)}
  onconfirm={async (playerId, block, scramble) => {
    await game.kickPlayer(playerId, block, scramble);
  }}
/>

<style>
  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-scaleUp {
    animation: scaleUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
</style>
