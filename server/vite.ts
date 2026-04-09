import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // 🚀 PERFORMANCE: Add caching headers for static assets
  app.use((req, res, next) => {
    // Cache CSS, JS, and other static assets for 1 year (they have hashes)
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    next();
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Never intercept API routes — let Express handle them properly
    // This prevents the Vite catch-all from returning HTML for API requests
    if (
      url.startsWith('/api/') ||
      url.startsWith('/auth/') ||
      url.startsWith('/webhook') ||
      url.startsWith('/s/')
    ) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      // Don't cache HTML — always serve fresh
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, client build outputs to dist/public (as per vite.config.ts)
  // We use process.cwd() to ensure we're looking in the right place relative to the project root
  const distPath = path.resolve(process.cwd(), "dist", "public");

  log(`🔧 Setting up static file serving from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    log(`⚠️ Could not find the build directory: ${distPath}`, "express");
    // Fallback to "public" relative to this file (legacy behavior)
    const altPath = path.resolve(import.meta.dirname, "public");
    if (fs.existsSync(altPath)) {
      log(`✅ Found alternative build directory: ${altPath}`);
      app.use(express.static(altPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(altPath, "index.html"));
      });
      return;
    }
    log(`❌ No static build directory found. App may fail to serve frontend.`, "express");
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA fallback)
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Frontend build files missing. Please run 'npm run build' first.");
    }
  });
}
