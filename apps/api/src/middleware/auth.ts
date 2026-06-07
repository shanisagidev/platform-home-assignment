import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }
  
  // Check for Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    return;
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  // Accept any non-empty token (as per requirements)
  if (!token || token.trim() === '') {
    res.status(401).json({ error: 'Token is required' });
    return;
  }
  
  // Token is valid (we don't validate or decode it)
  next();
}

