import express from 'express';
import validate from '../middlewares/validate.js';
import authValidation from '../validations/auth.validation.js';
import { register, login, getMe } from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/register', validate(authValidation.register), (req, res, next) => {
  console.log('Register attempt:', req.body.email);
  next();
}, register);

router.post('/login', validate(authValidation.login), (req, res, next) => {
  console.log('Login attempt:', req.body.email);
  next();
}, login);

// Helper to generate Token and Redirect
const handleAuthCallback = (req, res) => {
  console.log('OAuth callback triggered');

  const user = req.user;

  if (!user) {
    console.error('No user found in OAuth callback');
    return res.redirect('/login/failed');
  }

  console.log('OAuth user:', {
    id: user.id,
    email: user.email,
  });

  try {
    // 1. Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    console.log('JWT generated');

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    console.log('Cookie set successfully');

    const redirectUrl = `${process.env.CLIENT_URL}/auth/callback`;
    console.log('Redirecting to:', redirectUrl);

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error during OAuth callback:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// --- Google Routes ---
router.get('/google', (req, res, next) => {
  console.log('Google OAuth started');
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  (req, res, next) => {
    console.log('Google OAuth callback received');
    next();
  },
  passport.authenticate('google', { session: false, failureRedirect: '/login/failed' }),
  handleAuthCallback
);

// --- GitHub Routes ---
router.get('/github', (req, res, next) => {
  console.log('GitHub OAuth started');
  next();
}, passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  (req, res, next) => {
    console.log('GitHub OAuth callback received');
    next();
  },
  passport.authenticate('github', { session: false, failureRedirect: '/login/failed' }),
  handleAuthCallback
);

router.get('/me', authMiddleware, (req, res, next) => {
  console.log('Fetching current user:', req.user?.id);
  next();
}, getMe);

router.post('/logout', (req, res) => {
  console.log('User logout triggered');
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;
