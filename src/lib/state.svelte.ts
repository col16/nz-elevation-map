type StateShape = {
    auto_elevation_range: boolean;
    colourmap: string;
    showTopolite: boolean;
    elevationLookupMillisecondsPerPixel: number[];
};

export const userState = $state({
    auto_elevation_range: true,
    colourmap: "naviaW_reversed",
    showTopolite: true,
    elevationLookupMillisecondsPerPixel: [0.3],
}) as StateShape;

function assignIfPresent<K extends keyof StateShape>(
    target: StateShape,
    source: Partial<StateShape>,
    key: K,
) {
    if (key in source && source[key] !== undefined) {
        target[key] = source[key]!;
    }
}

if (typeof localStorage !== "undefined" && localStorage.state) {
    try {
        const ls = JSON.parse(localStorage.state) as Partial<StateShape>;

        if (typeof ls === "object" && ls !== null) {
            (Object.keys(userState) as Array<keyof StateShape>).forEach(
                (key) => {
                    assignIfPresent(userState, ls, key);
                },
            );
        }
    } catch (e) {
        console.error("Failed to parse state from localStorage", e);
    }
}

$effect.root(() => {
    $effect(() => {
        if (typeof localStorage !== "undefined") {
            localStorage.state = JSON.stringify(userState);
        }
    });
});
