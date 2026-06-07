import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import type { LoginRequest, LoginResponse, ErrorResponse, UserRow } from '../types/api.js';

export function createAuthRoutes(db: Database): Router {
  const router = Router();
  
  router.post('/', (req, res) => {
    const { username, password } = req.body as LoginRequest;
    
    if (!username || !password) {
      const response: ErrorResponse = { error: 'Username and password are required' };
      res.status(400).json(response);
      return;
    }
    
    // Find user
    const user = db.prepare(`
      SELECT id, username, display_name, password, role
      FROM users
      WHERE username = ?
    `).get(username) as UserRow | undefined;
    
    if (!user || user.password !== password) {
      const response: ErrorResponse = { error: 'Invalid username or password' };
      res.status(401).json(response);
      return;
    }
    
    // Success - return fake token
    const response: LoginResponse = {
      token: 'fake-jwt-token',
      user: {
        id: user.id,
        displayName: user.display_name,
        role: user.role,
      },
    };
    
    res.json(response);
  });
  
  return router;
}

