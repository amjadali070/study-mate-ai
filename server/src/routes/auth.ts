import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { generateToken } from '../middleware/auth';
import { RegisterRequest, LoginRequest, LoginResponse } from '../types';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password }: RegisterRequest = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
      }
    });

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email });

    const response: LoginResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
      }
    };

    res.status(201).json({
      message: 'User registered successfully',
      data: response
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email });

    const response: LoginResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
      }
    };

    res.json({
      message: 'Login successful',
      data: response
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile (protected route)
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    // This would need the auth middleware applied
    res.json({ message: 'This endpoint requires authentication middleware' });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', (req: Request, res: Response) => {
  // Since we're using JWT, logout is handled client-side by removing the token
  res.json({ message: 'Logged out successfully' });
});

export default router;
