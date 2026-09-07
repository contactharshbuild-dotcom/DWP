import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { 
  sequelize, 
  Classroom, 
  User, 
  ClassroomTeacher, 
  SessionAttendance, 
  McqAttempt, 
  PracticalSubmission 
} from '../models/index.js';

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

// Update / Rename a classroom (Admin or assigned Teacher)
export const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject } = req.body;
    const organization_id = req.user?.organizationId;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Classroom name is required.' });
    }

    const classroom = await Classroom.findOne({
      where: {
        id,
        organization_id
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Authorization: Admin can rename any classroom; Teacher can rename if approved in this classroom
    if (req.user?.role !== 'admin') {
      const isTeacher = await ClassroomTeacher.findOne({
        where: {
          classroom_id: classroom.id,
          user_id: req.user.id,
          role: 'teacher',
          status: 'approved'
        }
      });

      if (!isTeacher) {
        return res.status(403).json({ message: 'Access denied. Only admins or assigned teachers can rename this classroom.' });
      }
    }

    classroom.name = name.trim();
    if (subject !== undefined && subject.trim()) {
      classroom.subject = subject.trim();
    }

    await classroom.save();

    return res.json({
      success: true,
      message: 'Classroom renamed successfully.',
      classroom
    });
  } catch (error) {
    console.error('Error in updateClassroom:', error);
    return res.status(500).json({
      message: 'Internal server error while updating classroom.',
      error: error.message
    });
  }
};

// Delete a classroom (Admin only)
export const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const organization_id = req.user?.organizationId;

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can delete classrooms.' });
    }

    const classroom = await Classroom.findOne({
      where: {
        id,
        organization_id
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Clean up ClassroomTeacher junction table records first
    await ClassroomTeacher.destroy({ where: { classroom_id: classroom.id } });

    // Destroy the classroom record
    await classroom.destroy();

    return res.json({
      success: true,
      message: 'Classroom deleted successfully.'
    });
  } catch (error) {
    console.error('Error in deleteClassroom:', error);
    return res.status(500).json({
      message: 'Internal server error while deleting classroom.',
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
        attributes: ['id', 'name', 'email', 'status', 'role', 'batch'],
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
        attributes: ['id', 'name', 'email', 'status', 'batch', 'role'],
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
      status: 'pending',
      role: req.user.role === 'teacher' ? 'co-teacher' : req.user.role
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

    // Also activate User account status
    await User.update({ status: 'active' }, { where: { id: teacherId } });

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

    // Check if teacher has any remaining approved classrooms
    const remainingApproved = await ClassroomTeacher.findOne({
      where: {
        user_id: teacherId,
        status: 'approved'
      }
    });

    if (!remainingApproved) {
      await User.update({ status: 'pending' }, { where: { id: teacherId } });
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

// Update or toggle teacher role (teacher <-> co-teacher) (Admin only)
export const upgradeTeacherRole = async (req, res) => {
  try {
    const { id, teacherId } = req.params; // classroom PK, teacher user ID
    const { role: requestedRole } = req.body || {};

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
      return res.status(400).json({ message: 'Teacher must be approved first before modifying role.' });
    }

    // Determine new role: explicit or toggle
    let newRole = requestedRole;
    if (!newRole) {
      newRole = relation.role === 'teacher' ? 'co-teacher' : 'teacher';
    }

    if (!['teacher', 'co-teacher'].includes(newRole)) {
      return res.status(400).json({ message: 'Role must be either teacher or co-teacher.' });
    }

    // Update role
    await relation.update({ role: newRole });

    const message = newRole === 'teacher'
      ? 'Role changed to Teacher successfully.'
      : 'Role changed to Co-Teacher successfully.';

    return res.json({ 
      message,
      role: newRole
    });
  } catch (error) {
    console.error('Error in upgradeTeacherRole:', error);
    return res.status(500).json({
      message: 'Internal server error while updating teacher role.',
      error: error.message
    });
  }
};

// Assign existing organization teacher(s) to classroom (Admin only)
export const assignTeacherToClassroom = async (req, res) => {
  try {
    const { id } = req.params; // classroom PK
    let { teacherId, teacherIds, role } = req.body; // target teacher user ID(s) & assigned role (default: co-teacher)

    // Normalize teacherIds array
    let idsToAssign = [];
    if (Array.isArray(teacherIds) && teacherIds.length > 0) {
      idsToAssign = teacherIds.map(tId => parseInt(tId)).filter(Boolean);
    } else if (teacherId) {
      idsToAssign = [parseInt(teacherId)];
    }

    if (idsToAssign.length === 0) {
      return res.status(400).json({ message: 'At least one Teacher ID is required.' });
    }

    // 1. Verify classroom belongs to admin's organization
    const classroom = await Classroom.findOne({
      where: {
        id,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // 2. Verify target users exist in admin's organization and are teachers
    const teacherUsers = await User.findAll({
      where: {
        id: idsToAssign,
        organization_id: req.user.organizationId,
        role: 'teacher'
      }
    });

    if (teacherUsers.length === 0) {
      return res.status(404).json({ message: 'No valid teachers found in your organization.' });
    }

    // 3. Process each teacher assignment
    for (const teacherUser of teacherUsers) {
      const [relation, created] = await ClassroomTeacher.findOrCreate({
        where: {
          classroom_id: id,
          user_id: teacherUser.id
        },
        defaults: {
          classroom_id: id,
          user_id: teacherUser.id,
          status: 'approved',
          role: role || 'co-teacher'
        }
      });

      if (!created) {
        await relation.update({
          status: 'approved',
          role: role || relation.role || 'co-teacher'
        });
      }

      if (teacherUser.status !== 'active') {
        await teacherUser.update({ status: 'active' });
      }
    }

    return res.json({
      message: `${teacherUsers.length} teacher(s) assigned to classroom successfully as ${role || 'co-teacher'}.`
    });

  } catch (error) {
    console.error('Error in assignTeacherToClassroom:', error);
    return res.status(500).json({
      message: 'Internal server error while assigning teachers to classroom.',
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

    // Move to next onboarding state: profile configuration
    await user.update({
      status: 'unverified_profile',
      otp_code: null,
      otp_expires: null
    });

    return res.json({
      message: 'OTP verified successfully! Please configure your profile details.'
    });

  } catch (error) {
    console.error('Error in signupStep2VerifyOtp:', error);
    return res.status(500).json({
      message: 'Internal server error during OTP verification step.',
      error: error.message
    });
  }
};

// Step 3: Complete Profile (Name, Username, Email, Role, Batch) (Public)
export const signupStep3Profile = async (req, res) => {
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
        status: { [Op.in]: ['unverified', 'unverified_profile', 'unverified_password'] }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or invalid onboarding state.' });
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

    // Update user profile details, role, and batch, and transition to unverified_password
    await user.update({
      name,
      username,
      email,
      role,
      status: 'unverified_password',
      batch: batch || null
    });

    return res.json({
      message: 'Profile details saved successfully! Please set up your password.'
    });

  } catch (error) {
    console.error('Error in signupStep3Profile:', error);
    return res.status(500).json({
      message: 'Internal server error during profile configuration step.',
      error: error.message
    });
  }
};

// Step 5: Setup Password & Complete Signup (Public)
export const signupStep5Password = async (req, res) => {
  try {
    const { phone, password, classroomId, role, batch } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone number and Password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const user = await User.findOne({
      where: {
        phone,
        status: { [Op.in]: ['unverified_password', 'unverified_profile', 'unverified'] }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or invalid onboarding state.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const updateData = {
      password: hashedPassword,
      status: 'active'
    };
    if (role && (role === 'teacher' || role === 'student')) {
      updateData.role = role;
    }
    if (batch !== undefined) {
      updateData.batch = batch;
    }

    // Update user
    await user.update(updateData);

    // Find classroom to get organization_id & PK id
    let classroom = null;
    if (classroomId) {
      classroom = await Classroom.findOne({
        where: { classroom_id: parseInt(classroomId) }
      });
    }

    if (!classroom && user.organization_id) {
      classroom = await Classroom.findOne({
        where: { organization_id: user.organization_id }
      });
    }

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    const userRole = updateData.role || user.role;

    // If role is teacher or student, link to classroom
    if (userRole === 'teacher' || userRole === 'student') {
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
          status: 'pending',
          role: userRole === 'teacher' ? 'co-teacher' : userRole
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
    console.error('Error in signupStep5Password:', error);
    return res.status(500).json({
      message: 'Internal server error during password setup step.',
      error: error.message
    });
  }
};

// Backward-compatible exports
export const signupStep3Password = signupStep5Password;
export const signupStep4Profile = signupStep3Profile;

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

// Invite Student to Classroom
export const inviteStudent = async (req, res) => {
  try {
    const { id } = req.params; // classroom primary key ID
    const { name, email, batch } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    // Verify classroom exists
    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Check if user is teacher, verify they are in this classroom
    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: { classroom_id: id, user_id: req.user.id, status: 'approved' }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied. You are not authorized for this classroom.' });
      }
    }

    // Check if user with this email already exists
    let user = await User.findOne({ where: { email } });
    let inviteToken = null;
    let inviteLink = '';

    if (user) {
      // If user exists, they must be a student to join
      if (user.role !== 'student') {
        return res.status(400).json({ message: 'This email is already registered as a non-student account.' });
      }

      // Check if they are already in the classroom
      const existingRelation = await ClassroomTeacher.findOne({
        where: { classroom_id: id, user_id: user.id }
      });

      if (existingRelation) {
        return res.status(400).json({ message: 'Student is already enrolled in this classroom.' });
      }

      // Link to classroom directly (auto-approved since invited)
      await ClassroomTeacher.create({
        classroom_id: id,
        user_id: user.id,
        status: 'approved',
        role: 'student'
      });

      // Update their batch if specified
      if (batch) {
        await user.update({ batch });
      }
    } else {
      // User doesn't exist. Generate invite token and expiry (7 days)
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create a dummy password since it's required
      const randomDummyPass = crypto.randomBytes(16).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedDummyPassword = await bcrypt.hash(randomDummyPass, salt);

      // Create pending student user
      user = await User.create({
        organization_id: classroom.organization_id,
        name,
        email,
        password: hashedDummyPassword,
        role: 'student',
        status: 'pending',
        batch: batch || null,
        invite_token: token,
        invite_expires: expiry
      });

      // Create ClassroomTeacher approved mapping
      await ClassroomTeacher.create({
        classroom_id: id,
        user_id: user.id,
        status: 'approved',
        role: 'student'
      });

      const origin = req.get('origin') || (req.get('referer') ? new URL(req.get('referer')).origin : '');
      const frontendUrl = (process.env.FRONTEND_URL || origin || 'http://localhost:5173').replace(/\/+$/, '');
      inviteToken = token;
      inviteLink = `${frontendUrl}/accept-invite?token=${token}`;
    }

    return res.status(201).json({
      message: 'Student invited successfully.',
      student: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        batch: user.batch,
        invite_token: inviteToken
      },
      inviteLink
    });

  } catch (error) {
    console.error('Error in inviteStudent:', error);
    return res.status(500).json({
      message: 'Internal server error while inviting student.',
      error: error.message
    });
  }
};

// Remove Student from Classroom and delete User account
export const removeStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    // Verify classroom exists
    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Verify user authorization: admin, or approved teacher of this classroom
    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: { classroom_id: id, user_id: req.user.id, status: 'approved' }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied. You are not authorized for this classroom.' });
      }
    }

    // Verify student user exists
    const studentUser = await User.findByPk(studentId);
    if (!studentUser) {
      return res.status(404).json({ message: 'Student user not found.' });
    }

    if (studentUser.role !== 'student') {
      return res.status(400).json({ message: 'Target user is not a student.' });
    }

    // Check student enrollment in this classroom
    const membership = await ClassroomTeacher.findOne({
      where: {
        classroom_id: id,
        user_id: studentId,
        role: 'student'
      }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Student not found in this classroom.' });
    }

    const t = await sequelize.transaction();
    try {
      // Remove associations from classroom_teachers
      await ClassroomTeacher.destroy({
        where: { user_id: studentId },
        transaction: t
      });

      // Remove dependent student activity records
      await SessionAttendance.destroy({
        where: { student_id: studentId },
        transaction: t
      });

      await McqAttempt.destroy({
        where: { user_id: studentId },
        transaction: t
      });

      await PracticalSubmission.destroy({
        where: { user_id: studentId },
        transaction: t
      });

      // Permanently delete user record
      await studentUser.destroy({ transaction: t });

      await t.commit();
      return res.json({ message: 'Student and user account removed successfully.' });
    } catch (dbError) {
      await t.rollback();
      throw dbError;
    }
  } catch (error) {
    console.error('Error in removeStudent:', error);
    return res.status(500).json({
      message: 'Internal server error while removing student.',
      error: error.message
    });
  }
};

// Suspend or Activate Student
export const updateStudentStatus = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { status } = req.body;

    // Verify classroom exists
    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Verify user authorization: admin, or approved teacher of this classroom
    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: { classroom_id: id, user_id: req.user.id, status: 'approved' }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied. You are not authorized for this classroom.' });
      }
    }

    // Find student user
    const studentUser = await User.findByPk(studentId);
    if (!studentUser) {
      return res.status(404).json({ message: 'Student user not found.' });
    }

    if (studentUser.role !== 'student') {
      return res.status(400).json({ message: 'Target user is not a student.' });
    }

    // Verify membership in classroom
    const membership = await ClassroomTeacher.findOne({
      where: {
        classroom_id: id,
        user_id: studentId,
        role: 'student'
      }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Student not found in this classroom.' });
    }

    // Determine target status: toggle if not explicitly provided
    let newStatus = status;
    if (!newStatus) {
      newStatus = studentUser.status === 'suspended' ? 'active' : 'suspended';
    }

    if (!['active', 'suspended'].includes(newStatus)) {
      return res.status(400).json({ message: 'Invalid status. Status must be active or suspended.' });
    }

    await studentUser.update({ status: newStatus });

    const message = newStatus === 'suspended'
      ? 'Student suspended successfully. They will not be able to log in.'
      : 'Student reactivated successfully.';

    return res.json({
      message,
      status: newStatus,
      student: {
        id: studentUser.id,
        name: studentUser.name,
        email: studentUser.email,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Error in updateStudentStatus:', error);
    return res.status(500).json({
      message: 'Internal server error while updating student status.',
      error: error.message
    });
  }
};

export const approveStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    // Verify classroom
    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Verify user authorization: admin, or approved teacher of this classroom
    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: { classroom_id: id, user_id: req.user.id, status: 'approved' }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied. You are not authorized for this classroom.' });
      }
    }

    const relation = await ClassroomTeacher.findOne({
      where: { classroom_id: id, user_id: studentId, role: 'student' }
    });

    if (!relation) {
      return res.status(404).json({ message: 'Student join request not found.' });
    }

    await relation.update({ status: 'approved' });

    return res.json({ message: 'Student join request approved successfully.' });
  } catch (error) {
    console.error('Error in approveStudent:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const rejectStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    // Verify classroom
    const classroom = await Classroom.findByPk(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    // Verify authorization
    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: { classroom_id: id, user_id: req.user.id, status: 'approved' }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied. You are not authorized for this classroom.' });
      }
    }

    const deletedCount = await ClassroomTeacher.destroy({
      where: {
        classroom_id: id,
        user_id: studentId,
        role: 'student'
      }
    });

    if (deletedCount === 0) {
      return res.status(404).json({ message: 'Student request not found.' });
    }

    return res.json({ message: 'Student request rejected successfully.' });
  } catch (error) {
    console.error('Error in rejectStudent:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
