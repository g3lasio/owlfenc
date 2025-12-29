import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import { resilientDb } from './lib/resilient-db-wrapper';
import ws from 'ws';

// Configure Neon for WebSocket mode - REQUIRED for transaction support
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set. Did you forget to provision a database?");
  if (process.env.NODE_ENV === 'production') {
    console.warn("Running without database connection in production - API features will be limited");
    // Export null db in production if no DATABASE_URL
    // This allows the server to start but with limited functionality
  } else {
    console.warn("DATABASE_URL not set in development. Continuing without database for testing purposes.");
  }
}

// Create WebSocket-based connection with transaction support
export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
export const db = pool ? drizzle(pool, { schema }) : null;

// Export resilient wrapper for services that need retry logic
export { resilientDb };