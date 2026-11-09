<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import Landing from "#lib/components/Landing.svelte";
import Lobby from "#lib/components/Lobby.svelte";
import GameTable from "#lib/components/GameTable.svelte";

let room = $derived(game.state.room);
</script>

{#if !room}
  <Landing />
{:else if room.status === "lobby"}
  <Lobby />
{:else}
  <GameTable />
{/if}
