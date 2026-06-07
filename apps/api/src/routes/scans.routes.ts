import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { ScanService } from '../services/scan.service.js';

export function createScansRoutes(db: Database): Router {
  const router = Router();
  const scanService = new ScanService(db);
  
  // GET /api/scans/status - Get current scan status (IDLE or RUNNING)
  // Must be defined BEFORE /:id to avoid route conflict
  router.get('/status', (_req, res) => {
    const status = scanService.getCurrentStatus();
    const lastCompleted = scanService.getLastCompletedScan();
    
    res.json({
      ...status,
      lastCompleted: lastCompleted ? {
        scanId: lastCompleted.id,
        completedAt: lastCompleted.completedAt,
        alertsCreatedCount: lastCompleted.alertsCreatedCount,
      } : null,
    });
  });
  
  // POST /api/scans - Start a new scan
  router.post('/', (_req, res) => {
    const scanRun = scanService.startScan();
    res.status(201).json(scanRun);
  });
  
  // GET /api/scans - List all scans
  router.get('/', (_req, res) => {
    const scans = scanService.getAll();
    res.json(scans);
  });
  
  // GET /api/scans/:id - Get single scan
  router.get('/:id', (req, res) => {
    const scan = scanService.getById(req.params.id);
    
    if (!scan) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }
    
    res.json(scan);
  });
  
  return router;
}

