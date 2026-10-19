import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  tenantId?: number;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const demoTenantHeader = req.headers['x-demo-workspace'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    if (token && token !== 'demo-session-token') {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
        return next();
      } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid Firebase ID token' });
      }
    }
  }

  // Allow explicit interactive workspace evaluation / sandbox session if header or token is demo-session-token
  if (
    (authHeader && authHeader === 'Bearer demo-session-token') ||
    demoTenantHeader === 'true'
  ) {
    const customUid = (req.headers['x-actor-uid'] as string) || 'demo-owner-uid-01';
    const customEmail = (req.headers['x-actor-email'] as string) || 'owner@apexglobal-crm.io';
    const customName = (req.headers['x-actor-name'] as string) || 'Elena Vance (Workspace Owner)';
    req.user = {
      uid: customUid,
      email: customEmail,
      name: customName,
    } as unknown as DecodedIdToken;
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
};
