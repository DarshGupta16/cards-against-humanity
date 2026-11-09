<script lang="ts">
import { ArrowLeft, BookOpen, Play } from "lucide-svelte";
import RulesContent from "$lib/components/RulesContent.svelte";
</script>

<svelte:head>
  <title>Official Rules — Cards Against Humanity</title>
  <meta name="description" content="Official game rules, how to play, PICK 2 mechanics, and house rules for Cards Against Humanity digitized." />
</svelte:head>

<div class="min-h-screen bg-[#0c0d0e] text-white flex flex-col p-4 sm:p-6 md:p-10 font-sans selection:bg-white selection:text-black">
  <!-- Header -->
  <header class="max-w-3xl mx-auto w-full flex items-center justify-between pb-8 border-b border-white/10">
    <a
      href="/"
      class="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white transition-colors py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>Back to Game</span>
    </a>

    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-white text-black font-black text-xs flex items-center justify-center">
        CAH
      </div>
      <span class="text-xs font-black tracking-widest uppercase text-white/60">
        Rulebook
      </span>
    </div>
  </header>

  <!-- Main Rules Content -->
  <main class="max-w-3xl mx-auto w-full py-8 sm:py-12 space-y-10">
    <div class="space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold">
        <BookOpen class="w-3.5 h-3.5" />
        <span>Official Digitized Edition</span>
      </div>
      <h1 class="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
        How to Play<br />Cards Against Humanity
      </h1>
      <p class="text-base sm:text-lg text-white/60 font-medium max-w-xl">
        A party game for horrible people. Here are the official rules, special PICK 2 instructions, and infamous house variants.
      </p>
    </div>

    <!-- Embedded Rules Component -->
    <div class="bg-[#141518] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl">
      <RulesContent />
    </div>

    <!-- Bottom CTA -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 border border-white/15">
      <div>
        <h4 class="font-black text-lg text-white">Ready to be horrible?</h4>
        <p class="text-xs text-white/60">
          Create a room, get your 6-digit PIN, and play with your friends.
        </p>
      </div>

      <a
        href="/"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-sm transition-all shadow-lg active:scale-95 shrink-0"
      >
        <Play class="w-4 h-4 fill-black" />
        <span>Play Now</span>
      </a>
    </div>
  </main>

  <!-- Footer -->
  <footer class="max-w-3xl mx-auto w-full text-center pt-8 border-t border-white/10 text-xs text-white/40">
    Cards Against Humanity is distributed under Creative Commons BY-NC-SA 2.0.
  </footer>
</div>
