import "./style.css";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const apiKey = import.meta.env.VITE_LINZ_API_KEY;

if (!apiKey) {
    console.error("VITE_LINZ_API_KEY is not defined in .env");
}

const map = new maplibregl.Map({
    container: "map",
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
                id: "background",
                type: "background",
                paint: {
                    "background-color": "#f0f0f0",
                },
            },
            {
                id: "elevation-color",
                type: "color-relief",
                source: "terrain-colour",
                paint: {
                    "color-relief-color": [
                        "interpolate",
                        ["linear"],
                        ["elevation"],
                        0,
                        "rgb(144, 238, 144)", // lightgreen
                        2000,
                        "rgb(0, 100, 0)", // darkgreen
                    ],
                },
            },
            {
                id: "hillshading",
                type: "hillshade",
                source: "terrain-colour",
                paint: {
                    "hillshade-exaggeration": 0.5,
                },
            },
        ],
        terrain: {
            source: "terrain-3D",
            exaggeration: 1,
        },
    },
    center: [174.886, -40.9006], // Slightly adjusted for better NZ view
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

// Display legend
function updateLegend(min, max) {
    const legend = document.getElementById("legend");
    // Clear existing items except the title
    const title = legend.querySelector("h4");
    legend.innerHTML = "";
    legend.appendChild(title);

    const steps = 5;
    const range = max - min;
    const precision = range < 10 ? 1 : 0;

    for (let i = 0; i <= steps; i++) {
        const val = min + (max - min) * (i / steps);
        const item = document.createElement("div");
        item.className = "legend-item";

        const color = document.createElement("span");
        color.className = "legend-color";

        const ratio = i / steps;
        const r = Math.round(144 + (0 - 144) * ratio);
        const g = Math.round(238 + (100 - 238) * ratio);
        const b = Math.round(144 + (0 - 144) * ratio);
        color.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

        const label = document.createElement("span");
        label.innerText = `${val.toFixed(precision)}m`;

        item.appendChild(color);
        item.appendChild(label);
        legend.appendChild(item);
    }
}

let currentMin = undefined;
let currentMax = undefined;

function updateElevationRange(min, max) {
    if (min !== currentMin || max !== currentMax) {
        currentMin = min;
        currentMax = max;

        map.setPaintProperty("elevation-color", "color-relief-color", [
            "interpolate",
            ["linear"],
            ["elevation"],
            min,
            "rgb(144, 238, 144)",
            max,
            "rgb(0, 100, 0)",
        ]);

        updateLegend(min, max);
    }
}

function getCurrentElevationRange() {
    if (!map.terrain) {
        return updateElevationRange(0, 2000);
    }

    const maxElevationSamples = 1000;

    const canvas = map.getCanvas();
    const width = canvas.width;
    const height = canvas.height;

    // Calculate sampling step to check at most maxSamples pixels
    const step = Math.sqrt((width * height) / maxElevationSamples);

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const horizontal_n_steps = Math.ceil(width / step);
    const vertical_n_steps = Math.ceil(height / step);
    const lngStep = (ne.lng - sw.lng) / horizontal_n_steps;
    const latStep = (ne.lat - sw.lat) / vertical_n_steps;

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i <= horizontal_n_steps; i++) {
        for (let j = 0; j <= vertical_n_steps; j++) {
            const lng = sw.lng + i * lngStep;
            const lat = sw.lat + j * latStep;

            const elev = map.queryTerrainElevation([lng, lat]);

            if (elev !== null) {
                if (elev > max) {
                    max = elev;
                }
                if (elev < min) {
                    min = elev;
                }
            }
        }
    }

    //Sanity check
    if (min < 0) {
        min = 0;
    }
    if (max === -Infinity || max === Infinity) {
        max = 2000;
    }

    //Round appropriately
    if (max - min < 10) {
        //1dp
        min = Math.round(min * 10) / 10;
        max = Math.round(max * 10) / 10;
        if (min == max) {
            max = min + 0.1;
        }
    } else if (max - min < 100) {
        //0dp
        min = Math.floor(min);
        max = Math.ceil(max);
        if (min == max) {
            max = min + 1;
        }
    } else if (max - min < 1000) {
        //Nearest 10
        min = Math.floor(min / 10) * 10;
        max = Math.ceil(max / 10) * 10;
        if (min == max) {
            max = min + 10;
        }
    } else {
        //Nearest 100
        min = Math.floor(min / 100) * 100;
        max = Math.ceil(max / 100) * 100;
        if (min == max) {
            max = min + 100;
        }
    }

    updateElevationRange(min, max);
}

map.on("load", () => {
    getCurrentElevationRange(map);
});

map.on("moveend", () => {
    getCurrentElevationRange(map);
});

map.on("terrain", () => {
    if (!map.terrain) {
        console.log(
            "Elevation range defaulting to 0–2000 m as terrain not enabled",
        );
    } else {
        console.log("Elevation range will be auto-updated");
    }
});
