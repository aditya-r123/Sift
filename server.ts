/**
 * Vercel Express entry — real paths (`/auth/login`, `/health`, …) hit this app directly.
 * See https://vercel.com/docs/frameworks/backend/express
 */
import express from "express";

import app from "./server/src/app.js";

void express.Router;

export default app;

export const config = {
  maxDuration: 60,
};
