# Agent Instructions

This project is a Svelte 5 application. Please follow these guidelines when working on the codebase:

- **Svelte 5 Runes**: Use `$state`, `$derived`, `$effect`, and `$props` for reactivity. Avoid the legacy Svelte 4 syntax.
- **Component Pattern**: Keep the map logic in `Map.svelte` and UI components like `Legend.svelte` separate.
- **Elevation Logic**: The elevation range is sampled from the viewport. Be mindful of performance when adjusting the sampling rate in `Map.svelte`.
- **Styling**: Use Tailwind CSS for most styling. The `Legend.svelte` component uses some custom CSS for specific layout requirements as per user preference.
- **TypeScript**: Maintain strict type safety across the project.
- **API Keys**: Ensure `VITE_LINZ_API_KEY` is used for all LINZ basemap requests.
