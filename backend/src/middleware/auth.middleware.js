import jwt from 'jsonwebtoken';
import { User, Organization } from '../models/index.js';

// Verify JWT Token Middleware
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lms_super_secret_key_123');

    // Fetch user from DB to verify status and organization status
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'slug', 'status', 'logo_url']
      }]
    });

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'User account is inactive.' });
    }

    if (user.organization && user.organization.status !== 'active') {
      return res.status(403).json({ message: 'Organization is inactive.' });
    }

    // Attach decoded info and user to request object
    req.user = {
      id: user.id,
      organizationId: user.organization_id,
      role: user.role,
      email: user.email,
      name: user.name,
      organization: user.organization
    };

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Role Authorization Middleware
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role (${req.user ? req.user.role : 'Guest'}) is not allowed to access this resource.`
      });
    }
    next();
  };
};
