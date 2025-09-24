import { Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthRequest } from '../types';

export const verifyJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token is required' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string };
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const generateToken = (payload: { id: string; email: string }): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
};
