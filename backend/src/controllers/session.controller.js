import { Classroom, ClassroomTeacher, ClassroomModule, ModuleSession, User } from '../models/index.js';

// Helper to check if a user is an organization admin or primary teacher of the classroom
const hasWritePermission = async (userId, userRole, classroomId) => {
  if (userRole === 'admin') {
    return true;
  }
  
  if (userRole === 'teacher') {
    const relation = await ClassroomTeacher.findOne({
      where: {
        classroom_id: classroomId,
        user_id: userId,
        status: 'approved',
        role: 'teacher' // Strictly primary teacher; 'co-teacher' is excluded
      }
    });
    return !!relation;
  }

  return false;
};

// Date range generation helper for recurring sessions
const getDatesInRange = (start, end, scheduleType, weekDays = []) => {
  const dates = [];
  const curr = new Date(start);
  const last = new Date(end);

  curr.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);

  // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const dayMap = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const allowedDays = weekDays.map(d => dayMap[d]).filter(d => d !== undefined);

  while (curr <= last) {
    if (scheduleType === 'daily') {
      dates.push(new Date(curr));
    } else if (scheduleType === 'weekly') {
      if (allowedDays.includes(curr.getDay())) {
        dates.push(new Date(curr));
      }
    } else if (scheduleType === 'single') {
      dates.push(new Date(curr));
      break;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

// 1. Create Module (Teacher/Admin)
export const createModule = async (req, res) => {
  try {
    const { classroomId, name, description } = req.body;
    if (!classroomId || !name) {
      return res.status(400).json({ message: 'Classroom ID and Module Name are required.' });
    }

    const canWrite = await hasWritePermission(req.user.id, req.user.role, classroomId);
    if (!canWrite) {
      return res.status(403).json({ message: 'Access denied. Only primary teacher or admin can create modules.' });
    }

    const classroomModule = await ClassroomModule.create({
      classroom_id: classroomId,
      name,
      description
    });

    return res.status(201).json({
      success: true,
      message: 'Module created successfully.',
      module: classroomModule
    });
  } catch (error) {
    console.error('Error in createModule:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 2. Get Modules and Sessions (Admins, Teachers, Co-teachers see all; Students see assigned only)
export const getModules = async (req, res) => {
  try {
    const { classroomId } = req.params;
    if (!classroomId) {
      return res.status(400).json({ message: 'Classroom ID is required.' });
    }

    const modules = await ClassroomModule.findAll({
      where: { classroom_id: classroomId },
      include: [{
        model: ModuleSession,
        as: 'sessions'
      }],
      order: [
        ['created_at', 'ASC'],
        [{ model: ModuleSession, as: 'sessions' }, 'date', 'ASC'],
        [{ model: ModuleSession, as: 'sessions' }, 'start_time', 'ASC']
      ]
    });

    const isStudent = req.user.role === 'student';
    let formattedModules = [];

    if (isStudent) {
      const student = await User.findByPk(req.user.id);
      const studentBatch = student ? student.batch : null;

      formattedModules = modules.map(mod => {
        const rawMod = mod.toJSON();
        const filteredSessions = (rawMod.sessions || []).filter(session => {
          const assignedIds = session.assigned_student_ids || [];
          const assignedBatches = session.batches || [];

          // If explicitly assigned to specific students
          if (assignedIds.length > 0) {
            return assignedIds.includes(req.user.id);
          }

          // If explicitly assigned to specific batches
          if (assignedBatches.length > 0) {
            return assignedBatches.includes(studentBatch);
          }

          // Otherwise, general session (visible to all students)
          return true;
        });

        return {
          ...rawMod,
          sessions: filteredSessions
        };
      });
    } else {
      formattedModules = modules.map(mod => mod.toJSON());
    }

    return res.json({
      success: true,
      modules: formattedModules
    });
  } catch (error) {
    console.error('Error in getModules:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 3. Delete Module (Teacher/Admin)
export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const mod = await ClassroomModule.findByPk(id);
    if (!mod) {
      return res.status(404).json({ message: 'Module not found.' });
    }

    const canWrite = await hasWritePermission(req.user.id, req.user.role, mod.classroom_id);
    if (!canWrite) {
      return res.status(403).json({ message: 'Access denied. Only primary teacher or admin can delete modules.' });
    }

    await mod.destroy();
    return res.json({ success: true, message: 'Module and all sessions deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteModule:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 4. Create Sessions (Teacher/Admin) - supports recurrence patterns
export const createSessions = async (req, res) => {
  try {
    const {
      moduleId, name, partExtension, startDate, endDate, scheduleType,
      weekDays, mode, venue, meetLink, notes, startTime, endTime,
      batches, assignedStudentIds, assignedTeacherIds
    } = req.body;

    if (!moduleId || !startDate || !startTime || !endTime || !scheduleType) {
      return res.status(400).json({ message: 'Missing required configuration for session creation.' });
    }

    const mod = await ClassroomModule.findByPk(moduleId);
    if (!mod) {
      return res.status(404).json({ message: 'Module not found.' });
    }

    const canWrite = await hasWritePermission(req.user.id, req.user.role, mod.classroom_id);
    if (!canWrite) {
      return res.status(403).json({ message: 'Access denied. Only primary teacher or admin can create sessions.' });
    }

    // Determine target dates based on recurrence pattern
    const end = scheduleType === 'single' ? startDate : endDate;
    const dates = getDatesInRange(startDate, end, scheduleType, weekDays || []);

    if (dates.length === 0) {
      return res.status(400).json({ message: 'No valid dates generated for the chosen schedule range.' });
    }

    // Auto-calculate session number sequence
    const maxSession = await ModuleSession.max('session_number', { where: { module_id: moduleId } }) || 0;
    let nextSessionNum = maxSession + 1;

    const sessionsData = dates.map(date => ({
      module_id: moduleId,
      session_number: nextSessionNum++,
      name: name || null,
      part_extension: partExtension || null,
      date: date.toISOString().split('T')[0],
      start_time: startTime,
      end_time: endTime,
      mode,
      venue: mode === 'offline' ? venue : null,
      meet_link: mode === 'online' ? meetLink : null,
      notes: notes || null,
      status: 'Scheduled',
      batches: batches || null,
      assigned_student_ids: assignedStudentIds || null,
      assigned_teacher_ids: assignedTeacherIds || null
    }));

    const createdSessions = await ModuleSession.bulkCreate(sessionsData);

    return res.status(201).json({
      success: true,
      message: `${createdSessions.length} session(s) created successfully.`,
      sessions: createdSessions
    });
  } catch (error) {
    console.error('Error in createSessions:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 5. Update Session Status (Teacher/Admin)
export const updateSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Scheduled', 'Live', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid session status.' });
    }

    const session = await ModuleSession.findByPk(id, {
      include: [{ model: ClassroomModule, as: 'module' }]
    });

    if (!session || !session.module) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const canWrite = await hasWritePermission(req.user.id, req.user.role, session.module.classroom_id);
    if (!canWrite) {
      return res.status(403).json({ message: 'Access denied. Only primary teacher or admin can modify sessions.' });
    }

    await session.update({ status });

    return res.json({
      success: true,
      message: `Session status updated to ${status} successfully.`,
      session
    });
  } catch (error) {
    console.error('Error in updateSessionStatus:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 6. Delete Session (Teacher/Admin)
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await ModuleSession.findByPk(id, {
      include: [{ model: ClassroomModule, as: 'module' }]
    });

    if (!session || !session.module) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const canWrite = await hasWritePermission(req.user.id, req.user.role, session.module.classroom_id);
    if (!canWrite) {
      return res.status(403).json({ message: 'Access denied. Only primary teacher or admin can delete sessions.' });
    }

    await session.destroy();

    return res.json({
      success: true,
      message: 'Session deleted successfully.'
    });
  } catch (error) {
    console.error('Error in deleteSession:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 7. Update Session Details (Teacher/Admin)
export const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, partExtension, date, startTime, endTime, mode, venue,
      meetLink, notes, batches, assignedStudentIds, assignedTeacherIds
    } = req.body;

    const session = await ModuleSession.findByPk(id, {
      include: [{ model: ClassroomModule, as: 'module' }]
    });

    if (!session || !session.module) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const canWrite = await hasWritePermission(req.user.id, req.user.role, session.module.classroom_id);
    if (!canWrite) {
      return res.status(403).json({ message: 'Access denied. Only primary teacher or admin can edit sessions.' });
    }

    await session.update({
      name: name || null,
      part_extension: partExtension || null,
      date: date || session.date,
      start_time: startTime || session.start_time,
      end_time: endTime || session.end_time,
      mode: mode || session.mode,
      venue: mode === 'offline' ? venue : null,
      meet_link: mode === 'online' ? meetLink : null,
      notes: notes || null,
      batches: batches || null,
      assigned_student_ids: assignedStudentIds || null,
      assigned_teacher_ids: assignedTeacherIds || null
    });

    return res.json({
      success: true,
      message: 'Session updated successfully.',
      session
    });
  } catch (error) {
    console.error('Error in updateSession:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 8. Bulk Assign Students/Teachers across multiple sessions (Teacher/Admin)
export const bulkAssign = async (req, res) => {
  try {
    const { sessionIds, studentIds, teacherIds, assignmentMode } = req.body;

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ message: 'No sessions selected.' });
    }

    if (!['add', 'remove', 'replace'].includes(assignmentMode)) {
      return res.status(400).json({ message: 'Invalid assignment mode. Must be add, remove, or replace.' });
    }

    // Load all selected sessions to verify permissions
    const sessions = await ModuleSession.findAll({
      where: { id: sessionIds },
      include: [{ model: ClassroomModule, as: 'module' }]
    });

    if (sessions.length === 0) {
      return res.status(404).json({ message: 'No matching sessions found.' });
    }

    // Verify user has write permissions for all associated classrooms
    const classroomIds = [...new Set(sessions.map(s => s.module.classroom_id))];
    for (const classroomId of classroomIds) {
      const canWrite = await hasWritePermission(req.user.id, req.user.role, classroomId);
      if (!canWrite) {
        return res.status(403).json({ message: 'Access denied. You do not have permissions to manage some of the selected sessions.' });
      }
    }

    // Perform bulk updates
    for (const session of sessions) {
      let currentStudents = session.assigned_student_ids || [];
      let currentTeachers = session.assigned_teacher_ids || [];

      let nextStudents = [...currentStudents];
      let nextTeachers = [...currentTeachers];

      if (studentIds && Array.isArray(studentIds)) {
        if (assignmentMode === 'replace') {
          nextStudents = studentIds;
        } else if (assignmentMode === 'add') {
          nextStudents = [...new Set([...currentStudents, ...studentIds])];
        } else if (assignmentMode === 'remove') {
          nextStudents = currentStudents.filter(id => !studentIds.includes(id));
        }
      }

      if (teacherIds && Array.isArray(teacherIds)) {
        if (assignmentMode === 'replace') {
          nextTeachers = teacherIds;
        } else if (assignmentMode === 'add') {
          nextTeachers = [...new Set([...currentTeachers, ...teacherIds])];
        } else if (assignmentMode === 'remove') {
          nextTeachers = currentTeachers.filter(id => !teacherIds.includes(id));
        }
      }

      await session.update({
        assigned_student_ids: nextStudents.length > 0 ? nextStudents : null,
        assigned_teacher_ids: nextTeachers.length > 0 ? nextTeachers : null
      });
    }

    return res.json({
      success: true,
      message: `Bulk assignment successfully completed for ${sessions.length} session(s).`
    });
  } catch (error) {
    console.error('Error in bulkAssign:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
