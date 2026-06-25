<script lang="ts">
    import { onMount } from "svelte";

    import maplibregl from "maplibre-gl";
    import "maplibre-gl/dist/maplibre-gl.css";

    import MaplibreGeocoder from "@maplibre/maplibre-gl-geocoder";
    import type {
        MaplibreGeocoderApi,
        MaplibreGeocoderApiConfig,
        MaplibreGeocoderFeatureResults,
    } from "@maplibre/maplibre-gl-geocoder";
    import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";

    import { buildMapLibreColours } from "./colourmaps";
    import { createMap } from "./map";

    interface Props {
        onRangeUpdate: (min: number, max: number) => void;
        colourmap: string;
        min: number;
        max: number;
    }

    let { onRangeUpdate, colourmap, min, max }: Props = $props();

    let mapContainer: HTMLDivElement | undefined = $state();
    let map: maplibregl.Map | undefined = $state();

    let showTopolite: boolean = $state(true);

    onMount(() => {
        if (!mapContainer) return;

        const initialPosition = getPositionFromURLHash() || {
            zoom: 5,
            lng: 174.886,
            lat: -40.9006,
            bearing: 0,
            pitch: 0,
            roll: 0,
        };

        map = createMap(initialPosition, colourmap, mapContainer);

        map.addControl(
            new maplibregl.NavigationControl({
                visualizePitch: true,
                visualizeRoll: true,
                showCompass: true,
            }),
        );

        const geolocate = new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
            },
            trackUserLocation: true,
            showUserLocation: true,
        });
        map.addControl(geolocate);

        let scale = new maplibregl.ScaleControl({
            maxWidth: 160,
            unit: "metric",
        });
        map.addControl(scale, "bottom-right");

        map.addControl(
            new maplibregl.TerrainControl({
                source: "terrain-3D",
                exaggeration: 1,
            }),
        );

        const geocoderApi: MaplibreGeocoderApi = {
            forwardGeocode: async (config: MaplibreGeocoderApiConfig) => {
                const features = [];
                try {
                    const request = `https://nominatim.openstreetmap.org/search?q=${
                        config.query
                    }&format=geojson&polygon_geojson=1&addressdetails=1&countrycodes=nz`;
                    const response = await fetch(request);
                    const geojson = await response.json();
                    for (const feature of geojson.features) {
                        const center: [number, number] = [
                            feature.bbox[0] +
                                (feature.bbox[2] - feature.bbox[0]) / 2,
                            feature.bbox[1] +
                                (feature.bbox[3] - feature.bbox[1]) / 2,
                        ];
                        const point = {
                            type: "Feature" as const,
                            geometry: {
                                type: "Point" as const,
                                coordinates: center,
                            },
                            bbox: feature.bbox,
                            place_name: feature.properties.display_name,
                            properties: feature.properties,
                            text: feature.properties.display_name,
                            place_type: ["place"],
                            center,
                        };
                        features.push(point);
                    }
                } catch (e) {
                    console.error(`Failed to forwardGeocode with error: ${e}`);
                }

                return {
                    features,
                    type: "FeatureCollection",
                };
            },
        };
        map.addControl(
            new MaplibreGeocoder(geocoderApi, {
                maplibregl,
                trackProximity: true,
                zoom: 12,
                placeholder: "Search and press Enter",
                showResultMarkers: false,
            }),
            "top-left",
        );

        map.on("idle", () => {
            getCurrentElevationRange();
        });

        map.on("moveend", updateURLHashWithPosition);

        // Handle browser back/forward buttons
        const handleHashChange = () => {
            const pos = getPositionFromURLHash();
            if (pos && map != undefined) {
                map.jumpTo({
                    center: [pos.lng, pos.lat],
                    zoom: pos.zoom,
                });
            }
        };

        window.addEventListener("hashchange", handleHashChange);

        return () => {
            if (map) map.remove();
            window.removeEventListener("hashchange", handleHashChange);
        };
    });

    function getPositionFromURLHash() {
        let params = new URLSearchParams(document.location.search);
        const zoom = parseFloat(params.get("z") ?? "");
        const lat = parseFloat(params.get("lat") ?? "");
        const lng = parseFloat(params.get("lng") ?? "");
        const bearing = parseFloat(params.get("b") ?? "0");
        const pitch = parseFloat(params.get("p") ?? "0");
        const roll = parseFloat(params.get("r") ?? "0");

        // Basic validation
        if (
            !isNaN(zoom) &&
            !isNaN(lat) &&
            !isNaN(lng) &&
            !isNaN(bearing) &&
            !isNaN(pitch) &&
            !isNaN(roll)
        ) {
            return { zoom, lng, lat, bearing, pitch, roll };
        } else {
            return null;
        }
    }

    function updateURLHashWithPosition() {
        if (!map) return;

        const center = map.getCenter();
        const params = new URLSearchParams([
            ["lat", center.lat.toFixed(5)],
            ["lng", center.lng.toFixed(5)],
            ["z", map.getZoom().toFixed(2)],
        ]);
        const bearing = map.getBearing();
        if (bearing != 0) {
            params.set("b", bearing.toFixed(2));
        }
        const pitch = map.getPitch();
        if (pitch != 0) {
            params.set("p", pitch.toFixed(2));
        }
        const roll = map.getRoll();
        if (roll != 0) {
            params.set("r", roll.toFixed(2));
        }

        // Replace state instead of push state to avoid cluttering browser history on every drag
        history.replaceState(undefined, "", "?" + params.toString());
    }

    function getCurrentElevationRange() {
        if (!map) return;
        if (!map.terrain) {
            onRangeUpdate(0, 2000);
            return;
        }
        if (map?.getZoom() < 8) {
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

        // Rounding logic
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
