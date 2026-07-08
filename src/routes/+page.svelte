<script lang="ts">
    import Map from "../lib/Map.svelte";
    import Legend from "../lib/Legend.svelte";
</script>

<main class="relative w-screen h-screen">
    <Map />
    <Legend />
</main>

<style>
    :global(body, html) {
        margin: 0;
        padding: 0;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }
</style>
