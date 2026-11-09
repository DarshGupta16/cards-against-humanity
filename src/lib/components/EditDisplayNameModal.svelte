<script lang="ts">
import { X, Check, Dices, User } from "lucide-svelte";
import { game } from "#lib/gameStore.svelte";
import { sound } from "#lib/audio";

interface Props {
	isOpen: boolean;
	onclose: () => void;
}

let { isOpen, onclose }: Props = $props();

let inputName = $state("");
let isSaving = $state(false);
let errorMessage = $state("");
let inputElement = $state<HTMLInputElement | null>(null);

const FUNNY_SUGGESTIONS = [
	"The Dictator",
	"Card Goblin",
	"Grandma's Regret",
	"Queen of Filth",
	"Lord of Innuendo",
	"Human Disaster",
	"Cynical Bastard",
	"Morally Questionable",
	"Chaotic Evil",
	"Unfiltered Truth",
	"Professional Sinner",
];

$effect(() => {
	if (isOpen) {
		inputName = game.state.self?.nickname || game.nickname || "";
		errorMessage = "";
		isSaving = false;
		setTimeout(() => inputElement?.focus(), 50);
		document.body.style.overflow = "hidden";
	} else {
		document.body.style.overflow = "";
	}

	return () => {
		if (typeof document !== "undefined") {
			document.body.style.overflow = "";
		}
	};
});

function randomizeName() {
	sound.playSelect();
	const random =
		FUNNY_SUGGESTIONS[Math.floor(Math.random() * FUNNY_SUGGESTIONS.length)];
	inputName = random;
	errorMessage = "";
}

async function handleSave(event?: Event) {
	if (event) event.preventDefault();
	const trimmed = inputName.trim();
	if (!trimmed) {
		errorMessage = "Please enter a valid display name.";
		sound.playThud();
		return;
	}

	if (trimmed.length > 24) {
		errorMessage = "Name must be 24 characters or less.";
		sound.playThud();
		return;
	}

	isSaving = true;
	errorMessage = "";
	const success = await game.updateDisplayName(trimmed);
	isSaving = false;

	if (success) {
		onclose();
	} else {
		errorMessage = "Failed to update display name. Try again.";
	}
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") {
		onclose();
	}
}
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Set Display Name"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn safe-pb safe-pt"
    onclick={onclose}
    onkeydown={handleKeydown}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      role="document"
      class="bg-[#141518] text-white border border-white/15 rounded-3xl max-w-md w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-y-auto animate-scaleUp"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-[#18191d] shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-white text-black font-black flex items-center justify-center text-sm shadow-sm shrink-0">
            <User class="w-4 h-4 text-black" />
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              Change Display Name
            </h3>
            <p class="text-xs text-white/50">
              Visible to all other players in this room
            </p>
          </div>
        </div>
        <button
          onclick={onclose}
          class="min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-white/10 active:bg-white/20 text-white/60 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Close"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form Body -->
      <form onsubmit={handleSave} class="p-4 sm:p-6 space-y-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="display-name-input" class="text-xs font-bold uppercase tracking-wider text-white/70">
              Your In-Game Name
            </label>
            <button
              type="button"
              onclick={randomizeName}
              class="min-h-[44px] inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white/60 hover:text-white active:text-white transition-colors cursor-pointer"
            >
              <Dices class="w-3.5 h-3.5" />
              <span>Randomize</span>
            </button>
          </div>

          <div class="relative">
            <input
              id="display-name-input"
              bind:this={inputElement}
              type="text"
              maxlength="24"
              bind:value={inputName}
              placeholder="e.g. Master of Sarcasm"
              class="w-full min-h-[48px] px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white placeholder-white/30 font-bold text-base focus:outline-none focus:ring-2 focus:ring-white transition-all"
            />
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">
              {inputName.length}/24
            </span>
          </div>

          {#if errorMessage}
            <p class="text-xs text-red-400 font-medium">
              {errorMessage}
            </p>
          {/if}
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onclick={onclose}
            class="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            class="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-black text-sm transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {#if isSaving}
              <span>Saving...</span>
            {:else}
              <Check class="w-4 h-4 stroke-[3]" />
              <span>Save Name</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.15s ease-out;
  }
  .animate-scaleUp {
    animation: scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }
</style>
