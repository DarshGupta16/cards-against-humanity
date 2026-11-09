<script lang="ts">
import {
	Trophy,
	Users,
	Sparkles,
	Dices,
	RotateCcw,
	AlertCircle,
	HelpCircle,
	CheckCircle2,
} from "lucide-svelte";
</script>

<div class="space-y-8 text-white/90">
  <!-- Quick 3-Step Summary / Hero Bar -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-black tracking-widest text-white/50 uppercase">Step 01</span>
        <div class="w-6 h-6 rounded-full bg-white text-black font-black text-xs flex items-center justify-center">10</div>
      </div>
      <h4 class="font-black text-base text-white mb-1">Get 10 Cards</h4>
      <p class="text-xs text-white/60 leading-relaxed">
        Every player is dealt ten white cards to start their hand.
      </p>
    </div>

    <div class="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-black tracking-widest text-white/50 uppercase">Step 02</span>
        <div class="w-6 h-6 rounded-full bg-white text-black font-black text-xs flex items-center justify-center">?</div>
      </div>
      <h4 class="font-black text-base text-white mb-1">Answer the Prompt</h4>
      <p class="text-xs text-white/60 leading-relaxed">
        The Card Czar reveals a black card. Everyone submits their funniest answer face-down.
      </p>
    </div>

    <div class="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-black tracking-widest text-white/50 uppercase">Step 03</span>
        <Trophy class="w-5 h-5 text-amber-400" />
      </div>
      <h4 class="font-black text-base text-white mb-1">Czar Crowns Winner</h4>
      <p class="text-xs text-white/60 leading-relaxed">
        The Czar picks their favorite. Winner gets 1 Awesome Point. First to target score wins!
      </p>
    </div>
  </div>

  <!-- Detailed Core Rules -->
  <section class="space-y-4">
    <div class="flex items-center gap-2 border-b border-white/10 pb-2">
      <Users class="w-5 h-5 text-white" />
      <h3 class="text-lg font-black tracking-tight uppercase">Basic Game Flow</h3>
    </div>

    <div class="space-y-3 text-sm leading-relaxed text-white/80">
      <div class="flex gap-3 items-start">
        <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
        <p>
          <strong class="text-white">The Card Czar:</strong> One player begins as the Card Czar and reads the Black Card aloud. In our digitized edition, the host or room system randomly selects the initial Czar and rotates each round so everyone gets a turn to judge.
        </p>
      </div>

      <div class="flex gap-3 items-start">
        <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
        <p>
          <strong class="text-white">Blind Submissions:</strong> Everyone else answers the prompt by picking their funniest white card(s). The Czar cannot submit cards. Submissions are 100% anonymous to everyone until the winner is crowned.
        </p>
      </div>

      <div class="flex gap-3 items-start">
        <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
        <p>
          <strong class="text-white">The Judgment:</strong> Once all players have submitted, the Card Czar reveals and reads each anonymous entry out loud with the black prompt. The Czar selects the funniest combination.
        </p>
      </div>

      <div class="flex gap-3 items-start">
        <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
        <p>
          <strong class="text-white">Awesome Points & Redraw:</strong> Whoever submitted the winning card gets 1 Awesome Point. After the round, the Czar role advances to the next player, and everyone automatically draws back up to ten white cards.
        </p>
      </div>
    </div>
  </section>

  <!-- Special Cards: PICK 2 -->
  <section class="space-y-4">
    <div class="flex items-center justify-between border-b border-white/10 pb-2">
      <div class="flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-white" />
        <h3 class="text-lg font-black tracking-tight uppercase">PICK 2 Cards</h3>
      </div>
      <span class="bg-white text-black text-xs font-black px-2.5 py-0.5 rounded-full tracking-wide">
        SPECIAL
      </span>
    </div>

    <div class="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
      <p class="text-sm text-white/85 leading-relaxed">
        Some black cards have two blanks and say <strong class="text-white">PICK 2</strong> on the bottom. To answer these prompts:
      </p>
      <ul class="space-y-2 text-sm text-white/70 list-disc list-inside">
        <li>Select two white cards from your hand in combination.</li>
        <li>Pay attention to the numbered order badge (<span class="inline-block bg-white text-black font-black text-[10px] w-4 h-4 text-center rounded-full leading-4">1</span> then <span class="inline-block bg-white text-black font-black text-[10px] w-4 h-4 text-center rounded-full leading-4">2</span>). The Card Czar reads them in the exact order you select them.</li>
        <li>Tap a selected card again to deselect it if you change your mind before clicking Submit.</li>
      </ul>
    </div>
  </section>

  <!-- Official House Rules -->
  <section class="space-y-4">
    <div class="flex items-center gap-2 border-b border-white/10 pb-2">
      <Dices class="w-5 h-5 text-white" />
      <h3 class="text-lg font-black tracking-tight uppercase">Official House Rules</h3>
    </div>

    <p class="text-xs text-white/60">
      Cards Against Humanity encourages house rules. Here are the most famous official variants:
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      <!-- Rando Cardrissian -->
      <div class="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="font-black text-sm text-white flex items-center gap-1.5">
            <span>Rando Cardrissian</span>
          </h4>
          <span class="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Available in App
          </span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">
          Every round, one random white card is drawn from the pile and submitted into the judging pool. If Rando Cardrissian wins the game, all players must hang their heads in eternal shame.
        </p>
      </div>

      <!-- Meritocracy -->
      <div class="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="font-black text-sm text-white flex items-center gap-1.5">
            <span>Meritocracy</span>
          </h4>
          <span class="text-[10px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
            Classic
          </span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">
          Instead of passing the Card Czar title clockwise, whoever won the previous round earns the right to be the Card Czar for the next round.
        </p>
      </div>

      <!-- Gambling -->
      <div class="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="font-black text-sm text-white flex items-center gap-1.5">
            <span>Gambling</span>
          </h4>
          <span class="text-[10px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
            High Stakes
          </span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">
          If a black card is played and you hold multiple winning cards, bet 1 of your Awesome Points to play an additional white card. If you win, you keep your point. If you lose, the round winner takes it.
        </p>
      </div>

      <!-- Re-Booting the Order -->
      <div class="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="font-black text-sm text-white flex items-center gap-1.5">
            <span>Re-Booting the Hand</span>
          </h4>
          <span class="text-[10px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
            Mulligan
          </span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">
          At any time, trade in 1 Awesome Point to discard any number of white cards in your hand and draw back up to a fresh ten.
        </p>
      </div>

      <!-- Never Have I Ever -->
      <div class="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-2 md:col-span-2">
        <div class="flex items-center justify-between">
          <h4 class="font-black text-sm text-white flex items-center gap-1.5">
            <HelpCircle class="w-4 h-4 text-white/70" />
            <span>Never Have I Ever</span>
          </h4>
          <span class="text-[10px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
            Humiliation
          </span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">
          At any time during the game, players may discard cards they do not understand, but they must publicly confess their ignorance to the table and accept the mockery of their friends.
        </p>
      </div>
    </div>
  </section>

  <!-- Digital Micro-Interactions & Tips -->
  <section class="space-y-4">
    <div class="flex items-center gap-2 border-b border-white/10 pb-2">
      <RotateCcw class="w-5 h-5 text-white" />
      <h3 class="text-lg font-black tracking-tight uppercase">Multiplayer Web Tips</h3>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-white/70">
      <div class="bg-white/[0.03] p-3 rounded-xl border border-white/10">
        <strong class="text-white block mb-1">Room PIN</strong>
        Share the 6-digit PIN or click "Copy Link" to let friends join instantly on phone, tablet, or desktop.
      </div>
      <div class="bg-white/[0.03] p-3 rounded-xl border border-white/10">
        <strong class="text-white block mb-1">Card Zoom & Inspection</strong>
        Tap any card to view it enlarged. Click selected cards in your bottom dock to arrange order.
      </div>
      <div class="bg-white/[0.03] p-3 rounded-xl border border-white/10">
        <strong class="text-white block mb-1">Sound & Haptics</strong>
        Use the speaker icon at the top of the game screen to toggle audio sound effects on or off.
      </div>
    </div>
  </section>
</div>
