import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import chatHandler from "./api/chat";
import healthHandler from "./api/health";

dotenv.config();

const app = express();
// Respect Render or cloud hosting assigned port when deployed, otherwise use standard container port 3000
const PORT =
  (process.env.RENDER || (!process.env.K_SERVICE && process.env.PORT)) && process.env.PORT
    ? Number(process.env.PORT)
    : 3000;

// Enable CORS for all cross-origin requests (e.g., Vercel frontend -> Render backend)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// Body parsers with support for base64 attachments
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Route /api calls through the handlers (supports both /api/health and /health for Render health checks)
app.all(["/api/health", "/health"], (req, res) => healthHandler(req as any, res as any));
app.all(["/api/chat", "/chat", "/api/api/chat"], (req, res) => chatHandler(req as any, res as any));

// Development vs Production serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AskGPT server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
