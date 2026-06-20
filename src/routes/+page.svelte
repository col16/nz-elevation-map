<script lang="ts">
    import Map from "../lib/Map.svelte";
    import Legend from "../lib/Legend.svelte";

    let min = $state(0);
    let max = $state(2000);
    let colourmap = $state("naviaW_reversed");

    function handleRangeUpdate(newMin: number, newMax: number) {
        if (min !== newMin || max !== newMax) {
            min = newMin;
            max = newMax;
        }
    }
</script>

<main class="relative w-screen h-screen">
    <Map onRangeUpdate={handleRangeUpdate} {colourmap} {min} {max} />
    <Legend {min} {max} {colourmap} />
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
