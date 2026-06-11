import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sequelize, Organization, User } from '../models/index.js';

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

export const signup = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      orgName,
      slug,
      orgEmail,
      phone,
      logoUrl,
      address,
      adminName,
      email,
      password
    } = req.body;

    // 1. Validations
    if (!orgName || !slug || !adminName || !email || !password) {
      return res.status(400).json({
        message: 'Organization name, slug, admin name, email, and password are required.'
      });
    }

    // Check if organization slug is already taken
    const existingOrg = await Organization.findOne({ where: { slug } }, { transaction: t });
    if (existingOrg) {
      await t.rollback();
      return res.status(400).json({ message: 'Organization slug is already taken.' });
    }

    // Check if user email is already registered
    const existingUser = await User.findOne({ where: { email } }, { transaction: t });
    if (existingUser) {
      await t.rollback();
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create Organization
    const organization = await Organization.create({
      name: orgName,
      slug,
      email: orgEmail || email, // Fallback to admin email if org email not provided
      phone,
      logo_url: logoUrl,
      address,
      status: 'active'
    }, { transaction: t });

    // 4. Create Admin User
    const user = await User.create({
      organization_id: organization.id,
      name: adminName,
      email,
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    }, { transaction: t });

    // Commit transaction
    await t.commit();

    // 5. Generate JWT Token
    const token = generateToken(user);

    // 6. Response
    return res.status(201).json({
      message: 'Organization and Admin registered successfully.',
      token,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('Error in signup:', error);
    return res.status(500).json({
      message: 'Internal server error during registration.',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user and include organization details
    const user = await User.findOne({
      where: { email },
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'slug', 'status']
      }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'User account is inactive.' });
    }

    if (user.organization && user.organization.status !== 'active') {
      return res.status(403).json({ message: 'Organization is inactive.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate token
    const token = generateToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      organization: user.organization
    });

  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({
      message: 'Internal server error during login.',
      error: error.message
    });
  }
};
