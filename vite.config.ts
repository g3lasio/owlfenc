import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Raise warning threshold — we're splitting aggressively
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        /**
         * manualChunks: split the 1MB monolithic bundle into focused parallel-loadable chunks.
         * Goal: reduce initial JS parse time from ~14s to <3s on Replit.
         */
        manualChunks(id: string) {
          // React core (always needed, cached long-term)
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          // Firebase SDK (large, rarely changes)
          if (id.includes("node_modules/firebase/") || id.includes("node_modules/@firebase/")) {
            return "vendor-firebase";
          }

          // Radix UI + shadcn components
          if (
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/tailwind-merge") ||
            id.includes("node_modules/cmdk") ||
            id.includes("node_modules/vaul") ||
            id.includes("node_modules/sonner")
          ) {
            return "vendor-ui";
          }

          // TanStack Query + router
          if (
            id.includes("node_modules/@tanstack/") ||
            id.includes("node_modules/wouter")
          ) {
            return "vendor-query";
          }

          // Stripe
          if (id.includes("node_modules/@stripe/") || id.includes("node_modules/stripe")) {
            return "vendor-stripe";
          }

          // PDF / document generation (heavy, only needed on specific pages)
          if (
            id.includes("node_modules/jspdf") ||
            id.includes("node_modules/html2canvas") ||
            id.includes("node_modules/html2pdf") ||
            id.includes("node_modules/pdfmake") ||
            id.includes("node_modules/dompurify") ||
            id.includes("node_modules/DOMPurify")
          ) {
            return "vendor-pdf";
          }

          // Charts / visualization
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3-") ||
            id.includes("node_modules/victory")
          ) {
            return "vendor-charts";
          }

          // i18n
          if (
            id.includes("node_modules/i18next") ||
            id.includes("node_modules/react-i18next")
          ) {
            return "vendor-i18n";
          }

          // Misc third-party libs
          if (
            id.includes("node_modules/axios") ||
            id.includes("node_modules/date-fns") ||
            id.includes("node_modules/zod") ||
            id.includes("node_modules/@hookform/") ||
            id.includes("node_modules/react-hook-form") ||
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/@tanstack/react-table")
          ) {
            return "vendor-misc";
          }

          // Anthropic AI SDK (large, only needed on AI pages)
          if (id.includes("node_modules/@anthropic-ai/")) {
            return "vendor-ai";
          }

          // Animation (framer-motion is large)
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-animation";
          }

          // Markdown rendering
          if (
            id.includes("node_modules/react-markdown") ||
            id.includes("node_modules/remark") ||
            id.includes("node_modules/rehype") ||
            id.includes("node_modules/micromark") ||
            id.includes("node_modules/mdast") ||
            id.includes("node_modules/unified")
          ) {
            return "vendor-markdown";
          }

          // CSV / data parsing
          if (id.includes("node_modules/papaparse")) {
            return "vendor-data";
          }

          // React ecosystem extras
          if (
            id.includes("node_modules/react-helmet") ||
            id.includes("node_modules/react-error-boundary")
          ) {
            return "vendor-react-extras";
          }

          // All other node_modules → generic vendor chunk
          if (id.includes("node_modules/")) {
            return "vendor-other";
          }

          // App code: left to Rollup's default lazy() boundary splitting
        },
      },
    },
  },
});
