import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, ClassroomTeacher } from '../models/index.js';

export const inviteTeacher = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // 1. Validations
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    // 2. Check if email is already in use
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: 'This email is already registered in the system.'
      });
    }

    // 3. Generate Invite Token and Expiry (7 days)
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // 4. Generate a dummy hashed password since it's a database constraint
    const randomDummyPass = crypto.randomBytes(16).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedDummyPassword = await bcrypt.hash(randomDummyPass, salt);

    // 5. Create Teacher User record as "pending"
    const newTeacher = await User.create({
      organization_id: req.user.organizationId,
      name,
      email,
      password: hashedDummyPassword,
      role: 'teacher',
      status: 'pending',
      invite_token: token,
      invite_expires: expiry
    });

    const origin = req.get('origin') || (req.get('referer') ? new URL(req.get('referer')).origin : '');
    const frontendUrl = (process.env.FRONTEND_URL || origin || 'http://localhost:5173').replace(/\/+$/, '');
    const inviteLink = `${frontendUrl}/accept-invite?token=${token}`;

    return res.status(201).json({
      message: 'Teacher invited successfully.',
      teacher: {
        id: newTeacher.id,
        name: newTeacher.name,
        email: newTeacher.email,
        phone: newTeacher.phone,
        status: newTeacher.status,
        invite_token: newTeacher.invite_token
      },
      inviteLink
    });

  } catch (error) {
    console.error('Error in inviteTeacher:', error);
    return res.status(500).json({
      message: 'Internal server error while inviting teacher.',
      error: error.message
    });
  }
};

export const getTeachers = async (req, res) => {
  try {
    const teachers = await User.findAll({
      where: {
        organization_id: req.user.organizationId,
        role: 'teacher'
      },
      attributes: ['id', 'name', 'email', 'status', 'created_at', 'invite_token', 'profile_url'],
      order: [['created_at', 'DESC']]
    });

    return res.json({ teachers });
  } catch (error) {
    console.error('Error in getTeachers:', error);
    return res.status(500).json({
      message: 'Internal server error while retrieving teachers.',
      error: error.message
    });
  }
};

// Approve / Activate a teacher in the organization
export const approveTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({
      where: {
        id,
        organization_id: req.user.organizationId,
        role: 'teacher'
      }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    if (teacher.invite_token) {
      return res.status(400).json({
        message: 'This teacher has not completed their setup via the invite link yet.'
      });
    }

    teacher.status = 'active';
    await teacher.save();

    return res.json({
      success: true,
      message: 'Teacher approved and activated successfully.',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        status: teacher.status
      }
    });
  } catch (error) {
    console.error('Error in approveTeacher:', error);
    return res.status(500).json({
      message: 'Internal server error while approving teacher.',
      error: error.message
    });
  }
};

// Reject / Delete a teacher from the organization
export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({
      where: {
        id,
        organization_id: req.user.organizationId,
        role: 'teacher'
      }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    // Clean up any classroom memberships
    await ClassroomTeacher.destroy({ where: { user_id: teacher.id } });
    await teacher.destroy();

    return res.json({
      success: true,
      message: 'Teacher removed successfully.'
    });
  } catch (error) {
    console.error('Error in deleteTeacher:', error);
    return res.status(500).json({
      message: 'Internal server error while deleting teacher.',
      error: error.message
    });
  }
};
