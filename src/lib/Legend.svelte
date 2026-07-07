<script lang="ts">
    import { onMount } from "svelte";
    import { colourmaps } from "./colourmaps";

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
    <canvas class="colour-ramp" bind:this={canvas}></canvas>
    <div class="max-label">
        <span class="label" id="max-elevation-label"
            >{max.toFixed(precision)} mRL</span
        >
    </div>
    <div class="min-label">
        <span class="label" id="min-elevation-label"
            >{min.toFixed(precision)} mRL</span
        >
    </div>

    <div class="legend-container">
        <div class="legend-labels"></div>
    </div>
</div>

<style>
    .legend {
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: rgba(255, 255, 255, 1);
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        z-index: 10;
        font-family:
            Helvetica Neue,
            Arial,
            Helvetica,
            sans-serif;
        font-size: 12px;
        display: grid;
        grid-template-columns: min-content min-content;
        grid-template-rows: min-content 1fr min-content;
        gap: 0px 6px;
        grid-template-areas:
            "colour-ramp max-label"
            "colour-ramp ."
            "colour-ramp min-label";
    }

    .colour-ramp {
        grid-area: colour-ramp;
        margin: 5px 0;
        border: 1px solid #eee;
        width: 50px;
        height: 170px;
        display: block;
    }
    .max-label {
        grid-area: max-label;
        line-height: 1;
    }
    .min-label {
        grid-area: min-label;
        line-height: 1;
    }

    .label {
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
