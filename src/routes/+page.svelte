<script lang="ts">
    import Map from "../lib/Map.svelte";
    import Legend from "../lib/Legend.svelte";
</script>

<main class="relative w-dvh h-dvh">
    <Map />
    <Legend />
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
