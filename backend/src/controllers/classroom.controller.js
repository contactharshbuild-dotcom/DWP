import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { Classroom, User, ClassroomTeacher } from '../models/index.js';

// Helper to generate a unique 6-digit classroom ID
const generateUniqueClassroomId = async () => {
  let isUnique = false;
  let classroomId;
  while (!isUnique) {
    // Generate a 6-digit random number (100000 to 999999)
    classroomId = Math.floor(100000 + Math.random() * 900000);
    const existing = await Classroom.findOne({ where: { classroom_id: classroomId } });
    if (!existing) {
      isUnique = true;
    }
  }
  return classroomId;
};

// Create a classroom (Admin only)
export const createClassroom = async (req, res) => {
  try {
    const { name, subject } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ message: 'Classroom name and subject are required.' });
    }

    const classroom_id = await generateUniqueClassroomId();

    const classroom = await Classroom.create({
      classroom_id,
      name,
      subject,
      organization_id: req.user.organizationId
    });

    return res.status(201).json({
      message: 'Classroom created successfully.',
      classroom
    });
  } catch (error) {
    console.error('Error in createClassroom:', error);
    return res.status(500).json({
      message: 'Internal server error while creating classroom.',
      error: error.message
    });
  }
};

// Get all classrooms for organization (accessible by admin and teacher)
export const getClassrooms = async (req, res) => {
  try {
    const queryOptions = {
      where: { organization_id: req.user.organizationId },
      include: [{
        model: User,
        as: 'teachers',
        attributes: ['id', 'name', 'email', 'status'],
        through: { attributes: ['status', 'role'] }
      }],
      order: [['created_at', 'DESC']]
    };

    // If teacher or student, filter to only return classrooms where they are approved
    if (req.user.role === 'teacher' || req.user.role === 'student') {
      queryOptions.include[0].where = { id: req.user.id };
      queryOptions.include[0].through = { where: { status: 'approved' } };
    }

    const classrooms = await Classroom.findAll(queryOptions);

    return res.json({ classrooms });
  } catch (error) {
    console.error('Error in getClassrooms:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching classrooms.',
      error: error.message
    });
  }
};

// Get classroom by ID (accessible by admin and teacher)
export const getClassroomById = async (req, res) => {
  try {
    const { id } = req.params;

    // If teacher or student, first check if they have approved access to this classroom
    if (req.user.role === 'teacher' || req.user.role === 'student') {
      const hasAccess = await ClassroomTeacher.findOne({
        where: { 
          classroom_id: id, 
          user_id: req.user.id,
          status: 'approved'
        }
      });
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied. You are not an approved member of this classroom.' });
      }
    }

    const classroom = await Classroom.findOne({
      where: {
        id,
        organization_id: req.user.organizationId
      },
      include: [{
        model: User,
        as: 'teachers',
        attributes: ['id', 'name', 'email', 'status'],
        through: { attributes: ['status', 'role'] } // Include join table status & role
      }]
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    return res.json({ classroom });
  } catch (error) {
    console.error('Error in getClassroomById:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching classroom details.',
      error: error.message
    });
  }
};

// Teacher self-join classroom via 6-digit numeric Classroom ID
export const joinClassroom = async (req, res) => {
  try {
    const { classroomId } = req.body; // the 6-digit numeric code

    if (!classroomId) {
      return res.status(400).json({ message: 'Classroom ID is required.' });
    }

    // Find classroom in teacher's organization
    const classroom = await Classroom.findOne({
      where: {
        classroom_id: parseInt(classroomId),
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found in your organization.' });
    }

    // Check if join request or membership already exists
    const existingRelation = await ClassroomTeacher.findOne({
      where: {
        classroom_id: classroom.id,
        user_id: req.user.id
      }
    });

    if (existingRelation) {
      if (existingRelation.status === 'approved') {
        return res.status(400).json({ message: 'You are already a member of this classroom.' });
      } else if (existingRelation.status === 'pending') {
        return res.status(400).json({ message: 'Your request to join this classroom is already pending approval.' });
      }
    }

    // Create join request
    await ClassroomTeacher.create({
      classroom_id: classroom.id,
      user_id: req.user.id,
      status: 'pending'
    });

    return res.status(201).json({
      message: 'Join request sent successfully. Waiting for administrator approval.',
      classroom: {
        id: classroom.id,
        name: classroom.name,
        subject: classroom.subject
      }
    });

  } catch (error) {
    console.error('Error in joinClassroom:', error);
    return res.status(500).json({
      message: 'Internal server error while sending join request.',
      error: error.message
    });
  }
};

// Approve teacher join request (Admin only)
export const approveTeacher = async (req, res) => {
  try {
    const { id, teacherId } = req.params; // classroom PK, teacher user ID

    // Verify classroom belongs to admin's organization
    const classroom = await Classroom.findOne({
      where: {
        id,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Find join request
    const relation = await ClassroomTeacher.findOne({
      where: {
        classroom_id: id,
        user_id: teacherId
      }
    });

    if (!relation) {
      return res.status(404).json({ message: 'Join request not found.' });
    }

    if (relation.status === 'approved') {
      return res.status(400).json({ message: 'Teacher is already approved.' });
    }

    // Update status to approved
    await relation.update({ status: 'approved' });

    return res.json({ message: 'Teacher approved successfully.' });
  } catch (error) {
    console.error('Error in approveTeacher:', error);
    return res.status(500).json({
      message: 'Internal server error while approving teacher.',
      error: error.message
    });
  }
};

// Reject join request or Remove active teacher (Admin only)
export const rejectTeacher = async (req, res) => {
  try {
    const { id, teacherId } = req.params; // classroom PK, teacher user ID

    // Verify classroom belongs to admin's organization
    const classroom = await Classroom.findOne({
      where: {
        id,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Delete association
    const deletedCount = await ClassroomTeacher.destroy({
      where: {
        classroom_id: id,
        user_id: teacherId
      }
    });

    if (deletedCount === 0) {
      return res.status(404).json({ message: 'Teacher association not found.' });
    }

    return res.json({ message: 'Teacher removed/rejected successfully.' });
  } catch (error) {
    console.error('Error in rejectTeacher:', error);
    return res.status(500).json({
      message: 'Internal server error while rejecting/removing teacher.',
      error: error.message
    });
  }
};

// Upgrade teacher role from co-teacher to teacher (Admin only)
export const upgradeTeacherRole = async (req, res) => {
  try {
    const { id, teacherId } = req.params; // classroom PK, teacher user ID

    // Verify classroom belongs to admin's organization
    const classroom = await Classroom.findOne({
      where: {
        id,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Find classroom-teacher relation
    const relation = await ClassroomTeacher.findOne({
      where: {
        classroom_id: id,
        user_id: teacherId
      }
    });

    if (!relation) {
      return res.status(404).json({ message: 'Teacher classroom association not found.' });
    }

    if (relation.status !== 'approved') {
      return res.status(400).json({ message: 'Teacher must be approved first before upgrading.' });
    }

    if (relation.role === 'teacher') {
      return res.status(400).json({ message: 'Teacher is already upgraded to Teacher role.' });
    }

    // Update role to teacher
    await relation.update({ role: 'teacher' });

    return res.json({ 
      message: 'Teacher role upgraded successfully.', 
      relation 
    });
  } catch (error) {
    console.error('Error in upgradeTeacherRole:', error);
    return res.status(500).json({
      message: 'Internal server error while upgrading teacher role.',
      error: error.message
    });
  }
};

// Step 1: Request Phone Signup OTP (Public)
export const signupStep1Phone = async (req, res) => {
  try {
    const { phone, classroomId } = req.body;

    if (!phone || !classroomId) {
      return res.status(400).json({ message: 'Phone number and Classroom ID are required.' });
    }

    // Resolve target classroom to check organization
    const classroom = await Classroom.findOne({
      where: { classroom_id: parseInt(classroomId) }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Check if phone number is already registered and active
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser && existingUser.status === 'active') {
      return res.status(400).json({ message: 'This phone number is already registered and active. Please log in.' });
    }

    // Generate random 6-digit OTP code (100000 - 999999)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`[DEV OTP] Generated registration OTP ${otpCode} for phone ${phone}`);

    if (existingUser) {
      // Reuse existing pending/unverified user
      await existingUser.update({
        otp_code: otpCode,
        otp_expires: otpExpires,
        organization_id: classroom.organization_id
      });
    } else {
      // Create new Teacher user in unverified state
      await User.create({
        organization_id: classroom.organization_id,
        name: 'Teacher',
        phone,
        role: 'teacher',
        status: 'unverified',
        otp_code: otpCode,
        otp_expires: otpExpires
      });
    }

    return res.status(200).json({
      message: 'Signup OTP generated successfully.',
      phone,
      otpCode // For testing
    });

  } catch (error) {
    console.error('Error in signupStep1Phone:', error);
    return res.status(500).json({
      message: 'Internal server error during phone signup step.',
      error: error.message
    });
  }
};

// Step 2: Verify Phone Signup OTP (Public)
export const signupStep2VerifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required.' });
    }

    const user = await User.findOne({
      where: {
        phone,
        status: 'unverified'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or already verified.' });
    }

    if (user.otp_code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    if (new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({ message: 'OTP code has expired.' });
    }

    // Move to next onboarding state: password setup
    await user.update({
      status: 'unverified_password',
      otp_code: null,
      otp_expires: null
    });

    return res.json({
      message: 'OTP verified successfully! Please set up your password.'
    });

  } catch (error) {
    console.error('Error in signupStep2VerifyOtp:', error);
    return res.status(500).json({
      message: 'Internal server error during OTP verification step.',
      error: error.message
    });
  }
};

// Step 3: Setup Password (Public)
export const signupStep3Password = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone number and Password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const user = await User.findOne({
      where: {
        phone,
        status: 'unverified_password'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or invalid onboarding state.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and move to profile setup
    await user.update({
      password: hashedPassword,
      status: 'unverified_profile'
    });

    return res.json({
      message: 'Password saved successfully! Please configure your profile details.'
    });

  } catch (error) {
    console.error('Error in signupStep3Password:', error);
    return res.status(500).json({
      message: 'Internal server error during password setup step.',
      error: error.message
    });
  }
};

// Step 4: Complete Profile (Name, Username, Email, Role) & Join Classroom (Public)
export const signupStep4Profile = async (req, res) => {
  try {
    const { phone, role, name, username, email, classroomId, batch } = req.body;

    if (!phone || !role || !name || !username || !email || !classroomId) {
      return res.status(400).json({ message: 'All profile fields are required.' });
    }

    if (role !== 'teacher' && role !== 'student') {
      return res.status(400).json({ message: 'Role must be either teacher or student.' });
    }

    const user = await User.findOne({
      where: {
        phone,
        status: 'unverified_profile'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or profile is already configured.' });
    }

    // Check username uniqueness
    const existingUsername = await User.findOne({
      where: {
        username,
        id: { [Op.ne]: user.id }
      }
    });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // Check email uniqueness
    const existingEmail = await User.findOne({
      where: {
        email,
        id: { [Op.ne]: user.id }
      }
    });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email address is already registered.' });
    }

    // Find classroom to get organization_id & PK id
    const classroom = await Classroom.findOne({
      where: { classroom_id: parseInt(classroomId) }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Update user status, profile details, role, and batch
    await user.update({
      name,
      username,
      email,
      role,
      status: 'active',
      batch: batch || null
    });

    // If role is teacher or student, link to classroom
    if (role === 'teacher' || role === 'student') {
      const existingRelation = await ClassroomTeacher.findOne({
        where: {
          classroom_id: classroom.id,
          user_id: user.id
        }
      });

      if (!existingRelation) {
        await ClassroomTeacher.create({
          classroom_id: classroom.id,
          user_id: user.id,
          status: role === 'student' ? 'approved' : 'pending',
          role: role
        });
      }
    }

    // Generate JWT token for immediate login
    const token = jwt.sign(
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

    return res.status(201).json({
      message: 'Onboarding completed successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        batch: user.batch
      },
      classroom: {
        id: classroom.id,
        name: classroom.name,
        subject: classroom.subject
      }
    });

  } catch (error) {
    console.error('Error in signupStep4Profile:', error);
    return res.status(500).json({
      message: 'Internal server error during profile completion step.',
      error: error.message
    });
  }
};

// Check classroom join status for teacher (Protected)
export const getClassroomJoinStatus = async (req, res) => {
  try {
    const { numericId } = req.params;

    if (!numericId) {
      return res.status(400).json({ message: 'Classroom numeric ID is required.' });
    }

    const classroom = await Classroom.findOne({
      where: { classroom_id: parseInt(numericId) }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Check if an enrollment relation exists
    const relation = await ClassroomTeacher.findOne({
      where: {
        classroom_id: classroom.id,
        user_id: req.user.id
      }
    });

    return res.json({
      status: relation ? relation.status : 'not_joined',
      classroom: {
        id: classroom.id,
        classroom_id: classroom.classroom_id,
        name: classroom.name,
        subject: classroom.subject
      }
    });

  } catch (error) {
    console.error('Error in getClassroomJoinStatus:', error);
    return res.status(500).json({
      message: 'Internal server error while checking join status.',
      error: error.message
    });
  }
};
