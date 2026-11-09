<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import {
	Copy,
	Check,
	Share2,
	Crown,
	Bot,
	Users,
	Trophy,
	LogOut,
	Sparkles,
	BookOpen,
	Pencil,
} from "lucide-svelte";
import RulesModal from "./RulesModal.svelte";
import EditDisplayNameModal from "./EditDisplayNameModal.svelte";

let copied = $state(false);
let linkCopied = $state(false);
let showRules = $state(false);
let showEditName = $state(false);

let room = $derived(game.state.room);
let players = $derived(game.state.players);
let self = $derived(game.state.self);
let isHost = $derived(Boolean(self?.isHost));

// Minimum player check (F-11): host alone cannot start without bot
let canStart = $derived(
	Boolean(
		players.length >= 2 || (players.length >= 1 && room?.randoCardrissian),
	),
);

async function copyPin() {
	if (!room) return;
	sound.playSelect();
	try {
		await navigator.clipboard.writeText(room.pin);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	} catch {
		// fallback
	}
}

async function shareGame() {
	if (!room) return;
	sound.playSelect();
	const url = `${window.location.origin}?pin=${room.pin}`;

	if (navigator.share) {
		try {
			await navigator.share({
				title: "Join Cards Against Humanity!",
				text: `Join our Cards Against Humanity game! Room PIN: ${room.pin}`,
				url,
			});
			return;
		} catch {
			// User dismissed share sheet or unsupported
		}
	}

	try {
		await navigator.clipboard.writeText(url);
		linkCopied = true;
		setTimeout(() => (linkCopied = false), 2000);
	} catch {
		// fallback
	}
}

function handleStartGame() {
	if (!canStart) return;
	game.startGame();
}

function handleLeave() {
	game.leaveRoom();
}

// F-02: Use gameStore.updateSettings instead of direct $derived mutation
function handleTargetScoreChange(pts: number) {
	sound.playSelect();
	game.updateSettings(pts, undefined);
}

function handleRandoToggle() {
	sound.playSelect();
	const nextVal = !room?.randoCardrissian;
	game.updateSettings(undefined, nextVal);
}
</script>

<div class="max-w-3xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col gap-8">
  <!-- Lobby Header Bar -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-white text-black font-black text-xl rounded-xl flex items-center justify-center shadow-lg">
        CAH
      </div>
      <div>
        <h1 class="text-xl sm:text-2xl font-black tracking-tight text-white">Game Lobby</h1>
        <p class="text-xs text-white/50">Official 2.4 Edition · 603 Cards</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={() => (showRules = true)}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold transition-colors"
      >
        <BookOpen class="w-4 h-4" />
        <span>Rules</span>
      </button>

      <button
        onclick={handleLeave}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors border border-red-500/20"
      >
        <LogOut class="w-4 h-4" />
        <span>Leave</span>
      </button>
    </div>
  </div>

  <!-- Giant Room PIN Card -->
  <div class="relative bg-gradient-to-b from-[#181a1f] to-[#121316] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center overflow-hidden">
    <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-bold tracking-widest uppercase mb-3">
      <Sparkles class="w-3.5 h-3.5 text-white" />
      <span>Room PIN Code</span>
    </div>

    <div class="text-5xl sm:text-7xl font-black tracking-widest text-white my-2 select-all font-mono">
      {room?.pin || "------"}
    </div>

    <p class="text-white/60 text-xs sm:text-sm max-w-md mt-1 mb-6">
      Give this PIN to your friends so they can enter it on their phones or laptops to join!
    </p>

    <!-- Share / Copy Action Buttons -->
    <div class="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
      <button
        onclick={copyPin}
        class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-sm transition-all shadow-lg active:scale-95"
      >
        {#if copied}
          <Check class="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>PIN Copied!</span>
        {:else}
          <Copy class="w-4 h-4" />
          <span>Copy PIN</span>
        {/if}
      </button>

      <button
        onclick={shareGame}
        class="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-sm transition-all border border-white/15 active:scale-95"
      >
        {#if linkCopied}
          <Check class="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>Link Copied!</span>
        {:else}
          <Share2 class="w-4 h-4" />
          <span>Share Link</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Players Roster (F-07: Keyed with player.playerId) -->
  <div class="bg-[#141518] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
    <div class="flex items-center justify-between border-b border-white/10 pb-4">
      <div class="flex items-center gap-2.5">
        <Users class="w-5 h-5 text-white/80" />
        <h2 class="text-lg font-black tracking-tight text-white">
          Players Joined ({players.length})
        </h2>
      </div>
      <span class="text-xs text-white/50 font-medium">
        {#if !canStart}
          Need at least 2 players (or enable the Bot below)
        {:else}
          Ready to play
        {/if}
      </span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {#each players as player (player.playerId)}
        <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-900 border border-white/20 flex items-center justify-center font-black text-white text-base shadow-sm">
              {player.nickname.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-white">{player.nickname}</span>
                {#if player.playerId === self?.playerId}
                  <span class="bg-white/15 text-white/80 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                    YOU
                  </span>
                {/if}
                {#if player.isHost}
                  <span class="text-amber-400 flex items-center" title="Host">
                    <Crown class="w-3.5 h-3.5" />
                  </span>
                {/if}
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full {player.isConnected ? 'bg-emerald-400' : 'bg-neutral-500'}"></span>
                <span class="text-[11px] text-white/50">
                  {player.isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {#if player.playerId === self?.playerId}
            <button
              type="button"
              onclick={() => (showEditName = true)}
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
              title="Change your display name"
            >
              <Pencil class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Edit Name</span>
            </button>
          {/if}
        </div>
      {/each}

      {#if room?.randoCardrissian}
        <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-dashed border-white/10 opacity-75">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center text-white">
              <Bot class="w-5 h-5" />
            </div>
            <div>
              <span class="font-bold text-sm text-white">Rando Cardrissian</span>
              <p class="text-[11px] text-white/50">Automated Bot · Plays random cards</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Game Settings (Host Only) -->
  {#if isHost}
    <div class="bg-[#141518] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col gap-5">
      <div class="flex items-center gap-2.5">
        <Trophy class="w-5 h-5 text-amber-400" />
        <h3 class="font-black text-base text-white tracking-tight">Host Game Settings</h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
          <span class="text-xs font-bold text-white/70 uppercase tracking-wider">
            Points to Win
          </span>
          <div class="flex items-center gap-2">
            {#each [5, 7, 10] as points}
              <button
                class="flex-1 py-2 rounded-xl text-xs font-black transition-all border {
                  room?.targetScore === points
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }"
                onclick={() => handleTargetScoreChange(points)}
              >
                {points} pts
              </button>
            {/each}
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
          <div>
            <div class="text-sm font-bold text-white">Rando Cardrissian</div>
            <div class="text-xs text-white/50">Add a bot that plays random cards</div>
          </div>
          <button
            type="button"
            aria-label="Toggle Rando Cardrissian chaos bot"
            class="w-12 h-6 rounded-full transition-colors relative flex items-center px-1 {
              room?.randoCardrissian ? 'bg-white' : 'bg-white/20'
            }"
            onclick={handleRandoToggle}
          >
            <div class="w-4 h-4 rounded-full transition-transform {
              room?.randoCardrissian ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'
            }"></div>
          </button>
        </div>
      </div>

      <button
        onclick={handleStartGame}
        disabled={!canStart}
        class="w-full py-4 rounded-2xl font-black text-base sm:text-lg transition-all shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 mt-2 {
          canStart
            ? 'bg-white hover:bg-neutral-200 text-black cursor-pointer'
            : 'bg-white/10 text-white/40 cursor-not-allowed'
        }"
      >
        <span>Start Game</span>
      </button>
    </div>
  {:else}
    <!-- Non-Host Waiting View -->
    <div class="p-8 rounded-3xl bg-white/5 border border-white/10 text-center flex flex-col items-center gap-3 animate-pulse">
      <div class="w-3 h-3 rounded-full bg-emerald-400"></div>
      <p class="font-extrabold text-white text-base">Waiting for host to start the game...</p>
      <p class="text-xs text-white/50">Get ready to choose the most terrible cards imaginable.</p>
    </div>
  {/if}
</div>

<RulesModal isOpen={showRules} onclose={() => (showRules = false)} />
<EditDisplayNameModal isOpen={showEditName} onclose={() => (showEditName = false)} />
