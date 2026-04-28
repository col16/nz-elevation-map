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
            "linz-elevation": {
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
                source: "linz-elevation",
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
                source: "linz-elevation",
                paint: {
                    "hillshade-exaggeration": 0.5,
                },
            },
        ],
        terrain: {
            source: "linz-elevation",
            exaggeration: 1,
        },
    },
    center: [174.886, -40.9006], // Slightly adjusted for better NZ view
    zoom: 5,
    pitch: 45,
    maxPitch: 85,
});

map.addControl(new maplibregl.NavigationControl());

// Build Legend
const legend = document.getElementById("legend");
const steps = 5;
const min = 0;
const max = 2000;

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
    label.innerText = `${val}m`;

    item.appendChild(color);
    item.appendChild(label);
    legend.appendChild(item);
}
