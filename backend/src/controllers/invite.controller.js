import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User, Organization, ClassroomTeacher } from '../models/index.js';

// Helper to generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
      email: user.email,
      batch: user.batch
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
      role: user.role,
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
    const { token, password, phone } = req.body;

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

    // Validate phone number for student role
    if (user.role === 'student') {
      if (!phone) {
        return res.status(400).json({ message: 'Phone number is required.' });
      }
      const existingPhone = await User.findOne({
        where: {
          phone,
          id: { [Op.ne]: user.id }
        }
      });
      if (existingPhone) {
        return res.status(400).json({ message: 'This phone number is already registered.' });
      }
    }

    // Generate unique username from email prefix if not set
    let username = user.username;
    if (!username) {
      const emailPrefix = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      let uniqueUsername = emailPrefix;
      let counter = 1;
      let exists = await User.findOne({ where: { username: uniqueUsername } });
      while (exists) {
        uniqueUsername = `${emailPrefix}${counter}`;
        exists = await User.findOne({ where: { username: uniqueUsername } });
        counter++;
      }
      username = uniqueUsername;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user status, password, phone, and clear invite token
    await user.update({
      password: hashedPassword,
      phone: user.role === 'student' ? phone : user.phone,
      username,
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
        username: user.username,
        role: user.role,
        batch: user.batch
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
