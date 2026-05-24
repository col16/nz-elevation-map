<script lang="ts">
    import { onMount } from 'svelte';
    import { colourmaps } from '../colourmaps';

    interface Props {
        min: number;
        max: number;
        colourmap: string;
    }

    let { min, max, colourmap }: Props = $props();

    let canvas: HTMLCanvasElement | undefined = $state();

    $effect(() => {
        if (canvas && min !== undefined && max !== undefined) {
            updateLegend(min, max);
        }
    });

    function updateLegend(min: number, max: number) {
        if (!canvas) return;
        const precision = max - min < 10 ? 1 : 0;

        const cm = colourmaps[colourmap as keyof typeof colourmaps];
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Create a linear gradient (x0, y0, x1, y1)
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);

        for (let i = 0; i < 256; i++) {
            gradient.addColorStop(
                i / 255,
                `rgb(${cm[i][0] * 255}, ${cm[i][1] * 255}, ${cm[i][2] * 255})`,
            );
        }

        // Fill the canvas
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const precision = $derived(max - min < 10 ? 1 : 0);
</script>

<div id="legend" class="legend">
    <h4>Elevation (m)</h4>
    <div class="legend-container">
        <canvas bind:this={canvas}></canvas>
        <div class="legend-labels">
            <span class="label" id="max-elevation-label">{max.toFixed(precision)}m</span>
            <span class="label" id="min-elevation-label">{min.toFixed(precision)}m</span>
        </div>
    </div>
</div>

<style>
    .legend {
        position: absolute;
        bottom: 30px;
        left: 20px;
        background: rgba(255, 255, 255, 0.9);
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        z-index: 10;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        min-width: 120px;
    }

    .legend h4 {
        margin: 0 0 12px;
        font-size: 14px;
        color: #333;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
    }

    .legend-container {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        position: relative;
    }

    .legend canvas {
        width: 50px;
        height: 170px;
        display: block;
    }

    .legend-labels {
        position: relative;
        margin-left: 10px;
        width: 60px;
    }

    .label {
        position: absolute;
        font-size: 12px;
        color: #333;
        white-space: nowrap;
    }

    #max-elevation-label {
        top: 0;
        transform: translateY(-50%);
    }

    #min-elevation-label {
        bottom: 0;
        transform: translateY(50%);
    }
</style>
