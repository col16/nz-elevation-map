<script lang="ts">
    import Map from "../lib/Map.svelte";
</script>

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
