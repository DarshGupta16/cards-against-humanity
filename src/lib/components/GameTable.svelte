<script lang="ts">
import { game } from "#lib/gameStore.svelte";
import TableNavbar from "./table/TableNavbar.svelte";
import SinglePlayerBanner from "./table/SinglePlayerBanner.svelte";
import JudgingStage from "./table/JudgingStage.svelte";
import RoundWinnerOverlay from "./table/RoundWinnerOverlay.svelte";
import VictoryScreen from "./table/VictoryScreen.svelte";
import HandDock from "./table/HandDock.svelte";

let room = $derived(game.state.room);
let self = $derived(game.state.self);
let isCzar = $derived(Boolean(game.state.isCzar));

let hasHandDock = $derived(
	!isCzar &&
		room?.status === "submitting" &&
		Boolean(self?.hand && self.hand.length > 0),
);
</script>

<div class="min-h-screen flex flex-col justify-between bg-[#0a0a0c] text-white select-none">
  <TableNavbar />

  <main
    class="max-w-6xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 flex-1 flex flex-col items-center justify-start gap-6 sm:gap-8 {hasHandDock
      ? 'pb-72 sm:pb-84 md:pb-92'
      : 'pb-12 sm:pb-16'}"
  >
    <SinglePlayerBanner />
    <JudgingStage />
    <RoundWinnerOverlay />
    <VictoryScreen />
  </main>

  <HandDock />
</div>
