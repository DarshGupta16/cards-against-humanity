<script lang="ts">
import "./layout.css";
import favicon from "$lib/assets/favicon.svg";
import type { LayoutProps } from "./$types";

let { children }: LayoutProps = $props();
</script>

<svelte:head>
  <title>Cards Against Humanity — A Party Game for Horrible People</title>
  <meta name="description" content="Digitized Cards Against Humanity multiplayer card game." />
  <link rel="icon" href={favicon} />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

{@render children()}
