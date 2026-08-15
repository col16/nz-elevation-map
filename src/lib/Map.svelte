<script lang="ts">
    import { onMount, mount, unmount, type ComponentProps } from "svelte";
    import { replaceState } from "$app/navigation";

    import maplibregl from "maplibre-gl";
    import type { IControl, Map } from "maplibre-gl";
    import "maplibre-gl/dist/maplibre-gl.css";

    import MaplibreGeocoder from "@maplibre/maplibre-gl-geocoder";
    import type {
        MaplibreGeocoderApi,
        MaplibreGeocoderApiConfig,
    } from "@maplibre/maplibre-gl-geocoder";
    import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";

    import { buildMapLibreColours } from "./colourmaps";
    import { createMap } from "./map";
    import Legend from "./Legend.svelte";
    import { userState } from "./state.svelte";

    const elevationState = $state({
        min: 0,
        max: 2000,
    });

    const targetLookupTimeInMilliseconds = 150;

    type LegendProps = ComponentProps<typeof Legend>;
    class SvelteLegendControl implements IControl {
        private _map?: Map;
        private _container?: HTMLElement;
        private _componentInstance?: Record<string, any>;
        private _props: LegendProps;

        constructor(props: LegendProps) {
            this._props = props;
        }

        onAdd(map: Map): HTMLElement {
            this._map = map;

            // Create wrapper container with MapLibre's default control class
            this._container = document.createElement("div");
            this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

            // Mount your Svelte 5 component inside the container
            this._componentInstance = mount(Legend, {
                target: this._container,
                props: this._props,
            });

            return this._container;
        }

        onRemove(): void {
            if (this._componentInstance) {
                unmount(this._componentInstance);
            }
            this._container?.parentNode?.removeChild(this._container);
            this._map = undefined;
        }
    }

    let mapContainer: HTMLDivElement | undefined;
    let map: maplibregl.Map | undefined;

    let needsRecolour = false;

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

        map = createMap(initialPosition, userState.colourmap, mapContainer);

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

        const legendControl = new SvelteLegendControl({
            elevationState,
            updateURLHashWithPosition,
        });
        map.addControl(legendControl, "bottom-left");

        map.once("load", () => {
            needsRecolour = true;
        });
        map.on("moveend", () => {
            needsRecolour = true;
        });
        map.on("idle", () => {
            getCurrentElevationRange();
        });

        map.on("moveend", updateURLHashWithPosition);

        map.on("terrain", (e) => {
            if (!map) return;
            const terrain = map.getTerrain();
            if (terrain) {
                userState.auto_elevation_range = true;
            } else {
                userState.auto_elevation_range = false;
            }
        });

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

        const max = parseFloat(params.get("max") ?? "NaN");
        const min = parseFloat(params.get("min") ?? "NaN");
        if (!isNaN(max) && !isNaN(min)) {
            userState.auto_elevation_range = false;
            elevationState.max = max;
            elevationState.min = min;
        }

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
            ["lat", center.lat.toFixed(4)],
            ["lng", center.lng.toFixed(4)],
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
        if (!userState.auto_elevation_range) {
            params.set("min", elevationState.min.toString());
            params.set("max", elevationState.max.toString());
        }

        // Replace state instead of push state to avoid cluttering browser history on every drag
        replaceState("?" + params.toString(), {});
    }

    function getCurrentElevationRange() {
        if (!needsRecolour) {
            return;
        }

        if (!map || !userState.auto_elevation_range) return;

        //Don't want elevation to be checked a second time while this one is still going
        needsRecolour = false;

        if (!map.terrain) {
            elevationState.min = 0;
            elevationState.max = 2000;
            recolourMap(0, 2000, userState.colourmap);
            return;
        }
        if (map?.getZoom() < 8) {
            elevationState.min = 0;
            elevationState.max = 2000;
            recolourMap(0, 2000, userState.colourmap);
            return;
        }

        const canvas = map.getCanvas();
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        const mpp =
            userState.elevationLookupMillisecondsPerPixel.reduce(
                (sum, num) => sum + num,
                0,
            ) / userState.elevationLookupMillisecondsPerPixel.length;
        const pixel_budget = targetLookupTimeInMilliseconds / mpp;

        const step_hor = ((width * height) / pixel_budget) ** 0.5;

        const horizontal_n_steps = Math.floor(width / step_hor);
        const vertical_n_steps = Math.floor(pixel_budget / horizontal_n_steps);
        const step_ver = height / vertical_n_steps;
        const offset_hor = (width % step_hor) / 2;
        const offset_ver = (height % step_ver) / 2;

        let min_val = Infinity;
        let max_val = -Infinity;
        const startTime = performance.now();
        for (let i = 0; i <= horizontal_n_steps; i++) {
            for (let j = 0; j <= vertical_n_steps; j++) {
                const x = offset_hor + i * step_hor;
                const y = offset_ver + j * step_ver;
                const lngLat = map.unproject([x, y]);
                const elev = map.queryTerrainElevation(lngLat);
                if (elev !== null) {
                    if (elev > max_val) max_val = elev;
                    if (elev < min_val) min_val = elev;
                }
            }
        }
        const endTime = performance.now();
        const tpp =
            (endTime - startTime) / (horizontal_n_steps * vertical_n_steps);
        userState.elevationLookupMillisecondsPerPixel.push(tpp);
        while (userState.elevationLookupMillisecondsPerPixel.length > 5) {
            userState.elevationLookupMillisecondsPerPixel.shift();
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

        elevationState.min = min_val;
        elevationState.max = max_val;

        recolourMap(min_val, max_val, userState.colourmap);
    }

    $effect(() => {
        if (userState.auto_elevation_range) {
            getCurrentElevationRange();
        }
    });

    function recolourMap(min: number, max: number, colourmap: string) {
        if (!map || !map.getLayer("elevation-color")) return;

        if (!map.isStyleLoaded()) {
            return;
        }

        if (min < max) {
            map.setPaintProperty("elevation-color", "color-relief-color", [
                "interpolate",
                ["linear"],
                ["elevation"],
                ...buildMapLibreColours(min, max, colourmap),
            ]);
            if (
                map.getLayoutProperty("elevation-color", "visibility") ===
                "none"
            ) {
                map.setLayoutProperty(
                    "elevation-color",
                    "visibility",
                    "visible",
                );
            }
        } else {
            map.setLayoutProperty("elevation-color", "visibility", "none");
        }
    }
</script>

<div bind:this={mapContainer} class="w-full h-full"></div>
