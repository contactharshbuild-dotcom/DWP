import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User, Organization } from '../models/index.js';

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET || 'lms_super_secret_key_123',
    { expiresIn: '30d' }
  );
};

export const getInviteDetails = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Invitation token is required.' });
    }

    // Find user by token and ensure token is not expired
    const user = await User.findOne({
      where: {
        invite_token: token,
        invite_expires: {
          [Op.gt]: new Date()
        },
        status: 'pending'
      },
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['name']
      }]
    });

    if (!user) {
      return res.status(400).json({
        message: 'This invitation link is invalid, expired, or has already been accepted.'
      });
    }

    return res.json({
      name: user.name,
      email: user.email,
      organizationName: user.organization?.name || 'Organization'
    });

  } catch (error) {
    console.error('Error in getInviteDetails:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching invite details.',
      error: error.message
    });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Find pending user by token
    const user = await User.findOne({
      where: {
        invite_token: token,
        invite_expires: {
          [Op.gt]: new Date()
        },
        status: 'pending'
      },
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'slug']
      }]
    });

    if (!user) {
      return res.status(400).json({
        message: 'This invitation link is invalid, expired, or has already been accepted.'
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user status and clear invite token
    await user.update({
      password: hashedPassword,
      status: 'active',
      invite_token: null,
      invite_expires: null
    });

    // Generate JWT Token for login
    const loginToken = generateToken(user);

    return res.json({
      message: 'Invitation accepted. Account activated successfully.',
      token: loginToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      organization: user.organization
    });

  } catch (error) {
    console.error('Error in acceptInvite:', error);
    return res.status(500).json({
      message: 'Internal server error while accepting invitation.',
      error: error.message
    });
  }
};
