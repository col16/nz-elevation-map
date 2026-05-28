<script lang="ts">
    import { onMount } from "svelte";
    import maplibregl from "maplibre-gl";
    import "maplibre-gl/dist/maplibre-gl.css";
    import { buildMapLibreColours } from "../colourmaps";

    interface Props {
        onRangeUpdate: (min: number, max: number) => void;
        colourmap: string;
        min: number;
        max: number;
    }

    let { onRangeUpdate, colourmap, min, max }: Props = $props();

    let mapContainer: HTMLDivElement | undefined = $state();
    let map: maplibregl.Map | undefined = $state();

    const apiKey = import.meta.env.VITE_LINZ_API_KEY;

    onMount(() => {
        if (!apiKey) {
            console.error("VITE_LINZ_API_KEY is not defined in .env");
        }

        if (!mapContainer) return;

        map = new maplibregl.Map({
            container: mapContainer,
            style: {
                version: 8,
                sources: {
                    "terrain-3D": {
                        type: "raster-dem",
                        tiles: [
                            `https://basemaps.linz.govt.nz/v1/tiles/elevation/WebMercatorQuad/{z}/{x}/{y}.png?api=${apiKey}&pipeline=terrain-rgb`,
                        ],
                        tileSize: 256,
                        encoding: "mapbox",
                    },
                    "terrain-colour": {
                        type: "raster-dem",
                        tiles: [
                            `https://basemaps.linz.govt.nz/v1/tiles/elevation/WebMercatorQuad/{z}/{x}/{y}.png?api=${apiKey}&pipeline=terrain-rgb`,
                        ],
                        tileSize: 256,
                        encoding: "mapbox",
                    },
                },
                layers: [
                    {
                        id: "elevation-color",
                        type: "color-relief",
                        source: "terrain-colour",
                        paint: {
                            "color-relief-color": [
                                "interpolate",
                                ["linear"],
                                ["elevation"],
                                ...buildMapLibreColours(0, 2000, colourmap),
                            ],
                        },
                    },
                    {
                        id: "hillshading",
                        type: "hillshade",
                        source: "terrain-colour",
                        paint: {
                            "hillshade-exaggeration": 0.25,
                            "hillshade-method": "combined",
                        },
                    },
                ],
                terrain: {
                    source: "terrain-3D",
                    exaggeration: 1,
                },
            },
            center: [174.886, -40.9006],
            zoom: 5,
            pitch: 0,
            maxPitch: 85,
        });

        map.addControl(
            new maplibregl.NavigationControl({
                visualizePitch: true,
                visualizeRoll: true,
                showCompass: true,
            }),
        );

        map.addControl(
            new maplibregl.TerrainControl({
                source: "terrain-3D",
                exaggeration: 1,
            }),
        );

        map.on("idle", () => {
            getCurrentElevationRange();
        });

        return () => {
            map?.remove();
        };
    });

    function getCurrentElevationRange() {
        if (!map) return;
        if (!map.terrain) {
            onRangeUpdate(0, 2000);
            return;
        }

        const maxElevationSamples = 2000;
        const canvas = map.getCanvas();
        const width = canvas.width;
        const height = canvas.height;

        const step = Math.sqrt((width * height) / maxElevationSamples);

        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        const horizontal_n_steps = Math.ceil(width / step);
        const vertical_n_steps = Math.ceil(height / step);
        const lngStep = (ne.lng - sw.lng) / horizontal_n_steps;
        const latStep = (ne.lat - sw.lat) / vertical_n_steps;

        let min_val = Infinity;
        let max_val = -Infinity;

        for (let i = 0; i <= horizontal_n_steps; i++) {
            for (let j = 0; j <= vertical_n_steps; j++) {
                const lng = sw.lng + i * lngStep;
                const lat = sw.lat + j * latStep;

                const elev = map.queryTerrainElevation([lng, lat]);

                if (elev !== null) {
                    if (elev > max_val) max_val = elev;
                    if (elev < min_val) min_val = elev;
                }
            }
        }

        if (min_val < 0) min_val = 0;
        if (max_val === -Infinity || max_val === Infinity) max_val = 2000;

        // Rounding logic from original main.js
        if (max_val - min_val < 10) {
            min_val = Math.round(min_val * 10) / 10;
            max_val = Math.round(max_val * 10) / 10;
            if (min_val == max_val) max_val = min_val + 0.1;
        } else if (max_val - min_val < 100) {
            min_val = Math.floor(min_val);
            max_val = Math.ceil(max_val);
            if (min_val == max_val) max_val = min_val + 1;
        } else if (max_val - min_val < 1000) {
            min_val = Math.floor(min_val / 10) * 10;
            max_val = Math.ceil(max_val / 10) * 10;
            if (min_val == max_val) max_val = min_val + 10;
        } else {
            min_val = Math.floor(min_val / 100) * 100;
            max_val = Math.ceil(max_val / 100) * 100;
            if (min_val == max_val) max_val = min_val + 100;
        }

        onRangeUpdate(min_val, max_val);
    }

    $effect(() => {
        //Re-colour map
        let low = min;
        let high = max;
        let cm = colourmap;

        if (map == undefined) {
            return;
        }
        if (!map.isStyleLoaded()) {
            return;
        }

        map.setPaintProperty("elevation-color", "color-relief-color", [
            "interpolate",
            ["linear"],
            ["elevation"],
            ...buildMapLibreColours(low, high, cm),
        ]);
    });
</script>

<div bind:this={mapContainer} class="w-full h-full"></div>
