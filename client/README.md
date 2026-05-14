# Client

Browser-facing code lives here. The current app is Vite + TypeScript + Tailwind, with the UI entrypoint in `src/index.html` and `src/main.ts`.

Keep this side focused on rendering, user interaction, audio playback, and calls to the app backend. It should not call Spotify, RapidAPI, MongoDB, or Redis directly.
