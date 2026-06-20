# NZ Elevation Map

A 3D elevation map of New Zealand using MapLibre GL JS, Svelte 5, and Tailwind CSS.

## Features

- 3D Terrain visualization using LINZ elevation data.
- Dynamic color relief layer that updates based on the current viewport's elevation range.
- Interactive legend showing elevation min/max and color scale.
- Navigation controls for pitch, roll, and zoom.

## Tech Stack

- **Svelte 5**: Modern UI framework using runes for reactivity.
- **MapLibre GL JS**: Open-source map rendering library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Vite**: Fast build tool and dev server.
- **TypeScript**: Static typing for better developer experience.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file in the root directory and add your LINZ API key:
   ```env
   VITE_LINZ_API_KEY=your_linz_api_key_here

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.
