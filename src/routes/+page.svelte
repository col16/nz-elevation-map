<script lang="ts">
    import Map from "../lib/Map.svelte";
</script>

<svelte:head>
    <title>NZ Elevation Map</title>
    <meta
        name="description"
        content="3D map of New Zealand terrain, with colours automatically adusted to match visible elevation range."
    />
</svelte:head>

<main class="relative w-dvw h-dvh">
    <Map />
</main>

<style>
    :global(body, html) {
        margin: 0;
        padding: 0;
        width: 100dvw;
        height: 100dvh;
        overflow: hidden;
    }
</style>
