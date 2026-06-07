import { Router } from 'express';

export function createHealthRoutes(): Router {
  const router = Router();
  
  router.get('/', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'mock-dspm-api',
    });
  });
  
  return router;
}

