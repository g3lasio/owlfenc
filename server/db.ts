import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set. Did you forget to provision a database?");
  if (process.env.NODE_ENV === 'production') {
    console.warn("Running without database connection in production - API features will be limited");
    // Export null db in production if no DATABASE_URL
    // This allows the server to start but with limited functionality
  } else {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
}

// Create pool and db only if DATABASE_URL is available
export const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

export const db = pool 
  ? drizzle({ client: pool, schema })
  : null;