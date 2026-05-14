import app, { PORT, SPOTIFY_REDIRECT_URI } from "./app.js";

const server = app.listen(PORT, () => {
  console.log(`API + static: http://127.0.0.1:${PORT}`);
  if (SPOTIFY_REDIRECT_URI) {
    console.log(`Spotify redirect_uri (must match Dashboard exactly): ${SPOTIFY_REDIRECT_URI}`);
  }
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process: lsof -nP -iTCP:${PORT} -sTCP:LISTEN\n` +
        `If you change PORT, update SPOTIFY_REDIRECT_URI and Spotify Dashboard to match (e.g. http://127.0.0.1:${PORT}/auth/callback).`
    );
    process.exit(1);
  }
  throw err;
});
