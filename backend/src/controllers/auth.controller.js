import { Op } from 'sequelize';
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
        slug: organization.slug,
        logo_url: organization.logo_url,
        logoUrl: organization.logo_url
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
        profile_url: user.profile_url,
        profileUrl: user.profile_url
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
      return res.status(400).json({ message: 'Email or phone and password are required.' });
    }

    // Find user and include organization details (search email, phone, or username)
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { phone: email },
          { username: email }
        ]
      },
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'slug', 'status', 'logo_url', 'email', 'phone', 'address']
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
        role: user.role,
        batch: user.batch,
        profile_url: user.profile_url,
        profileUrl: user.profile_url
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

// Send Login OTP for passwordless login (Public)
export const sendLoginOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.status(404).json({ message: 'User not found. Please register first.' });
    }

    if (user.role !== 'teacher') {
      return res.status(403).json({ message: 'OTP login is only supported for teachers.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Your account is not active or verified.' });
    }

    // Generate random 6-digit OTP code (100000 - 999999)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      otp_code: otpCode,
      otp_expires: otpExpires
    });

    console.log(`[DEV OTP] Generated login OTP ${otpCode} for phone ${phone}`);

    return res.json({
      message: 'Login OTP sent successfully.',
      phone,
      otpCode // For testing, return OTP directly in response
    });

  } catch (error) {
    console.error('Error in sendLoginOtp:', error);
    return res.status(500).json({
      message: 'Internal server error while sending login OTP.',
      error: error.message
    });
  }
};

// Verify Login OTP and issue token (Public)
export const verifyLoginOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required.' });
    }

    const user = await User.findOne({
      where: { phone },
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'slug', 'status', 'logo_url', 'email', 'phone', 'address']
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ message: 'OTP code has expired.' });
    }

    // Clear OTP details upon verification
    await user.update({
      otp_code: null,
      otp_expires: null
    });

    const token = generateToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
        profile_url: user.profile_url,
        profileUrl: user.profile_url
      },
      organization: user.organization
    });

  } catch (error) {
    console.error('Error in verifyLoginOtp:', error);
    return res.status(500).json({
      message: 'Internal server error while verifying login OTP.',
      error: error.message
    });
  }
};

// Update user profile (Name, email, batch, profile_url)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { name, batch, profile_url, profileUrl } = req.body;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const newProfileUrl = profile_url !== undefined ? profile_url : (profileUrl !== undefined ? profileUrl : user.profile_url);

    await user.update({
      name: name !== undefined ? name : user.name,
      batch: batch !== undefined ? batch : user.batch,
      profile_url: newProfileUrl
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
        profile_url: user.profile_url,
        profileUrl: user.profile_url
      }
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    return res.status(500).json({
      message: 'Internal server error while updating profile.',
      error: error.message
    });
  }
};

// Upload user profile avatar image
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { uploadFile } = await import('../services/storage.service.js');
    const { webViewLink } = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    await user.update({ profile_url: webViewLink });

    return res.json({
      success: true,
      message: 'Profile picture uploaded successfully.',
      profile_url: webViewLink,
      profileUrl: webViewLink,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
        profile_url: webViewLink,
        profileUrl: webViewLink
      }
    });
  } catch (error) {
    console.error('Error in uploadAvatar:', error);
    return res.status(500).json({
      message: 'Internal server error while uploading profile picture.',
      error: error.message
    });
  }
};

