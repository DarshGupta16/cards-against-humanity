<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import { modalStore } from "#lib/modalStore.svelte";
import { Pencil, UserX } from "lucide-svelte";

let players = $derived(game.state.players);
let self = $derived(game.state.self);
</script>

<!-- Mobile Mini Score Strip (F-07: Keyed) -->
<div class="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto pt-2 text-xs hand-scroll touch-pan-x overscroll-x-contain">
  {#each players as player (player.playerId)}
    <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 flex-shrink-0">
      <span class="font-bold text-white/80">{player.nickname}</span>
      {#if player.playerId === self?.playerId}
        <span class="bg-white/20 text-white text-[9px] font-black px-1 rounded">YOU</span>
        <button
          onclick={() => modalStore.openEditName()}
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
          onclick={() => modalStore.openKick(player)}
          class="min-w-[28px] min-h-[28px] text-red-400/60 hover:text-red-400 active:bg-red-500/15 rounded-lg transition-colors cursor-pointer flex items-center justify-center ml-0.5"
          title={`Remove ${player.nickname}`}
        >
          <UserX class="w-3 h-3" />
        </button>
      {/if}
    </div>
  {/each}
</div>
