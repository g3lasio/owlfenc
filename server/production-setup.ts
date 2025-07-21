// Production setup utilities
import express from 'express';
import path from 'path';
import fs from 'fs';

export function setupProductionRoutes(app: express.Express) {
  // Serve static files - try multiple possible paths (Vite builds to dist/public)
  const possibleClientPaths = [
    path.join(process.cwd(), 'dist', 'public'),
    path.join(process.cwd(), 'dist', 'client'),
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), 'client', 'dist')
  ];
  
  let clientPath = '';
  for (const possiblePath of possibleClientPaths) {
    if (fs.existsSync(possiblePath)) {
      clientPath = possiblePath;
      break;
    }
  }
  
  // Check if build directory exists
  if (clientPath) {
    console.log('Serving static files from:', clientPath);
    app.use(express.static(clientPath));
    
    // Serve index.html for all routes not handled by API (but skip root health checks)
    app.get('*', (req, res) => {
      // Skip API routes and health endpoints
      if (req.path.startsWith('/api') || req.path === '/' || req.path === '/health' || req.path === '/status') {
        return;
      }
      
      const indexPath = path.join(clientPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build files not found. Please run: npm run build');
      }
    });
  } else {
    console.warn('Client build directory not found. Checked paths:', possibleClientPaths);
    // Serve a basic error page
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api') || req.path === '/' || req.path === '/health' || req.path === '/status') {
        return;
      }
      res.status(503).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Service Unavailable</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f0f0f0;
              }
              .error-container {
                text-align: center;
                padding: 2rem;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              h1 { color: #333; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h1>Service Temporarily Unavailable</h1>
              <p>The application is being deployed. Please try again in a few moments.</p>
            </div>
          </body>
        </html>
      `);
    });
  }
}

// Handle uncaught errors in production
export function setupProductionErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit in production, try to keep the server running
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production
  });
}