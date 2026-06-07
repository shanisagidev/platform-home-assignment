import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { seedDatabase } from '../db/seed.js';

export function createAdminRoutes(db: Database) {
  const router = Router();

  // POST /api/admin/reset - Reset environment to defaults
  router.post('/reset', (_req, res) => {
    try {
      // Delete audit events first (foreign key constraint)
      db.prepare('DELETE FROM alert_audit_events').run();
      
      // Delete all alert comments (foreign key constraint)
      db.prepare('DELETE FROM alert_comments').run();
      
      // Delete all alerts
      db.prepare('DELETE FROM alerts').run();
      
      // Delete all scan runs
      db.prepare('DELETE FROM scan_runs').run();
      
      // Delete all custom policies (non-system policies)
      db.prepare('DELETE FROM policies WHERE is_system_policy = 0').run();
      
      // Reset system policies to their default enabled state
      db.prepare(`
        UPDATE policies 
        SET enabled = CASE 
          WHEN id = 'policy_004' THEN 0 
          ELSE 1 
        END,
        updated_at = NULL
        WHERE is_system_policy = 1
      `).run();
      
      // Re-seed database to restore any missing system policies
      seedDatabase(db);
      
      res.json({ 
        success: true, 
        message: 'Environment reset completed. Your workspace has been restored to its default state.' 
      });
    } catch (error) {
      console.error('Reset failed:', error);
      res.status(500).json({ 
        error: 'Reset failed. Please try again or refresh the page.' 
      });
    }
  });

  return router;
}




