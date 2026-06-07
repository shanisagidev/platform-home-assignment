import { createServer } from './server.js';
import { initDatabase } from './db/sqlite.js';
import { seedDatabase } from './db/seed.js';
import { getConfig } from './config/env.js';
import type { Server } from 'http';
import type { Database } from 'better-sqlite3';

// =============================================================================
// GLOBAL ERROR HANDLERS - Prevent crashes from unhandled errors
// =============================================================================

process.on('uncaughtException', (error: Error) => {
  console.error('⚠️ Uncaught Exception:', error.message);
  console.error(error.stack);
  // Don't exit - let the process continue for non-critical errors
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
  // Don't exit - let the process continue
});

// =============================================================================
// GRACEFUL SHUTDOWN - Clean up resources on termination
// =============================================================================

let server: Server | null = null;
let database: Database | null = null;

function gracefulShutdown(signal: string) {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
      
      if (database) {
        try {
          database.close();
          console.log('✅ Database connection closed');
        } catch (err) {
          console.error('⚠️ Error closing database:', err);
        }
      }
      
      console.log('👋 Goodbye!');
      process.exit(0);
    });
    
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('⚠️ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// BOOTSTRAP
// =============================================================================

async function bootstrap() {
  const config = getConfig();
  
  console.log('🚀 Starting Mock DSPM Portal API...');
  
  // Initialize database
  database = initDatabase(config.databasePath);
  console.log('✅ Database initialized');
  
  // Seed data
  seedDatabase(database);
  console.log('✅ Database seeded');
  
  // Create and start server
  const app = createServer(database);
  
  server = app.listen(config.port, () => {
    console.log(`✅ API server running on http://localhost:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

