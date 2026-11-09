<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import { modalStore } from "#lib/modalStore.svelte";
import Landing from "#lib/components/Landing.svelte";
import Lobby from "#lib/components/Lobby.svelte";
import GameTable from "#lib/components/GameTable.svelte";
import RulesModal from "#lib/components/RulesModal.svelte";
import EditDisplayNameModal from "#lib/components/EditDisplayNameModal.svelte";
import KickPlayerModal from "#lib/components/KickPlayerModal.svelte";

let room = $derived(game.state.room);
</script>

{#if !room}
  <Landing />
{:else if room.status === "lobby"}
  <Lobby />
{:else}
  <GameTable />
{/if}

<RulesModal isOpen={modalStore.rulesOpen} onclose={() => modalStore.closeRules()} />
<EditDisplayNameModal
  isOpen={modalStore.editNameOpen}
  onclose={() => modalStore.closeEditName()}
/>
<KickPlayerModal
  isOpen={Boolean(modalStore.kickTargetPlayer)}
  player={modalStore.kickTargetPlayer}
  onclose={() => modalStore.closeKick()}
  onconfirm={async (playerId, block, scramble) => {
    await game.kickPlayer(playerId, block, scramble);
  }}
/>
