<script lang="ts">
import { onMount } from "svelte";
import { game } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";
import {
	Plus,
	Users,
	BookOpen,
	Sparkles,
	AlertCircle,
	Loader2,
} from "lucide-svelte";
import RulesModal from "./RulesModal.svelte";

let mode = $state<"create" | "join">("create");
let nickname = $state(game.nickname || "");
let pin = $state("");
let targetScore = $state(7);
let randoCardrissian = $state(true);
let showRules = $state(false);

onMount(() => {
	// Check if PIN in query string
	const urlParams = new URLSearchParams(window.location.search);
	const pinParam = urlParams.get("pin");
	if (pinParam) {
		pin = pinParam.trim().replace(/\D/g, "").slice(0, 6);
		mode = "join";
	}
});

function handlePinInput(event: Event) {
	const input = event.target as HTMLInputElement;
	pin = input.value.replace(/\D/g, "").slice(0, 6);
}

async function handleCreate(event: Event) {
	event.preventDefault();
	if (!nickname.trim()) {
		game.errorMessage = "Please enter your nickname.";
		return;
	}
	sound.playSelect();
	await game.createRoom(nickname, targetScore, randoCardrissian);
}

async function handleJoin(event: Event) {
	event.preventDefault();
	const cleanPin = pin.trim();
	if (cleanPin?.length !== 6) {
		game.errorMessage = "Please enter a valid 6-digit room PIN.";
		return;
	}
	if (!nickname.trim()) {
		game.errorMessage = "Please enter your nickname.";
		return;
	}
	sound.playSelect();
	await game.joinRoom(cleanPin, nickname);
}
</script>

<div class="min-h-screen bg-[#090a0c] text-white flex flex-col justify-between p-4 sm:p-8">
  <!-- Top Bar -->
  <header class="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-lg bg-white text-black font-black text-sm flex items-center justify-center shadow-md">
        CAH
      </div>
      <span class="text-xs font-black tracking-widest uppercase text-white/60">
        Digitized Edition
      </span>
    </div>

    <button
      onclick={() => (showRules = true)}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold transition-colors"
    >
      <BookOpen class="w-4 h-4" />
      <span>Rules</span>
    </button>
  </header>

  <!-- Hero & Action Form -->
  <main class="max-w-xl mx-auto w-full my-auto flex flex-col items-center text-center gap-8 py-8">
    <!-- Brand Title -->
    <div class="space-y-3">
      <h1 class="text-5xl sm:text-7xl font-black tracking-tight text-white leading-none">
        Cards<br />Against<br />Humanity
      </h1>
      <p class="text-sm sm:text-base text-white/60 max-w-sm mx-auto font-medium">
        A party game for horrible people. Fully digitized for multiplayer web devices.
      </p>
    </div>

    <!-- Error Banner -->
    {#if game.errorMessage}
      <div class="w-full p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm font-bold flex items-center gap-2 text-left">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        <span>{game.errorMessage}</span>
      </div>
    {/if}

    <!-- Main Interactive Card -->
    <div class="w-full bg-[#131418] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-left">
      <!-- Mode Switcher Tabs -->
      <div class="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/5 border border-white/10">
        <button
          onclick={() => {
            sound.playHover();
            mode = "create";
            game.errorMessage = "";
          }}
          class="py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 {
            mode === 'create'
              ? 'bg-white text-black shadow-md'
              : 'text-white/60 hover:text-white'
          }"
        >
          <Plus class="w-4 h-4" />
          <span>Create Game</span>
        </button>

        <button
          onclick={() => {
            sound.playHover();
            mode = "join";
            game.errorMessage = "";
          }}
          class="py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 {
            mode === 'join'
              ? 'bg-white text-black shadow-md'
              : 'text-white/60 hover:text-white'
          }"
        >
          <Users class="w-4 h-4" />
          <span>Join Game</span>
        </button>
      </div>

      <!-- Create Room Form (F-14: Wrapped in <form> with <label>) -->
      {#if mode === "create"}
        <form onsubmit={handleCreate} class="flex flex-col gap-5">
          <div class="space-y-2">
            <label for="host-nickname" class="block text-xs font-bold text-white/70 uppercase tracking-wider">
              Your Display Name
            </label>
            <input
              id="host-nickname"
              type="text"
              maxlength="24"
              disabled={game.isConnecting}
              placeholder="e.g. CardMaster, Dave, The Dictator"
              bind:value={nickname}
              class="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white placeholder-white/30 font-bold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-white transition-all disabled:opacity-50"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <span class="block text-xs font-bold text-white/70 uppercase tracking-wider">
                Points to Win
              </span>
              <div class="flex gap-2">
                {#each [5, 7, 10] as pts}
                  <button
                    type="button"
                    disabled={game.isConnecting}
                    onclick={() => {
                      sound.playSelect();
                      targetScore = pts;
                    }}
                    class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all border disabled:opacity-50 {
                      targetScore === pts
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                    }"
                  >
                    {pts}
                  </button>
                {/each}
              </div>
            </div>

            <div class="space-y-2">
              <span class="block text-xs font-bold text-white/70 uppercase tracking-wider">
                Chaos Bot
              </span>
              <button
                type="button"
                disabled={game.isConnecting}
                onclick={() => {
                  sound.playSelect();
                  randoCardrissian = !randoCardrissian;
                }}
                class="w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-between disabled:opacity-50 {
                  randoCardrissian
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 border-white/10 text-white/40'
                }"
              >
                <span>Rando Cardrissian</span>
                <span class="text-[11px] font-black uppercase px-1.5 py-0.5 rounded {
                  randoCardrissian ? 'bg-white text-black' : 'bg-white/10 text-white/40'
                }">
                  {randoCardrissian ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={game.isConnecting}
            class="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-base transition-all shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {#if game.isConnecting}
              <Loader2 class="w-5 h-5 animate-spin" />
              <span>Creating Room...</span>
            {:else}
              <Sparkles class="w-5 h-5" />
              <span>Create Room & Get PIN</span>
            {/if}
          </button>
        </form>
      {:else}
        <!-- Join Room Form (F-14: Wrapped in <form> with <label>) -->
        <form onsubmit={handleJoin} class="flex flex-col gap-5">
          <div class="space-y-2">
            <label for="join-pin" class="block text-xs font-bold text-white/70 uppercase tracking-wider">
              Room PIN (6 digits)
            </label>
            <input
              id="join-pin"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              disabled={game.isConnecting}
              placeholder="e.g. 849201"
              value={pin}
              oninput={handlePinInput}
              class="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white placeholder-white/30 font-mono font-black text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-white transition-all disabled:opacity-50"
            />
          </div>

          <div class="space-y-2">
            <label for="join-nickname" class="block text-xs font-bold text-white/70 uppercase tracking-wider">
              Your Display Name
            </label>
            <input
              id="join-nickname"
              type="text"
              maxlength="24"
              disabled={game.isConnecting}
              placeholder="e.g. CardLover, Sarah, Human Disaster"
              bind:value={nickname}
              class="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white placeholder-white/30 font-bold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-white transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={game.isConnecting}
            class="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-base transition-all shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {#if game.isConnecting}
              <Loader2 class="w-5 h-5 animate-spin" />
              <span>Joining Game...</span>
            {:else}
              <Users class="w-5 h-5" />
              <span>Join Game</span>
            {/if}
          </button>
        </form>
      {/if}
    </div>

    <!-- Deck Info Badge & Rules Quick-Access -->
    <div class="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 text-xs text-white/50 font-medium">
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>100 Black Cards · 503 White Cards Digitized</span>
      </div>
      <span class="hidden sm:inline text-white/20">·</span>
      <button
        onclick={() => (showRules = true)}
        class="inline-flex items-center gap-1.5 text-white/80 hover:text-white underline underline-offset-4 font-bold transition-colors cursor-pointer"
      >
        <BookOpen class="w-3.5 h-3.5" />
        <span>How to Play & Rules</span>
      </button>
    </div>
  </main>

  <!-- Footer -->
  <footer class="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2 py-4 text-xs text-white/30 border-t border-white/5">
    <span>Cards Against Humanity is distributed under Creative Commons BY-NC-SA 2.0.</span>
    <a href="/rules" class="hover:text-white/60 transition-colors underline underline-offset-2">
      Full Rulebook (/rules)
    </a>
  </footer>
</div>

<RulesModal isOpen={showRules} onclose={() => (showRules = false)} />
