<script lang="ts">
    import { colourmaps } from "./colourmaps";
    import { userState } from "./state.svelte";

    let {
        elevationState,
        updateURLHashWithPosition,
    }: {
        elevationState: { min: number; max: number };
        updateURLHashWithPosition: Function;
    } = $props();

    let canvas: HTMLCanvasElement | undefined = $state();

    $effect(() => {
        if (canvas && userState.colourmap) {
            updateLegend(userState.colourmap);
        }
    });

    function updateLegend(colourmap: string) {
        if (!canvas) return;

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
</script>

<div id="legend" class="legend">
    <canvas
        class="colour-ramp w-12 h-32 my-1.5 border border-gray-200"
        bind:this={canvas}
    ></canvas>

    <div class="max-label leading-none text-sm text-gray-700 whitespace-nowrap">
        <label for="max-elevation-input">
            <input
                type="number"
                id="max-elevation-input"
                bind:value={elevationState.max}
                max="4000"
                min="0.1"
                step="0.1"
                oninput={() => (userState.auto_elevation_range = false)}
            />
            mRL
        </label>
    </div>

    <div class="min-label leading-none text-sm text-gray-700 whitespace-nowrap">
        <label for="min-elevation-input">
            <input
                type="number"
                id="min-elevation-input"
                bind:value={elevationState.min}
                max="3700"
                min="0"
                step="0.1"
                oninput={() => (userState.auto_elevation_range = false)}
            />
            mRL
        </label>
    </div>

    <div class="legend-footer text-gray-700 text-xsm pt-3 whitespace-nowrap">
        <label for="auto-range">
            <input
                type="checkbox"
                id="auto-range"
                class="rounded-sm w-3 h-3"
                bind:checked={userState.auto_elevation_range}
                onchange={() => updateURLHashWithPosition()}
            /> Auto elevation range
        </label>
    </div>
</div>

<style>
    .legend {
        padding: 15px;
        font-size: 12px;
        display: grid;
        grid-template-columns: min-content min-content;
        grid-template-rows: min-content 1fr min-content min-content;
        gap: 0px 6px;
        grid-template-areas:
            "colour-ramp max-label"
            "colour-ramp ."
            "colour-ramp min-label"
            "legend-footer legend-footer ";
    }

    .colour-ramp {
        grid-area: colour-ramp;
    }
    .max-label {
        grid-area: max-label;
    }
    .min-label {
        grid-area: min-label;
    }

    .legend-footer {
        grid-area: legend-footer;
        text-box-trim: both;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
        width: 3rem;
        padding: 3px 5px;
        border-radius: 4px;
        font-size: 14px;
        line-height: 1;
    }
</style>
