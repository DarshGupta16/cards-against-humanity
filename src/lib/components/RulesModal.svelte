<script lang="ts">
import { BookOpen, X } from "lucide-svelte";
import { sound } from "#lib/audio";
import RulesContent from "./RulesContent.svelte";

interface Props {
	isOpen: boolean;
	onclose: () => void;
}

let { isOpen, onclose }: Props = $props();

function close() {
	sound.playSelect();
	onclose();
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") {
		close();
	}
}

$effect(() => {
	if (typeof document === "undefined") return;
	if (isOpen) {
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", handleKeydown);
	} else {
		document.body.style.overflow = "";
		window.removeEventListener("keydown", handleKeydown);
	}

	return () => {
		if (typeof document !== "undefined") {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", handleKeydown);
		}
	};
});
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Official Game Rules"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn safe-pb safe-pt"
    onclick={close}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      role="document"
      class="bg-[#141518] text-white border border-white/15 rounded-3xl max-w-2xl w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-[#191a1e] shrink-0">
        <div class="flex items-center gap-2.5">
          <BookOpen class="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
          <h2 class="text-lg sm:text-2xl font-black tracking-tight leading-tight">Official Game Rules</h2>
        </div>
        <button
          onclick={close}
          class="min-w-[44px] min-h-[44px] p-2 rounded-full hover:bg-white/10 active:bg-white/20 text-white/70 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Close rules dialog"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6 text-sm sm:text-base leading-relaxed text-white/80 hand-scroll touch-pan-y flex-1">
        <RulesContent />
      </div>

      <!-- Modal Footer -->
      <div class="p-3 sm:p-4 md:p-6 border-t border-white/10 bg-[#191a1e] flex justify-end shrink-0">
        <button
          onclick={close}
          class="min-h-[44px] bg-white hover:bg-neutral-200 active:scale-95 text-black font-black px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center"
        >
          Got it
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
    animation: fadeIn 0.18s ease-out;
  }
</style>
