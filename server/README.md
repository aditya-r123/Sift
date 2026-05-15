# Server

Backend code lives here. `src/app.ts` builds the Express app and exports it for Vercel, while `src/index.ts` starts the local server for development and production runs.

Future backend modules should fit under `src/` by domain: `auth`, `spotify`, `users`, `friends`, `songs`, `swipes`, `taste`, `recommendations`, `db`, and `middleware`.
