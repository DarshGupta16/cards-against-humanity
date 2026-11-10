<script lang="ts">
import { sound } from "#lib/audio";

const sizeClasses = {
	sm: "w-28 h-40 sm:w-36 sm:h-48 p-2.5 sm:p-3 text-[11px] sm:text-xs flex-shrink-0",
	md: "w-36 h-52 sm:w-48 sm:h-68 md:w-52 md:h-72 p-3 sm:p-4 text-xs sm:text-sm",
	lg: "w-52 h-72 sm:w-64 sm:h-88 p-4 sm:p-5 text-sm sm:text-lg",
	hand: "w-36 h-52 sm:w-44 sm:h-60 md:w-48 md:h-68 p-3 sm:p-4 text-xs sm:text-sm flex-shrink-0",
};

interface TextToken {
	isBlank: boolean;
	content: string;
}

interface Props {
	type?: "black" | "white" | "back";
	text?: string;
	pick?: number;
	size?: "sm" | "md" | "lg" | "hand";
	selected?: boolean;
	pickIndex?: number; // 1 or 2 for multi-pick cards
	selectable?: boolean;
	disabled?: boolean;
	isFlipped?: boolean; // For 3D flip card presentation
	flipMode?: boolean; // When true, mounts both front and back for 3D flip
	onclick?: () => void;
}

let {
	type = "white",
	text = "",
	pick = 1,
	size = "md",
	selected = false,
	pickIndex,
	selectable = false,
	disabled = false,
	isFlipped = false,
	flipMode = false,
	onclick,
}: Props = $props();

function handleClick() {
	if (disabled || !selectable) return;
	onclick?.();
}

function handleKeyDown(event: KeyboardEvent) {
	if (!selectable || disabled) return;
	if (event.key === "Enter" || event.key === " ") {
		event.preventDefault();
		onclick?.();
	}
}

function handleMouseEnter() {
	// Only trigger hover sound on devices with fine pointer hover to prevent mobile double-firing
	if (
		selectable &&
		!disabled &&
		typeof window !== "undefined" &&
		window.matchMedia("(hover: hover)").matches
	) {
		sound.playHover();
	}
}

// Safe tokenization of text for fill-in-the-blank underscores (F-01, F-21)
// Short-circuits immediately for white cards to avoid unnecessary regex work and heap allocations
let textTokens = $derived.by<TextToken[]>(() => {
	if (type !== "black" || !text) return [];
	if (!text.includes("___")) return [{ isBlank: false, content: text }];
	const parts = text.split(/_{3,}/);
	const tokens: TextToken[] = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i]) {
			tokens.push({ isBlank: false, content: parts[i] });
		}
		if (i < parts.length - 1) {
			tokens.push({ isBlank: true, content: "____" });
		}
	}
	return tokens;
});
</script>

{#if flipMode}
  <!-- 3D Flippable Card Container (F-06) -->
  <div
    role="button"
    tabindex={selectable && !disabled ? 0 : -1}
    aria-pressed={selected}
    class="card-perspective select-none touch-manipulation {sizeClasses[size]} {selectable && !disabled ? 'cursor-pointer active:scale-95' : ''}"
    onclick={handleClick}
    onkeydown={handleKeyDown}
    onmouseenter={handleMouseEnter}
  >
    <div
      class="w-full h-full relative card-3d {isFlipped ? 'is-flipped' : ''}"
    >
      <!-- Back Face -->
      <div
        class="card-front absolute inset-0 rounded-2xl bg-[#0a0a0b] text-white border border-white/20 p-3 sm:p-4 shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden"
      >
        <div class="flex items-center gap-1.5 opacity-30">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <rect x="2" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="8" y="3" width="14" height="18" rx="2" fill="currentColor"/>
          </svg>
        </div>
        <div class="text-left font-black tracking-tighter text-lg sm:text-2xl leading-none">
          Cards<br />Against<br />Humanity
        </div>
        <div class="text-[9px] font-bold tracking-widest uppercase opacity-40">
          Print & Play
        </div>
      </div>

      <!-- Front Face -->
      <div
        class="card-back absolute inset-0 rounded-2xl bg-[#fcfdfd] text-[#111214] border border-black/10 p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden"
      >
        <div class="font-extrabold tracking-tight leading-snug break-words overflow-y-auto hand-scroll pr-1 flex-1 flex flex-col justify-start">
          {text}
        </div>
        <div class="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-black/10 mt-1.5 sm:mt-2">
          <div class="flex items-center gap-1 sm:gap-1.5">
            <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black/70 fill-black/80" viewBox="0 0 24 24">
              <rect x="2" y="4" width="13" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
              <rect x="7" y="4" width="13" height="16" rx="2" fill="currentColor"/>
            </svg>
            <span class="text-[8px] sm:text-[9px] font-black tracking-tight leading-none text-black/70">
              Cards Against Humanity
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- Standard Non-Flipping Card -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    role={selectable ? "button" : undefined}
    tabindex={selectable && !disabled ? 0 : undefined}
    aria-pressed={selectable ? selected : undefined}
    class="relative rounded-2xl transition-[transform,box-shadow,opacity] duration-200 ease-out transform-gpu select-none flex flex-col justify-between overflow-hidden touch-manipulation {sizeClasses[size]} {
      type === 'black'
        ? 'bg-[#111214] text-white border border-white/15 shadow-[0_12px_30px_rgba(0,0,0,0.8)]'
        : type === 'back'
          ? 'bg-[#0a0a0b] text-white border border-white/20 shadow-[0_10px_25px_rgba(0,0,0,0.6)]'
          : 'bg-[#fcfdfd] text-[#111214] border border-black/10 shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
    } {
      selectable && !disabled ? 'cursor-pointer card-lift' : ''
    } {
      selected
        ? 'ring-4 ring-white -translate-y-3 shadow-[0_12px_28px_rgba(255,255,255,0.22)]'
        : ''
    } {
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    }"
    onclick={handleClick}
    onkeydown={handleKeyDown}
    onmouseenter={handleMouseEnter}
  >
    <!-- Selected Pick Order Badge (e.g. 1st, 2nd for Pick 2) -->
    {#if selected}
      <div class="absolute -top-1 -right-1 bg-white text-black font-extrabold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-black z-20">
        {pickIndex ? pickIndex : "✓"}
      </div>
    {/if}

    {#if type === "back"}
      <div class="w-full h-full flex flex-col justify-between items-start p-2">
        <div class="flex items-center gap-1.5 opacity-30">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <rect x="2" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="8" y="3" width="14" height="18" rx="2" fill="currentColor"/>
          </svg>
        </div>
        <div class="text-left font-black tracking-tighter text-lg sm:text-2xl leading-none">
          Cards<br />Against<br />Humanity
        </div>
        <div class="text-[9px] font-bold tracking-widest uppercase opacity-40">
          Print & Play
        </div>
      </div>
    {:else}
      <!-- Card Front: Safe tokenized text rendering (XSS-proof) -->
      <div class="font-extrabold tracking-tight leading-snug break-words overflow-y-auto hand-scroll pr-1 flex-1 flex flex-col justify-start">
        {#if type === "black"}
          <span>
            {#each textTokens as token}
              {#if token.isBlank}
                <span class="inline-block border-b-2 border-white/80 min-w-[2rem] sm:min-w-[2.75rem] mx-0.5 sm:mx-1 align-baseline text-transparent">____</span>
              {:else}
                {token.content}
              {/if}
            {/each}
          </span>
        {:else}
          {text}
        {/if}
      </div>

      <!-- Card Footer Logo & Pick Badges -->
      <div class="flex items-center justify-between pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2 {type === 'black' ? 'border-white/10' : 'border-black/5'}">
        <div class="flex items-center gap-1 sm:gap-1.5">
          <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 {type === 'black' ? 'text-white/70 fill-white/80' : 'text-black/70 fill-black/80'}" viewBox="0 0 24 24">
            <rect x="2" y="4" width="13" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="7" y="4" width="13" height="16" rx="2" fill="currentColor"/>
          </svg>
          <span class="text-[8px] sm:text-[9px] font-black tracking-tight leading-none {type === 'black' ? 'text-white/70' : 'text-black/70'}">
            Cards Against Humanity
          </span>
        </div>

        {#if type === "black" && pick > 1}
          <div class="bg-white text-black text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider flex items-center gap-1">
            <span>PICK</span>
            <span class="bg-black text-white w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-black">{pick}</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
