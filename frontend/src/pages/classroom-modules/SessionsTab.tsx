import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiPlus, 
  FiTrash2, 
  FiAlertCircle, 
  FiCalendar, 
  FiClock, 
  FiMapPin, 
  FiVideo, 
  FiFileText, 
  FiXCircle, 
  FiUser,
  FiBookOpen,
  FiEdit,
  FiChevronLeft,
  FiChevronRight,
  FiList,
  FiDownload,
  FiFilter,
  FiInfo,
  FiExternalLink,
  FiShare2,
  FiCheckCircle,
  FiChevronDown
} from 'react-icons/fi';
import api from '../../services/api';

interface StudentUser {
  id: number;
  name: string;
  email: string;
  batch?: string | null;
}

interface Teacher {
  id: number;
  name: string;
  email: string;
  ClassroomTeacher: {
    status: string;
    role: string;
  };
}

interface Session {
  id: number;
  module_id: number;
  session_number: number;
  name?: string | null;
  part_extension?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  mode: 'online' | 'offline';
  venue?: string | null;
  meet_link?: string | null;
  notes?: string | null;
  status: 'Scheduled' | 'Live' | 'Completed' | 'Cancelled';
  batches?: string[] | null;
  assigned_student_ids?: number[] | null;
  assigned_teacher_ids?: number[] | null;
}

interface ClassroomModule {
  id: number;
  classroom_id: number;
  name: string;
  description?: string | null;
  sessions?: Session[];
  totalSessionsCount?: number;
  hasMoreSessions?: boolean;
}

interface SessionsTabProps {
  classroomId: number | undefined;
  user: { id: number; role: string; name: string; email: string } | null;
  teachers: Teacher[] | undefined;
  activeStudents: StudentUser[];
}

// Google Calendar single event URL generator
const generateGoogleCalendarUrl = (session: Session, moduleName?: string) => {
  let title = `[Classroom] ${moduleName ? moduleName + ': ' : ''}Session ${session.session_number}`;
  if (session.name) title += ` - ${session.name}`;
  if (session.part_extension) title += ` (${session.part_extension})`;

  try {
    const dateParts = session.date.split('-');
    if (dateParts.length !== 3) return '#';
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    const [startH, startM] = (session.start_time || '10:00').split(':').map(n => parseInt(n, 10));
    const [endH, endM] = (session.end_time || '11:30').split(':').map(n => parseInt(n, 10));

    const startDate = new Date(year, month, day, startH, startM, 0);
    const endDate = new Date(year, month, day, endH, endM, 0);

    const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');

    const datesParam = `${formatUtc(startDate)}/${formatUtc(endDate)}`;

    let details = `Classroom Lecture Session\n`;
    if (moduleName) details += `Module: ${moduleName}\n`;
    details += `Session: ${session.name || `Session #${session.session_number}`}\n`;
    details += `Status: ${session.status}\n`;
    if (session.mode === 'online' && session.meet_link) {
      details += `Google Meet / Video Link: ${session.meet_link}\n`;
    } else if (session.mode === 'offline' && session.venue) {
      details += `Venue: ${session.venue}\n`;
    }
    if (session.notes) {
      details += `\nAgenda & Notes:\n${session.notes}`;
    }

    const location = session.mode === 'online' 
      ? (session.meet_link || 'Online Video Meeting') 
      : (session.venue || 'Classroom Venue');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: datesParam,
      details: details,
      location: location
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch (err) {
    console.error('Error generating Google Calendar URL:', err);
    return '#';
  }
};

// iCal single event downloader
const downloadIcsFile = (session: Session, moduleName?: string) => {
  let title = `[Classroom] ${moduleName ? moduleName + ': ' : ''}Session ${session.session_number}`;
  if (session.name) title += ` - ${session.name}`;
  if (session.part_extension) title += ` (${session.part_extension})`;

  try {
    const dateParts = session.date.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    const [startH, startM] = (session.start_time || '10:00').split(':').map(n => parseInt(n, 10));
    const [endH, endM] = (session.end_time || '11:30').split(':').map(n => parseInt(n, 10));

    const startDate = new Date(year, month, day, startH, startM, 0);
    const endDate = new Date(year, month, day, endH, endM, 0);

    const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');

    const startUtc = formatUtc(startDate);
    const endUtc = formatUtc(endDate);
    const location = session.mode === 'online' ? (session.meet_link || 'Online Video Meeting') : (session.venue || 'Classroom Venue');
    
    let description = `Classroom Lecture Session\\nModule: ${moduleName || 'Classroom Module'}\\nStatus: ${session.status}`;
    if (session.notes) {
      description += `\\nNotes: ${session.notes.replace(/\n/g, '\\n')}`;
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DWP Classroom//Sessions Calendar//EN',
      'BEGIN:VEVENT',
      `UID:session-${session.id}-${Date.now()}@dwp.classroom`,
      `DTSTAMP:${startUtc}`,
      `DTSTART:${startUtc}`,
      `DTEND:${endUtc}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Session_${session.session_number}_${session.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Error creating ICS file:', e);
  }
};

// Bulk iCal file downloader for ALL sessions at once
const downloadBulkSessionsIcsFile = (sessions: Array<Session & { moduleName?: string }>, fileNamePrefix: string = 'Classroom_All_Sessions') => {
  if (!sessions || sessions.length === 0) {
    alert('No sessions available to export.');
    return;
  }

  const parseDateTimeToUTC = (dateStr: string, timeStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = (timeStr || '10:00').split(':').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0);
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const vevents = sessions.map((session, idx) => {
    let title = `[Classroom] ${session.moduleName ? session.moduleName + ': ' : ''}Session ${session.session_number}`;
    if (session.name) title += ` - ${session.name}`;
    if (session.part_extension) title += ` (${session.part_extension})`;

    const startUtc = parseDateTimeToUTC(session.date, session.start_time);
    const endUtc = parseDateTimeToUTC(session.date, session.end_time);
    const location = session.mode === 'online' ? (session.meet_link || 'Online Video Meeting') : (session.venue || 'Classroom Venue');

    let description = `Classroom Lecture Session\\nModule: ${session.moduleName || 'Classroom Module'}\\nStatus: ${session.status}`;
    if (session.notes) {
      description += `\\nNotes: ${session.notes.replace(/\n/g, '\\n')}`;
    }

    return [
      'BEGIN:VEVENT',
      `UID:session-${session.id}-${idx}-${Date.now()}@dwp.classroom`,
      `DTSTAMP:${startUtc}`,
      `DTSTART:${startUtc}`,
      `DTEND:${endUtc}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].join('\r\n');
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DWP Classroom//All Sessions Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${fileNamePrefix.replace(/_/g, ' ')}`,
    ...vevents,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${fileNamePrefix}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const SessionsTab: React.FC<SessionsTabProps> = ({
  classroomId,
  user,
  teachers = [],
  activeStudents = []
}) => {
  const [modules, setModules] = useState<ClassroomModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state: 'timeline' | 'calendar'
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');

  // Calendar View State
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');

  // Viewing Session Details modal
  const [viewingSession, setViewingSession] = useState<(Session & { moduleName?: string }) | null>(null);

  // Modal state for Export All Sessions to Google Calendar
  const [showExportAllModal, setShowExportAllModal] = useState(false);
  const [exportSelectedModule, setExportSelectedModule] = useState<string>('all');

  // Permission checks
  const isOrgAdmin = user?.role === 'admin';
  const primaryTeacher = teachers.find(t => t.id === user?.id && t.ClassroomTeacher?.role === 'teacher');
  const canWrite = isOrgAdmin || !!primaryTeacher;

  // Active classroom teachers
  const activeTeachers = teachers.filter(t => 
    (t.ClassroomTeacher?.role === 'teacher' || t.ClassroomTeacher?.role === 'co-teacher') && 
    t.ClassroomTeacher?.status === 'approved'
  );

  // Student profile match
  const currentStudent = activeStudents.find(s => s.id === user?.id);
  const studentBatch = currentStudent?.batch;

  // UI state for Module creation
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [moduleLoading, setModuleLoading] = useState(false);

  // Add/Edit Session modal state
  const [activeModuleForSession, setActiveModuleForSession] = useState<number | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  // Form states
  const [sessionName, setSessionName] = useState('');
  const [partExtension, setPartExtension] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleType, setScheduleType] = useState<'single' | 'daily' | 'weekly'>('single');
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [mode, setMode] = useState<'online' | 'offline'>('offline');
  const [venue, setVenue] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  
  // Session assignments
  const [assignType, setAssignType] = useState<'all' | 'batches' | 'students'>('all');
  const [assignBatches, setAssignBatches] = useState('');
  const [assignStudentIds, setAssignStudentIds] = useState<number[]>([]);

  // Server-side session pagination / load more state
  const [loadingMoreModuleId, setLoadingMoreModuleId] = useState<number | null>(null);

  const handleLoadMoreSessions = async (moduleId: number) => {
    try {
      setLoadingMoreModuleId(moduleId);
      const targetModule = modules.find(m => m.id === moduleId);
      if (!targetModule) return;

      const currentLoadedCount = (targetModule.sessions || []).length;
      const nextPage = Math.floor(currentLoadedCount / 5) + 1;

      const response = await api.get(`/sessions/modules/${moduleId}/sessions?page=${nextPage}&limit=5`);
      if (response.data?.success) {
        const newSessions: Session[] = response.data.sessions || [];
        
        setModules(prevModules => prevModules.map(mod => {
          if (mod.id !== moduleId) return mod;
          
          const existingIds = new Set((mod.sessions || []).map(s => s.id));
          const uniqueNewSessions = newSessions.filter(s => !existingIds.has(s.id));
          const updatedSessions = [...(mod.sessions || []), ...uniqueNewSessions];
          
          return {
            ...mod,
            sessions: updatedSessions,
            totalSessionsCount: response.data.totalSessionsCount || updatedSessions.length,
            hasMoreSessions: response.data.hasMore
          };
        }));
      }
    } catch (err) {
      console.error('Error fetching next page of module sessions:', err);
    } finally {
      setLoadingMoreModuleId(null);
    }
  };

  // Session Attendance Modal State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);
  const [attendanceList, setAttendanceList] = useState<Array<{
    studentId: number;
    name: string;
    email: string;
    batch?: string | null;
    profile_url?: string | null;
    profileUrl?: string | null;
    status: 'present' | 'absent' | 'late' | 'excused' | 'unmarked';
    remarks: string;
  }>>([]);
  const [attendanceStats, setAttendanceStats] = useState<{
    total: number;
    unmarked: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  }>({ total: 0, unmarked: 0, present: 0, absent: 0, late: 0, excused: 0 });
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');

  const handleOpenAttendance = async (session: Session) => {
    setAttendanceSession(session);
    setShowAttendanceModal(true);
    setLoadingAttendance(true);
    setAttendanceError(null);
    setAttendanceSuccess(null);
    setAttendanceSearchQuery('');

    try {
      const res = await api.get(`/sessions/${session.id}/attendance`);
      setAttendanceList(res.data.attendanceList || []);
      setAttendanceStats(res.data.stats || { total: 0, unmarked: 0, present: 0, absent: 0, late: 0, excused: 0 });
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      setAttendanceError(err.response?.data?.message || 'Failed to load session attendance.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleStatusToggle = (studentId: number, status: 'present' | 'absent' | 'late' | 'excused' | 'unmarked') => {
    setAttendanceList(prev => prev.map(item => item.studentId === studentId ? { ...item, status } : item));
  };

  const handleRemarksChange = (studentId: number, remarks: string) => {
    setAttendanceList(prev => prev.map(item => item.studentId === studentId ? { ...item, remarks } : item));
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    setAttendanceList(prev => prev.map(item => ({ ...item, status })));
  };

  const handleSaveAttendance = async () => {
    if (!attendanceSession) return;
    setSavingAttendance(true);
    setAttendanceError(null);
    setAttendanceSuccess(null);

    try {
      await api.post(`/sessions/${attendanceSession.id}/attendance`, {
        attendanceRecords: attendanceList.map(item => ({
          studentId: item.studentId,
          status: item.status,
          remarks: item.remarks
        }))
      });

      const unmarked = attendanceList.filter(a => a.status === 'unmarked').length;
      const present = attendanceList.filter(a => a.status === 'present').length;
      const absent = attendanceList.filter(a => a.status === 'absent').length;
      const late = attendanceList.filter(a => a.status === 'late').length;
      const excused = attendanceList.filter(a => a.status === 'excused').length;
      setAttendanceStats({ total: attendanceList.length, unmarked, present, absent, late, excused });

      setAttendanceSuccess('Session attendance saved successfully!');
      setTimeout(() => {
        setAttendanceSuccess(null);
      }, 2500);
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setAttendanceError(err.response?.data?.message || 'Failed to save session attendance.');
    } finally {
      setSavingAttendance(false);
    }
  };
  const [assignTeacherIds, setAssignTeacherIds] = useState<number[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Bulk Assignment modal state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkSelectedSessionIds, setBulkSelectedSessionIds] = useState<number[]>([]);
  const [bulkSelectedStudentIds, setBulkSelectedStudentIds] = useState<number[]>([]);
  const [bulkSelectedTeacherIds, setBulkSelectedTeacherIds] = useState<number[]>([]);
  const [bulkAssignmentMode, setBulkAssignmentMode] = useState<'add' | 'remove' | 'replace'>('add');
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchModulesAndSessions = async () => {
    if (!classroomId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/sessions/classrooms/${classroomId}`);
      if (response.data.success) {
        setModules(response.data.modules);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModulesAndSessions();
  }, [classroomId]);

  // Flattened session list for calendar view and bulk calendar exports
  const allSessionsWithModule = useMemo(() => {
    const list: Array<Session & { moduleName: string }> = [];
    modules.forEach(mod => {
      (mod.sessions || []).forEach(sess => {
        list.push({
          ...sess,
          moduleName: mod.name
        });
      });
    });
    return list;
  }, [modules]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    setModuleLoading(true);
    try {
      const response = await api.post('/sessions/modules', {
        classroomId,
        name: newModuleName,
        description: newModuleDesc
      });
      if (response.data.success) {
        setNewModuleName('');
        setNewModuleDesc('');
        setShowAddModule(false);
        await fetchModulesAndSessions();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create module.');
    } finally {
      setModuleLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (!window.confirm('Are you sure you want to delete this module and all its sessions?')) {
      return;
    }
    try {
      await api.delete(`/sessions/modules/${moduleId}`);
      await fetchModulesAndSessions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete module.');
    }
  };

  const handleStartEdit = (sess: Session) => {
    setEditingSession(sess);
    setSessionName(sess.name || '');
    setPartExtension(sess.part_extension || '');
    setStartDate(sess.date || '');
    setStartTime(sess.start_time || '10:00');
    setEndTime(sess.end_time || '11:30');
    setMode(sess.mode || 'offline');
    setVenue(sess.venue || '');
    setMeetLink(sess.meet_link || '');
    setNotes(sess.notes || '');
    setAssignTeacherIds(sess.assigned_teacher_ids || []);
    
    // Assignment mapping
    if (sess.assigned_student_ids && sess.assigned_student_ids.length > 0) {
      setAssignType('students');
      setAssignStudentIds(sess.assigned_student_ids);
      setAssignBatches('');
    } else if (sess.batches && sess.batches.length > 0) {
      setAssignType('batches');
      setAssignBatches(sess.batches.join(', '));
      setAssignStudentIds([]);
    } else {
      setAssignType('all');
      setAssignBatches('');
      setAssignStudentIds([]);
    }
  };

  const handleCloseModal = () => {
    setActiveModuleForSession(null);
    setEditingSession(null);
    setSessionName('');
    setPartExtension('');
    setStartDate('');
    setEndDate('');
    setScheduleType('single');
    setWeekDays([]);
    setMode('offline');
    setVenue('');
    setMeetLink('');
    setNotes('');
    setAssignType('all');
    setAssignBatches('');
    setAssignStudentIds([]);
    setAssignTeacherIds([]);
  };

  const handleCreateOrUpdateSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !startTime || !endTime) {
      alert('Please fill in all mandatory fields.');
      return;
    }

    setSessionLoading(true);
    try {
      const batchesArr = assignType === 'batches' && assignBatches.trim()
        ? assignBatches.split(',').map(b => b.trim()).filter(b => b.length > 0)
        : null;

      const studentIdsArr = assignType === 'students' ? assignStudentIds : null;

      const payload = {
        name: sessionName,
        partExtension: partExtension || null,
        startDate,
        mode,
        venue: mode === 'offline' ? venue : null,
        meetLink: mode === 'online' ? meetLink : null,
        notes,
        startTime,
        endTime,
        batches: batchesArr,
        assignedStudentIds: studentIdsArr,
        assignedTeacherIds: assignTeacherIds.length > 0 ? assignTeacherIds : null
      };

      if (editingSession) {
        // Edit flow
        const response = await api.put(`/sessions/${editingSession.id}`, payload);
        if (response.data.success) {
          handleCloseModal();
          await fetchModulesAndSessions();
        }
      } else {
        // Create flow
        const createPayload = {
          ...payload,
          moduleId: activeModuleForSession,
          endDate: scheduleType !== 'single' ? endDate : null,
          scheduleType,
          weekDays: scheduleType === 'weekly' ? weekDays : null
        };
        const response = await api.post('/sessions', createPayload);
        if (response.data.success) {
          handleCloseModal();
          await fetchModulesAndSessions();
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save session configurations.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleUpdateStatus = async (sessionId: number, newStatus: string) => {
    try {
      await api.put(`/sessions/${sessionId}/status`, { status: newStatus });
      setModules(prev => prev.map(mod => {
        const updatedSessions = (mod.sessions || []).map(s => {
          if (s.id === sessionId) {
            return { ...s, status: newStatus as any };
          }
          return s;
        });
        return { ...mod, sessions: updatedSessions };
      }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update session status.');
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }
    try {
      await api.delete(`/sessions/${sessionId}`);
      setModules(prev => prev.map(mod => {
        const updatedSessions = (mod.sessions || []).filter(s => s.id !== sessionId);
        return { ...mod, sessions: updatedSessions };
      }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete session.');
    }
  };

  // Bulk assignment helper functions
  const handleCloseBulkAssign = () => {
    setShowBulkAssign(false);
    setBulkSelectedSessionIds([]);
    setBulkSelectedStudentIds([]);
    setBulkSelectedTeacherIds([]);
    setBulkAssignmentMode('add');
  };

  const allSessionIds = modules.flatMap(mod => (mod.sessions || []).map(s => s.id));

  const handleSessionToggle = (id: number) => {
    setBulkSelectedSessionIds(prev =>
      prev.includes(id) ? prev.filter(sessId => sessId !== id) : [...prev, id]
    );
  };

  const handleBulkStudentToggle = (id: number) => {
    setBulkSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleBulkTeacherToggle = (id: number) => {
    setBulkSelectedTeacherIds(prev =>
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleApplyBulkAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkSelectedSessionIds.length === 0) {
      alert('Please select at least one session.');
      return;
    }
    if (bulkSelectedStudentIds.length === 0 && bulkSelectedTeacherIds.length === 0) {
      alert('Please select at least one student or teacher to assign/remove.');
      return;
    }

    setBulkLoading(true);
    try {
      const response = await api.post('/sessions/bulk-assign', {
        sessionIds: bulkSelectedSessionIds,
        studentIds: bulkSelectedStudentIds.length > 0 ? bulkSelectedStudentIds : null,
        teacherIds: bulkSelectedTeacherIds.length > 0 ? bulkSelectedTeacherIds : null,
        assignmentMode: bulkAssignmentMode
      });
      if (response.data.success) {
        alert(response.data.message);
        handleCloseBulkAssign();
        await fetchModulesAndSessions();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete bulk assignment.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleWeekdayToggle = (day: string) => {
    setWeekDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleStudentSelectToggle = (id: number) => {
    setAssignStudentIds(prev =>
      prev.includes(id) ? prev.filter(studentId => studentId !== id) : [...prev, id]
    );
  };

  const handleTeacherSelectToggle = (id: number) => {
    setAssignTeacherIds(prev =>
      prev.includes(id) ? prev.filter(teacherId => teacherId !== id) : [...prev, id]
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Live':
        return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
      case 'Completed':
        return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
      case 'Cancelled':
        return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.1)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.2)' };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper badge for assignment status
  const getAssignmentBadge = (sess: Session) => {
    if (user?.role === 'student') {
      const assignedIds = sess.assigned_student_ids || [];
      const assignedBatches = sess.batches || [];

      if (assignedIds.length > 0 && assignedIds.map(Number).includes(Number(user.id))) {
        return (
          <span className="badge-ld" style={{ fontSize: '11px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
            Assigned to You
          </span>
        );
      }
      if (assignedBatches.length > 0 && studentBatch && assignedBatches.some(b => typeof b === 'string' && b.trim().toLowerCase() === studentBatch.trim().toLowerCase())) {
        return (
          <span className="badge-ld" style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
            Batch: {studentBatch}
          </span>
        );
      }
      return (
        <span className="badge-ld" style={{ fontSize: '11px', background: 'rgba(100, 116, 139, 0.1)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.2)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
          All Students
        </span>
      );
    } else {
      // Teacher / Admin view
      if (sess.assigned_student_ids && sess.assigned_student_ids.length > 0) {
        return (
          <span className="badge-ld badge-ld-secondary" style={{ fontSize: '11px' }}>
            {sess.assigned_student_ids.length} Student(s) Assigned
          </span>
        );
      }
      if (sess.batches && sess.batches.length > 0) {
        return (
          <span className="badge-ld badge-ld-primary" style={{ fontSize: '11px' }}>
            Batches: {sess.batches.join(', ')}
          </span>
        );
      }
      return (
        <span className="badge-ld badge-ld-secondary" style={{ fontSize: '11px' }}>
          All Students
        </span>
      );
    }
  };

  // Calendar Calculation Logic
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calYear = currentCalendarDate.getFullYear();
  const calMonth = currentCalendarDate.getMonth();

  const firstDayOfMonth = new Date(calYear, calMonth, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  const prevMonthCells: Array<{ day: number; dateStr: string; isCurrentMonth: false }> = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevDate = new Date(calYear, calMonth - 1, d);
    const dateStr = prevDate.toISOString().split('T')[0];
    prevMonthCells.push({ day: d, dateStr, isCurrentMonth: false });
  }

  const currentMonthCells: Array<{ day: number; dateStr: string; isCurrentMonth: true }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(calMonth + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${calYear}-${mStr}-${dStr}`;
    currentMonthCells.push({ day: d, dateStr, isCurrentMonth: true });
  }

  const totalCellsSoFar = prevMonthCells.length + currentMonthCells.length;
  const totalGridCells = totalCellsSoFar > 35 ? 42 : 35;
  const nextMonthCellsNeeded = totalGridCells - totalCellsSoFar;
  const nextMonthCells: Array<{ day: number; dateStr: string; isCurrentMonth: false }> = [];
  for (let d = 1; d <= nextMonthCellsNeeded; d++) {
    const nextDate = new Date(calYear, calMonth + 1, d);
    const dateStr = nextDate.toISOString().split('T')[0];
    nextMonthCells.push({ day: d, dateStr, isCurrentMonth: false });
  }

  const calendarGrid = [...prevMonthCells, ...currentMonthCells, ...nextMonthCells];

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentCalendarDate(new Date());
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper for Exporting All / Selected Module Sessions
  const getExportableSessions = () => {
    if (exportSelectedModule === 'all') {
      return allSessionsWithModule;
    }
    return allSessionsWithModule.filter(s => s.module_id === Number(exportSelectedModule));
  };

  const isModalOpen = !!activeModuleForSession || !!editingSession;

  return (
    <div style={{ color: 'var(--light-text)', fontFamily: '"Inter", sans-serif' }}>
      <style>{`
        .live-pulsate {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #10b981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulsate 1.6s infinite cubic-bezier(0.66, 0, 0, 1);
          margin-right: 6px;
        }

        @keyframes pulsate {
          to {
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
        }

        .sessions-timeline-container {
          border-left: 2px dashed rgba(79, 70, 229, 0.2);
          margin-left: 24px;
          padding-left: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .timeline-session-node {
          position: relative;
          background: #ffffff;
          border: 1px solid var(--light-border);
          border-radius: 12px;
          padding: 18px 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          transition: all 0.2s;
        }

        .timeline-session-node:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          border-color: rgba(79, 70, 229, 0.3);
        }

        .timeline-bullet {
          position: absolute;
          left: -33px;
          top: 22px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 3px solid var(--light-primary);
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
          z-index: 2;
        }

        .modal-sessions-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-sessions-card {
          background: white;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          padding: 28px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
        }

        .calendar-day-cell {
          background: #ffffff;
          border: 1px solid var(--light-border);
          border-radius: 10px;
          min-height: 120px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          transition: all 0.15s ease;
        }

        .calendar-day-cell:hover {
          border-color: rgba(79, 70, 229, 0.3);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .calendar-day-cell.dimmed {
          background: #f9fafb;
          opacity: 0.6;
        }

        .calendar-day-cell.today {
          border: 2px solid var(--light-primary);
          background: rgba(79, 70, 229, 0.02);
        }

        .calendar-event-card {
          background: #ffffff;
          border: 1px solid var(--light-border);
          border-left: 3px solid var(--light-primary);
          border-radius: 6px;
          padding: 6px 8px;
          margin-top: 6px;
          font-size: 11.5px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .calendar-event-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(0,0,0,0.06);
        }

        .gcal-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 6px;
          background-color: #ffffff;
          color: #1a73e8;
          border: 1px solid rgba(26, 115, 232, 0.3);
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s;
          cursor: pointer;
        }

        .gcal-btn:hover {
          background-color: #f8b4b415;
          border-color: #1a73e8;
          box-shadow: 0 2px 6px rgba(26, 115, 232, 0.15);
        }

        .btn-sync-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          padding: 6px 14px;
          border-radius: 8px;
          background: linear-gradient(135deg, #4285F4 0%, #1a73e8 100%);
          color: #ffffff;
          border: none;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(26, 115, 232, 0.25);
          transition: all 0.15s;
        }

        .btn-sync-all:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(26, 115, 232, 0.35);
        }
      `}</style>

      {/* Main Tab Header with View Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCalendar style={{ color: 'var(--light-primary)' }} />
            <span>Classroom Sessions & Schedule</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--light-text-secondary)' }}>
            View upcoming lectures, calendar schedule, join meetings, and sync all sessions to Google Calendar.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Sync / Export All Sessions to Google Calendar Button */}
          <button
            onClick={() => setShowExportAllModal(true)}
            className="btn-sync-all"
            title="Sync all classroom sessions to Google Calendar"
          >
            <FiShare2 size={15} />
            <span>Add All Sessions to Google Calendar</span>
          </button>

          {/* Timeline / Calendar View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'timeline' ? 'var(--light-primary)' : 'transparent',
                color: viewMode === 'timeline' ? 'white' : 'var(--light-text-secondary)',
                fontWeight: '600',
                transition: 'all 0.15s'
              }}
            >
              <FiList size={15} />
              <span>Timeline View</span>
            </button>

            <button
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'calendar' ? 'var(--light-primary)' : 'transparent',
                color: viewMode === 'calendar' ? 'white' : 'var(--light-text-secondary)',
                fontWeight: '600',
                transition: 'all 0.15s'
              }}
            >
              <FiCalendar size={15} />
              <span>Calendar View</span>
            </button>
          </div>

          {canWrite && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-ld btn-ld-secondary"
                onClick={() => setShowBulkAssign(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <FiUser size={15} />
                <span>Bulk Assign</span>
              </button>
              
              {!showAddModule && (
                <button 
                  className="btn-ld btn-ld-primary"
                  onClick={() => setShowAddModule(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <FiPlus size={15} />
                  <span>Create Module</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-ld alert-ld-error" style={{ marginBottom: '20px' }}>
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Add Module Panel */}
      {showAddModule && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid var(--light-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontWeight: '700' }}>Create Module Grouping</h4>
          <form onSubmit={handleCreateModule}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="moduleName">Module Name *</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="moduleName"
                  placeholder="e.g. Module 1: Introduction to Node.js"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="moduleDesc">Description (Optional)</label>
                <textarea
                  className="form-input-ld"
                  id="moduleDesc"
                  placeholder="Module objectives and description"
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-ld btn-ld-secondary" 
                onClick={() => setShowAddModule(false)}
                disabled={moduleLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-ld btn-ld-primary" 
                disabled={moduleLoading}
              >
                {moduleLoading ? 'Creating...' : 'Create Module'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CALENDAR VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <div style={{ background: '#fff', border: '1px solid var(--light-border)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          
          {/* Calendar Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '20px', color: 'black' }}>
                {monthNames[calMonth]} {calYear}
              </h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={handlePrevMonth}
                  className="btn-ld btn-ld-secondary btn-ld-small"
                  style={{ padding: '6px 10px' }}
                  title="Previous Month"
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="btn-ld btn-ld-secondary btn-ld-small"
                  style={{ padding: '6px 10px' }}
                  title="Next Month"
                >
                  <FiChevronRight size={16} />
                </button>
                <button
                  onClick={handleGoToToday}
                  className="btn-ld btn-ld-secondary btn-ld-small"
                  style={{ fontSize: '12px', fontWeight: '600' }}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Filters for Calendar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--light-text-secondary)' }}>
                <FiFilter size={14} />
                <span>Filters:</span>
              </div>
              <select
                className="form-input-ld"
                value={selectedModuleFilter}
                onChange={(e) => setSelectedModuleFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '12.5px', width: 'auto' }}
              >
                <option value="all">All Modules</option>
                {modules.map(mod => (
                  <option key={`cal-mod-opt-${mod.id}`} value={mod.id}>{mod.name}</option>
                ))}
              </select>

              <select
                className="form-input-ld"
                value={selectedModeFilter}
                onChange={(e) => setSelectedModeFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '12.5px', width: 'auto' }}
              >
                <option value="all">All Modes (Online & Offline)</option>
                <option value="online">Online Meetings Only</option>
                <option value="offline">Offline Venues Only</option>
              </select>
            </div>
          </div>

          {/* Weekday Header Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '10px', textAlign: 'center' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
              <div key={`head-${dayName}`} style={{ fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase', padding: '6px 0' }}>
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="calendar-grid">
            {calendarGrid.map((cell, idx) => {
              const isToday = cell.dateStr === todayStr;
              
              // Filter sessions for this date cell
              const daySessions = allSessionsWithModule.filter(sess => {
                if (sess.date !== cell.dateStr) return false;
                if (selectedModuleFilter !== 'all' && sess.module_id !== Number(selectedModuleFilter)) return false;
                if (selectedModeFilter !== 'all' && sess.mode !== selectedModeFilter) return false;
                return true;
              });

              return (
                <div
                  key={`cell-${cell.dateStr}-${idx}`}
                  className={`calendar-day-cell ${!cell.isCurrentMonth ? 'dimmed' : ''} ${isToday ? 'today' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '12.5px',
                      fontWeight: isToday ? '800' : '600',
                      color: isToday ? 'var(--light-primary)' : (cell.isCurrentMonth ? 'black' : 'var(--light-text-muted)'),
                      width: isToday ? '22px' : 'auto',
                      height: isToday ? '22px' : 'auto',
                      borderRadius: '50%',
                      background: isToday ? 'rgba(79,70,229,0.1)' : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {cell.day}
                    </span>
                    {daySessions.length > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--light-primary)', background: 'rgba(79,70,229,0.08)', padding: '1px 5px', borderRadius: '999px' }}>
                        {daySessions.length} sess
                      </span>
                    )}
                  </div>

                  {/* Sessions list in date cell */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '110px' }}>
                    {daySessions.map(sess => {
                      const statusStyle = getStatusStyle(sess.status);
                      return (
                        <div
                          key={`cal-sess-${sess.id}`}
                          className="calendar-event-card"
                          style={{ borderLeftColor: statusStyle.color }}
                          onClick={() => setViewingSession(sess)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: 'black', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                              Session {sess.session_number}{sess.name ? `: ${sess.name}` : ''}
                            </span>
                            {sess.mode === 'online' ? (
                              <FiVideo size={11} style={{ color: '#8b5cf6', flexShrink: 0 }} title="Online Session" />
                            ) : (
                              <FiMapPin size={11} style={{ color: '#f59e0b', flexShrink: 0 }} title="Offline Session" />
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', color: 'var(--light-text-secondary)', fontSize: '10.5px' }}>
                            <span>{sess.start_time}</span>
                            <a
                              href={generateGoogleCalendarUrl(sess, sess.moduleName)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: '#1a73e8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                              title="Add to Google Calendar"
                            >
                              <FiCalendar size={11} style={{ color: '#4285F4' }} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIMELINE / LIST VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'timeline' && (
        <>
          {loading ? (
            <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
              <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '32px', height: '32px' }}></span>
            </div>
          ) : modules.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
              <FiBookOpen size={48} style={{ color: 'var(--light-text-muted)', marginBottom: '16px' }} />
              <h4>No modules configured</h4>
              {canWrite ? (
                <p style={{ fontSize: '13.5px', marginTop: '6px' }}>Click "Create Module" to start adding sessions for your students.</p>
              ) : (
                <p style={{ fontSize: '13.5px', marginTop: '6px' }}>The teacher has not scheduled any lecture sessions yet.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {modules.map((mod) => (
                <div key={`module-card-${mod.id}`} style={{
                  background: '#ffffff',
                  border: '1px solid var(--light-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)'
                }}>
                  {/* Module Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'black' }}>{mod.name}</h4>
                      {mod.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--light-text-secondary)' }}>{mod.description}</p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      {/* Export Module Sessions to Calendar */}
                      {mod.sessions && mod.sessions.length > 0 && (
                        <button
                          className="btn-ld btn-ld-secondary btn-ld-small"
                          onClick={() => {
                            const modSessions = (mod.sessions || []).map(s => ({ ...s, moduleName: mod.name }));
                            downloadBulkSessionsIcsFile(modSessions, `Module_${mod.name.replace(/\s+/g, '_')}`);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1a73e8', borderColor: 'rgba(26,115,232,0.3)' }}
                          title="Export all sessions of this module to Calendar"
                        >
                          <FiDownload size={13} />
                          <span>Export Module Calendar</span>
                        </button>
                      )}

                      {canWrite && (
                        <>
                          <button
                            className="btn-ld btn-ld-secondary btn-ld-small"
                            onClick={() => setActiveModuleForSession(mod.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FiPlus size={14} />
                            <span>Add Sessions</span>
                          </button>
                          <button
                            className="btn-ld btn-ld-secondary btn-ld-small"
                            onClick={() => handleDeleteModule(mod.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                          >
                            <FiTrash2 size={13} />
                            <span>Delete Module</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sessions Timeline */}
                  {!mod.sessions || mod.sessions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--light-text-muted)', border: '1px dashed var(--light-border)', borderRadius: '10px' }}>
                      No sessions scheduled in this module.
                    </div>
                  ) : (
                    <>
                      <div className="sessions-timeline-container">
                      {(mod.sessions || []).map((sess) => {
                        const statusStyle = getStatusStyle(sess.status);
                        const assignmentBadge = getAssignmentBadge(sess);
                        const googleCalUrl = generateGoogleCalendarUrl(sess, mod.name);

                        return (
                          <div key={`session-node-${sess.id}`} className="timeline-session-node">
                            <div className="timeline-bullet"></div>

                            {/* Title and Metadata line */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'black' }}>
                                    Session {sess.session_number}
                                    {sess.name ? `: ${sess.name}` : ''}
                                    {sess.part_extension ? ` (${sess.part_extension})` : ''}
                                  </h5>
                                  {assignmentBadge}
                                </div>

                                {/* Date and Time */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '12.5px', color: 'var(--light-text-secondary)' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <FiCalendar size={13} />
                                    {formatDate(sess.date)}
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <FiClock size={13} />
                                    {sess.start_time} - {sess.end_time}
                                  </span>
                                </div>
                              </div>

                              {/* Status and Mode Indicators */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span 
                                  className="status-badge" 
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '3px 10px',
                                    borderRadius: '9999px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    ...statusStyle
                                  }}
                                >
                                  {sess.status === 'Live' && <span className="live-pulsate"></span>}
                                  {sess.status}
                                </span>

                                {sess.mode === 'online' ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                                    <FiVideo size={13} />
                                    <span>Online</span>
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                                    <FiMapPin size={13} />
                                    <span>Offline</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Middle contents: meeting link/venue, notes, conductors */}
                            <div style={{ marginTop: '12px', fontSize: '13.5px' }}>
                              
                              {/* Conducted by / Assigned Teachers info */}
                              {sess.assigned_teacher_ids && sess.assigned_teacher_ids.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--light-text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                                  <FiUser size={13} style={{ color: 'var(--light-text-muted)' }} />
                                  <span>Conducted by: <strong style={{ color: 'black' }}>
                                    {sess.assigned_teacher_ids
                                      .map(id => teachers.find(t => t.id === id)?.name)
                                      .filter(Boolean)
                                      .join(', ') || 'Assigned Teachers'}
                                  </strong></span>
                                </div>
                              )}

                              {/* Location / Meet link & Google Calendar button */}
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                                {sess.mode === 'online' && sess.meet_link && (
                                  <a 
                                    href={sess.meet_link.startsWith('http') ? sess.meet_link : `https://${sess.meet_link}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn-ld btn-ld-secondary"
                                    style={{
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '6px', 
                                      fontSize: '12.5px',
                                      padding: '5px 12px',
                                      color: '#7c3aed',
                                      borderColor: 'rgba(124,58,237,0.3)'
                                    }}
                                  >
                                    <FiVideo size={14} />
                                    <span>Join Online Meeting</span>
                                  </a>
                                )}

                                {sess.mode === 'offline' && sess.venue && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--light-text-secondary)' }}>
                                    <FiMapPin size={14} style={{ color: 'var(--light-text-muted)' }} />
                                    <span>Venue: <strong style={{ color: 'black' }}>{sess.venue}</strong></span>
                                  </div>
                                )}

                                {/* Add to Google Calendar button */}
                                <a
                                  href={googleCalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="gcal-btn"
                                  title="Add to Google Calendar"
                                >
                                  <FiCalendar size={14} style={{ color: '#4285F4' }} />
                                  <span>Add to Google Calendar</span>
                                </a>

                                {/* View Details Button */}
                                <button
                                  onClick={() => setViewingSession({ ...sess, moduleName: mod.name })}
                                  className="btn-ld btn-ld-secondary"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '5px 10px' }}
                                >
                                  <FiInfo size={13} />
                                  <span>View Details</span>
                                </button>
                              </div>

                              {/* Notes/Agenda */}
                              {sess.notes && (
                                <div style={{ 
                                  background: '#f9fafb', 
                                  borderLeft: '3px solid var(--light-primary)', 
                                  padding: '10px 14px', 
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                  color: '#374151',
                                  marginTop: '8px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', color: 'var(--light-primary)', marginBottom: '4px' }}>
                                    <FiFileText size={11} />
                                    <span>Agenda & Notes</span>
                                  </div>
                                  <div style={{ whiteSpace: 'pre-wrap' }}>{sess.notes}</div>
                                </div>
                              )}
                            </div>

                            {/* Actions footer (Teachers/Admins only) */}
                            {canWrite && (
                              <div style={{ 
                                marginTop: '16px', 
                                borderTop: '1px solid rgba(0,0,0,0.04)', 
                                paddingTop: '12px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center' 
                              }}>
                                {/* Status Quick Select */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase' }}>
                                    Set Status:
                                  </span>
                                  
                                  <button
                                    onClick={() => handleUpdateStatus(sess.id, 'Live')}
                                    disabled={sess.status === 'Live'}
                                    style={{
                                      fontSize: '11.5px',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: sess.status === 'Live' ? '#10b981' : '#f3f4f6',
                                      color: sess.status === 'Live' ? 'white' : 'var(--light-text)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: '600'
                                    }}
                                  >
                                    Live
                                  </button>

                                  <button
                                    onClick={() => handleUpdateStatus(sess.id, 'Completed')}
                                    disabled={sess.status === 'Completed'}
                                    style={{
                                      fontSize: '11.5px',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: sess.status === 'Completed' ? '#3b82f6' : '#f3f4f6',
                                      color: sess.status === 'Completed' ? 'white' : 'var(--light-text)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: '600'
                                    }}
                                  >
                                    Completed
                                  </button>

                                  <button
                                    onClick={() => handleUpdateStatus(sess.id, 'Cancelled')}
                                    disabled={sess.status === 'Cancelled'}
                                    style={{
                                      fontSize: '11.5px',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      background: sess.status === 'Cancelled' ? '#ef4444' : '#f3f4f6',
                                      color: sess.status === 'Cancelled' ? 'white' : 'var(--light-text)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontWeight: '600'
                                    }}
                                  >
                                    Cancelled
                                  </button>
                                </div>

                                {/* Edit, Attendance & Delete actions */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <button
                                    onClick={() => handleOpenAttendance(sess)}
                                    style={{
                                      background: 'var(--light-primary)',
                                      border: 'none',
                                      color: '#ffffff',
                                      padding: '5px 12px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                                    }}
                                    title="Take or view student attendance for this session"
                                  >
                                    <FiCheckCircle size={14} />
                                    <span>Take Attendance</span>
                                  </button>

                                  <button
                                    onClick={() => handleStartEdit(sess)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--light-primary)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '12.5px',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <FiEdit size={13} />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteSession(sess.id)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '12px',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <FiTrash2 size={13} />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {!canWrite && (
                              <div style={{ 
                                marginTop: '12px', 
                                borderTop: '1px solid rgba(0,0,0,0.04)', 
                                paddingTop: '10px', 
                                display: 'flex', 
                                justifyContent: 'flex-end', 
                                alignItems: 'center' 
                              }}>
                                <button
                                  onClick={() => handleOpenAttendance(sess)}
                                  style={{
                                    background: 'rgba(79, 70, 229, 0.08)',
                                    border: '1px solid rgba(79, 70, 229, 0.25)',
                                    color: 'var(--light-primary)',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}
                                  title="View your attendance status for this session"
                                >
                                  <FiCheckCircle size={13} />
                                  <span>View Attendance</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                      {(() => {
                        const totalSessionsCount = mod.totalSessionsCount !== undefined ? mod.totalSessionsCount : (mod.sessions || []).length;
                        const remainingCount = totalSessionsCount - (mod.sessions || []).length;

                        if (remainingCount <= 0) return null;

                        return (
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <button
                              type="button"
                              className="btn-ld btn-ld-secondary"
                              disabled={loadingMoreModuleId === mod.id}
                              onClick={() => handleLoadMoreSessions(mod.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                fontWeight: '700',
                                padding: '8px 24px',
                                borderRadius: '24px',
                                background: '#ffffff',
                                border: '1.5px solid var(--light-primary)',
                                color: 'var(--light-primary)',
                                boxShadow: '0 2px 10px rgba(79, 70, 229, 0.12)',
                                cursor: loadingMoreModuleId === mod.id ? 'not-allowed' : 'pointer',
                                opacity: loadingMoreModuleId === mod.id ? 0.7 : 1
                              }}
                            >
                              {loadingMoreModuleId === mod.id ? (
                                <>
                                  <span className="spinner" style={{ width: '14px', height: '14px', borderColor: 'rgba(79,70,229,0.3)', borderTopColor: 'var(--light-primary)' }}></span>
                                  <span>Loading Next Sessions...</span>
                                </>
                              ) : (
                                <>
                                  <FiChevronDown size={16} />
                                  <span>Load More Sessions ({remainingCount} remaining)</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* BULK / ALL SESSIONS GOOGLE CALENDAR SYNC MODAL */}
      {/* ========================================================================= */}
      {showExportAllModal && (
        <div className="modal-sessions-overlay" onClick={() => setShowExportAllModal(false)}>
          <div className="modal-sessions-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(26,115,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiShare2 size={20} style={{ color: '#1a73e8' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: '800', fontSize: '18px', color: 'black' }}>
                    Add All Sessions to Google Calendar
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: 'var(--light-text-secondary)' }}>
                    Export all classroom sessions into Google Calendar or Apple Calendar at once.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowExportAllModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--light-text-secondary)', cursor: 'pointer' }}
              >
                <FiXCircle size={22} />
              </button>
            </div>

            {/* Scope selection */}
            <div style={{ marginBottom: '20px', background: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid var(--light-border)' }}>
              <label className="form-label-ld" htmlFor="exportScope" style={{ marginBottom: '8px', display: 'block' }}>
                Select Scope of Sessions to Export *
              </label>
              <select
                id="exportScope"
                className="form-input-ld"
                value={exportSelectedModule}
                onChange={(e) => setExportSelectedModule(e.target.value)}
              >
                <option value="all">All Modules ({allSessionsWithModule.length} Total Sessions)</option>
                {modules.map(mod => (
                  <option key={`exp-mod-${mod.id}`} value={mod.id}>
                    {mod.name} ({(mod.sessions || []).length} Sessions)
                  </option>
                ))}
              </select>
            </div>

            {/* Step-by-Step Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              
              {/* Step 1 */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: '#fff', border: '1px solid var(--light-border)', padding: '14px', borderRadius: '10px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1a73e8', color: 'white', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  1
                </span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '14px', color: 'black' }}>Download Calendar File (.ics)</strong>
                  <p style={{ margin: '2px 0 10px 0', fontSize: '12.5px', color: 'var(--light-text-secondary)' }}>
                    Generates a single calendar file containing all {getExportableSessions().length} scheduled sessions.
                  </p>
                  <button
                    onClick={() => {
                      const sessionsToExport = getExportableSessions();
                      const prefix = exportSelectedModule === 'all' 
                        ? 'Classroom_All_Sessions' 
                        : `Module_${modules.find(m => m.id === Number(exportSelectedModule))?.name.replace(/\s+/g, '_')}`;
                      downloadBulkSessionsIcsFile(sessionsToExport, prefix);
                    }}
                    className="btn-sync-all"
                    style={{ fontSize: '12.5px', padding: '8px 14px' }}
                    disabled={getExportableSessions().length === 0}
                  >
                    <FiDownload size={15} />
                    <span>Download {getExportableSessions().length} Sessions (.ics)</span>
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: '#fff', border: '1px solid var(--light-border)', padding: '14px', borderRadius: '10px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#4285F4', color: 'white', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  2
                </span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '14px', color: 'black' }}>Import into Google Calendar</strong>
                  <p style={{ margin: '2px 0 10px 0', fontSize: '12.5px', color: 'var(--light-text-secondary)' }}>
                    Open Google Calendar's Import page and upload the downloaded file to add all sessions to your Google Calendar at once.
                  </p>
                  <a
                    href="https://calendar.google.com/calendar/u/0/r/settings/export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gcal-btn"
                    style={{ fontSize: '12.5px', padding: '8px 14px' }}
                  >
                    <FiExternalLink size={15} style={{ color: '#4285F4' }} />
                    <span>Open Google Calendar Import Page</span>
                  </a>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExportAllModal(false)}
                className="btn-ld btn-ld-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SESSION DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingSession && (
        <div className="modal-sessions-overlay" onClick={() => setViewingSession(null)}>
          <div className="modal-sessions-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--light-primary)', textTransform: 'uppercase' }}>
                  {viewingSession.moduleName || 'Classroom Module'}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '18px', color: 'black' }}>
                  Session {viewingSession.session_number}{viewingSession.name ? `: ${viewingSession.name}` : ''}
                  {viewingSession.part_extension ? ` (${viewingSession.part_extension})` : ''}
                </h3>
              </div>
              <button
                onClick={() => setViewingSession(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--light-text-secondary)', cursor: 'pointer' }}
              >
                <FiXCircle size={22} />
              </button>
            </div>

            {/* Session Info Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', background: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid var(--light-border)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>Status:</span>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  ...getStatusStyle(viewingSession.status)
                }}>
                  {viewingSession.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>Audience Assignment:</span>
                {getAssignmentBadge(viewingSession)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>Date & Time:</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'black' }}>
                  {formatDate(viewingSession.date)} ({viewingSession.start_time} - {viewingSession.end_time})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>Delivery Mode:</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: viewingSession.mode === 'online' ? '#8b5cf6' : '#f59e0b' }}>
                  {viewingSession.mode === 'online' ? 'Online Video Meeting' : 'Offline Venue'}
                </span>
              </div>

              {viewingSession.mode === 'online' && viewingSession.meet_link && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>Meeting Link:</span>
                  <a
                    href={viewingSession.meet_link.startsWith('http') ? viewingSession.meet_link : `https://${viewingSession.meet_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#7c3aed', fontWeight: '700', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FiVideo size={14} />
                    <span>Join Meeting</span>
                  </a>
                </div>
              )}

              {viewingSession.mode === 'offline' && viewingSession.venue && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>Venue Location:</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'black' }}>{viewingSession.venue}</span>
                </div>
              )}

              {viewingSession.assigned_teacher_ids && viewingSession.assigned_teacher_ids.length > 0 && (
                <div style={{ borderTop: '1px solid var(--light-border)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Conducted By:
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'black' }}>
                    {viewingSession.assigned_teacher_ids
                      .map(id => teachers.find(t => t.id === id)?.name)
                      .filter(Boolean)
                      .join(', ') || 'Classroom Teachers'}
                  </div>
                </div>
              )}
            </div>

            {/* Agenda / Notes */}
            {viewingSession.notes && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ margin: '0 0 8px 0', fontWeight: '700', fontSize: '13px', color: 'black' }}>Agenda & Notes</h5>
                <div style={{ background: '#f9fafb', borderLeft: '3px solid var(--light-primary)', padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                  {viewingSession.notes}
                </div>
              </div>
            )}

            {/* Actions: Add to Google Calendar & Download iCal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
              <a
                href={generateGoogleCalendarUrl(viewingSession, viewingSession.moduleName)}
                target="_blank"
                rel="noopener noreferrer"
                className="gcal-btn"
                style={{ justifyContent: 'center', padding: '10px 16px', fontSize: '13.5px' }}
              >
                <FiCalendar size={18} style={{ color: '#4285F4' }} />
                <span>Add to Google Calendar</span>
              </a>

              <button
                onClick={() => downloadIcsFile(viewingSession, viewingSession.moduleName)}
                className="btn-ld btn-ld-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', fontSize: '13px' }}
              >
                <FiDownload size={15} />
                <span>Download Calendar Event (.ics)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Sessions Modal */}
      {isModalOpen && (
        <div className="modal-sessions-overlay" onClick={handleCloseModal}>
          <div className="modal-sessions-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: '700' }}>
                {editingSession ? 'Edit Lecture Session' : 'Schedule Lecture Sessions'}
              </h3>
              <button 
                onClick={handleCloseModal}
                style={{ background: 'transparent', border: 'none', color: 'var(--light-text-secondary)', cursor: 'pointer' }}
              >
                <FiXCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateSessions}>
              
              {/* Basic configuration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld" htmlFor="sessName">Session Name / Title (Optional)</label>
                  <input
                    className="form-input-ld"
                    type="text"
                    id="sessName"
                    placeholder="e.g. Promises and Async/Await"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
                </div>

                <div className="form-group-ld">
                  <label className="form-label-ld" htmlFor="partExt">Part Extension</label>
                  <select
                    className="form-input-ld"
                    id="partExt"
                    value={partExtension}
                    onChange={(e) => setPartExtension(e.target.value)}
                  >
                    <option value="">None (Single Class Session)</option>
                    <option value="Part 1">Part 1</option>
                    <option value="Part 2">Part 2</option>
                    <option value="Part 3">Part 3</option>
                    <option value="Part 4">Part 4</option>
                    <option value="Part 5">Part 5</option>
                    <option value="Part 6">Part 6</option>
                  </select>
                </div>
              </div>

              {/* Time Configuration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld" htmlFor="startTime">Start Time *</label>
                  <input
                    className="form-input-ld"
                    type="time"
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-ld">
                  <label className="form-label-ld" htmlFor="endTime">End Time *</label>
                  <input
                    className="form-input-ld"
                    type="time"
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Recurrence Pattern (Hidden during Edit) */}
              <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.02)', border: '1px solid rgba(79, 70, 229, 0.1)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 12px 0', color: 'var(--light-primary)', fontWeight: '700' }}>
                  {editingSession ? 'Session Scheduling' : 'Recurrence Scheduling'}
                </h5>
                
                {!editingSession && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group-ld">
                      <label className="form-label-ld" htmlFor="recurType">Schedule Type *</label>
                      <select
                        className="form-input-ld"
                        id="recurType"
                        value={scheduleType}
                        onChange={(e) => setScheduleType(e.target.value as any)}
                        required
                      >
                        <option value="single">Single (One-time Session)</option>
                        <option value="daily">Daily (Repeat every day in date range)</option>
                        <option value="weekly">Weekly (Repeat on specific weekdays in range)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: (editingSession || scheduleType === 'single') ? '1fr' : '1fr 1fr', gap: '16px' }}>
                  <div className="form-group-ld">
                    <label className="form-label-ld" htmlFor="startDate">
                      {editingSession ? 'Session Date *' : (scheduleType === 'single' ? 'Session Date *' : 'Start Date *')}
                    </label>
                    <input
                      className="form-input-ld"
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  {!editingSession && scheduleType !== 'single' && (
                    <div className="form-group-ld">
                      <label className="form-label-ld" htmlFor="endDate">End Date *</label>
                      <input
                        className="form-input-ld"
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Weekday Selection */}
                {!editingSession && scheduleType === 'weekly' && (
                  <div style={{ marginTop: '12px' }}>
                    <label className="form-label-ld" style={{ marginBottom: '6px', display: 'block' }}>Select Recurrence Weekdays *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                        const isSelected = weekDays.includes(day);
                        return (
                          <button
                            key={`weekday-${day}`}
                            type="button"
                            onClick={() => handleWeekdayToggle(day)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: isSelected ? 'var(--light-primary)' : 'var(--light-border)',
                              background: isSelected ? 'var(--light-primary)' : 'white',
                              color: isSelected ? 'white' : 'var(--light-text)',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Mode: Online / Offline */}
              <div style={{ border: '1px solid var(--light-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontWeight: '700' }}>Lecture Delivery Mode</h5>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group-ld">
                    <label className="form-label-ld" htmlFor="modeSelect">Delivery Mode *</label>
                    <select
                      className="form-input-ld"
                      id="modeSelect"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as any)}
                      required
                    >
                      <option value="offline">Offline (Physical Venue)</option>
                      <option value="online">Online (Video Meeting)</option>
                    </select>
                  </div>
                </div>

                {mode === 'online' ? (
                  <div className="form-group-ld">
                    <label className="form-label-ld" htmlFor="meetLink">Google Meet / Video Conference Link *</label>
                    <input
                      className="form-input-ld"
                      type="url"
                      id="meetLink"
                      placeholder="e.g. https://meet.google.com/abc-defg-hij"
                      value={meetLink}
                      onChange={(e) => setMeetLink(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group-ld">
                    <label className="form-label-ld" htmlFor="venue">Venue / Location Room *</label>
                    <input
                      className="form-input-ld"
                      type="text"
                      id="venue"
                      placeholder="e.g. Lab Room 304, main building"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Teachers/Conductors Assignment */}
              <div style={{ border: '1px solid var(--light-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontWeight: '700' }}>Assign Classroom Teachers / Conductors</h5>
                {activeTeachers.length === 0 ? (
                  <span style={{ fontSize: '13px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>
                    No classroom teachers found.
                  </span>
                ) : (
                  <div style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    border: '1px solid var(--light-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {activeTeachers.map(t => {
                      const isChecked = assignTeacherIds.includes(t.id);
                      return (
                        <label key={`chk-teacher-${t.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTeacherSelectToggle(t.id)}
                          />
                          <span>
                            <strong>{t.name}</strong>
                            <span style={{ color: 'var(--light-text-secondary)', marginLeft: '4px' }}>({t.email})</span>
                            <span className="badge-ld badge-ld-secondary" style={{ fontSize: '10px', marginLeft: '6px', padding: '1px 6px', textTransform: 'capitalize' }}>
                              {t.ClassroomTeacher?.role}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Session Targets (Assignments) */}
              <div style={{ border: '1px solid var(--light-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontWeight: '700' }}>Session Student Audience Assignment</h5>

                <div className="form-group-ld" style={{ marginBottom: '12px' }}>
                  <label className="form-label-ld" htmlFor="assignType">Who should attend this session? *</label>
                  <select
                    className="form-input-ld"
                    id="assignType"
                    value={assignType}
                    onChange={(e) => setAssignType(e.target.value as any)}
                    required
                  >
                    <option value="all">All Classroom Students</option>
                    <option value="batches">Specific Student Batches</option>
                    <option value="students">Specific Individual Students</option>
                  </select>
                </div>

                {/* Batches text input */}
                {assignType === 'batches' && (
                  <div className="form-group-ld">
                    <label className="form-label-ld" htmlFor="batchesInput">Batches (Comma-separated) *</label>
                    <input
                      className="form-input-ld"
                      type="text"
                      id="batchesInput"
                      placeholder="e.g. CSE-2026, IT-A"
                      value={assignBatches}
                      onChange={(e) => setAssignBatches(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '11.5px', color: 'var(--light-text-secondary)', display: 'block', marginTop: '4px' }}>
                      Enter batch tags exactly as configured on student profiles.
                    </span>
                  </div>
                )}

                {/* Individual Student Checkboxes */}
                {assignType === 'students' && (
                  <div className="form-group-ld">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label-ld" style={{ margin: 0 }}>Select Assigned Students *</label>
                      {activeStudents.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setAssignStudentIds(activeStudents.map(s => s.id))}
                            style={{ background: 'transparent', border: 'none', color: 'var(--light-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            Select All
                          </button>
                          <span style={{ color: 'var(--light-text-muted)', fontSize: '12px' }}>|</span>
                          <button
                            type="button"
                            onClick={() => setAssignStudentIds([])}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            Deselect All
                          </button>
                        </div>
                      )}
                    </div>

                    {activeStudents.length === 0 ? (
                      <span style={{ fontSize: '13px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>
                        No active students found in this classroom.
                      </span>
                    ) : (
                      <div style={{
                        maxHeight: '150px',
                        overflowY: 'auto',
                        border: '1px solid var(--light-border)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {activeStudents.map(student => {
                          const isChecked = assignStudentIds.includes(student.id);
                          return (
                            <label key={`chk-student-${student.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleStudentSelectToggle(student.id)}
                              />
                              <span>
                                <strong>{student.name}</strong> 
                                <span style={{ color: 'var(--light-text-secondary)', marginLeft: '4px' }}>({student.email})</span>
                                {student.batch && <span className="badge-ld badge-ld-primary" style={{ fontSize: '10px', marginLeft: '6px', padding: '1px 6px' }}>{student.batch}</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes / Agenda */}
              <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                <label className="form-label-ld" htmlFor="notes">Session Notes / Agenda</label>
                <textarea
                  className="form-input-ld"
                  id="notes"
                  placeholder="Provide outline, materials links, or notes for the session..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={handleCloseModal}
                  disabled={sessionLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={sessionLoading || (assignType === 'students' && assignStudentIds.length === 0)}
                >
                  {sessionLoading ? (editingSession ? 'Saving...' : 'Scheduling...') : (editingSession ? 'Save Changes' : 'Create Session(s)')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="modal-sessions-overlay" onClick={handleCloseBulkAssign}>
          <div className="modal-sessions-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: '700' }}>Bulk Assign Students & Teachers</h3>
              <button 
                onClick={handleCloseBulkAssign}
                style={{ background: 'transparent', border: 'none', color: 'var(--light-text-secondary)', cursor: 'pointer' }}
              >
                <FiXCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyBulkAssignment}>
              
              {/* Step 1: Select Sessions */}
              <div style={{ border: '1px solid var(--light-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h5 style={{ margin: 0, fontWeight: '700' }}>1. Select Target Sessions *</h5>
                  {allSessionIds.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setBulkSelectedSessionIds(allSessionIds)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--light-primary)', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Select All
                      </button>
                      <span style={{ color: 'var(--light-text-muted)', fontSize: '11.5px' }}>|</span>
                      <button
                        type="button"
                        onClick={() => setBulkSelectedSessionIds([])}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--light-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {modules.map(mod => {
                    const modSessions = mod.sessions || [];
                    if (modSessions.length === 0) return null;
                    return (
                      <div key={`bulk-mod-group-${mod.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <strong style={{ fontSize: '12px', color: 'var(--light-primary)', textTransform: 'uppercase' }}>{mod.name}</strong>
                        <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {modSessions.map(s => {
                            const isChecked = bulkSelectedSessionIds.includes(s.id);
                            return (
                              <label key={`bulk-sess-chk-${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleSessionToggle(s.id)}
                                />
                                <span>
                                  Session {s.session_number}: {s.name || 'Untitled'} ({formatDate(s.date)})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {allSessionIds.length === 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>
                      No sessions scheduled in this classroom.
                    </span>
                  )}
                </div>
              </div>

              {/* Step 2: Select Students */}
              <div style={{ border: '1px solid var(--light-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h5 style={{ margin: 0, fontWeight: '700' }}>2. Select Students to Assign</h5>
                  {activeStudents.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setBulkSelectedStudentIds(activeStudents.map(s => s.id))}
                        style={{ background: 'transparent', border: 'none', color: 'var(--light-primary)', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Select All
                      </button>
                      <span style={{ color: 'var(--light-text-muted)', fontSize: '11.5px' }}>|</span>
                      <button
                        type="button"
                        onClick={() => setBulkSelectedStudentIds([])}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--light-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeStudents.map(student => {
                    const isChecked = bulkSelectedStudentIds.includes(student.id);
                    return (
                      <label key={`bulk-chk-student-${student.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleBulkStudentToggle(student.id)}
                        />
                        <span>
                          <strong>{student.name}</strong> 
                          <span style={{ color: 'var(--light-text-secondary)', marginLeft: '4px' }}>({student.email})</span>
                          {student.batch && <span className="badge-ld badge-ld-primary" style={{ fontSize: '10px', marginLeft: '6px', padding: '1px 6px' }}>{student.batch}</span>}
                        </span>
                      </label>
                    );
                  })}
                  {activeStudents.length === 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>
                      No active students found in this classroom.
                    </span>
                  )}
                </div>
              </div>

              {/* Step 3: Select Teachers */}
              <div style={{ border: '1px solid var(--light-border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h5 style={{ margin: 0, fontWeight: '700' }}>3. Select Teachers to Assign</h5>
                  {activeTeachers.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setBulkSelectedTeacherIds(activeTeachers.map(t => t.id))}
                        style={{ background: 'transparent', border: 'none', color: 'var(--light-primary)', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Select All
                      </button>
                      <span style={{ color: 'var(--light-text-muted)', fontSize: '11.5px' }}>|</span>
                      <button
                        type="button"
                        onClick={() => setBulkSelectedTeacherIds([])}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--light-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeTeachers.map(t => {
                    const isChecked = bulkSelectedTeacherIds.includes(t.id);
                    return (
                      <label key={`bulk-chk-teacher-${t.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleBulkTeacherToggle(t.id)}
                        />
                        <span>
                          <strong>{t.name}</strong>
                          <span style={{ color: 'var(--light-text-secondary)', marginLeft: '4px' }}>({t.email})</span>
                          <span className="badge-ld badge-ld-secondary" style={{ fontSize: '10px', marginLeft: '6px', padding: '1px 6px', textTransform: 'capitalize' }}>
                            {t.ClassroomTeacher?.role}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                  {activeTeachers.length === 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>
                      No classroom teachers found.
                    </span>
                  )}
                </div>
              </div>

              {/* Step 4: Assignment Action Mode */}
              <div style={{ border: '1px solid var(--light-border)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontWeight: '700' }}>4. Select Assignment Action</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="bulkMode"
                      value="add"
                      checked={bulkAssignmentMode === 'add'}
                      onChange={() => setBulkAssignmentMode('add')}
                    />
                    <span><strong>Add to selected sessions</strong> (Keeps current assigned users and appends new ones)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="bulkMode"
                      value="replace"
                      checked={bulkAssignmentMode === 'replace'}
                      onChange={() => setBulkAssignmentMode('replace')}
                    />
                    <span><strong>Replace assignments</strong> (Clears current assigned users and overwrites with the selected list)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="bulkMode"
                      value="remove"
                      checked={bulkAssignmentMode === 'remove'}
                      onChange={() => setBulkAssignmentMode('remove')}
                    />
                    <span><strong>Remove from selected sessions</strong> (Strips the selected users if they were assigned)</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={handleCloseBulkAssign}
                  disabled={bulkLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={bulkLoading || bulkSelectedSessionIds.length === 0 || (bulkSelectedStudentIds.length === 0 && bulkSelectedTeacherIds.length === 0)}
                >
                  {bulkLoading ? 'Applying...' : 'Apply Bulk Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Student Attendance Modal */}
      {showAttendanceModal && attendanceSession && (
        <div className="modal-overlay-ld" onClick={() => setShowAttendanceModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '92%' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--light-border)', paddingBottom: '12px' }}>
              <div>
                <h3 className="modal-title-ld" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiCheckCircle style={{ color: 'var(--light-primary)' }} />
                  <span>Session Attendance: {attendanceSession.name || `Session ${attendanceSession.session_number}`}</span>
                </h3>
                <p className="modal-subtitle-ld" style={{ margin: '4px 0 0 0' }}>
                  <FiCalendar size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {attendanceSession.date} • {attendanceSession.start_time} - {attendanceSession.end_time}
                </p>
              </div>
              <button 
                onClick={() => setShowAttendanceModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiXCircle size={22} />
              </button>
            </div>

            {attendanceError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{attendanceError}</span>
              </div>
            )}

            {attendanceSuccess && (
              <div className="alert-ld alert-ld-success" style={{ marginBottom: '16px' }}>
                <FiCheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>{attendanceSuccess}</span>
              </div>
            )}

            {loadingAttendance ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '32px', height: '32px' }}></span>
                <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--light-text-secondary)' }}>Loading session student roster...</p>
              </div>
            ) : (
              <div>
                {/* Stats Header & Quick Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '12px', 
                  background: '#f8fafc', 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  marginBottom: '16px',
                  border: '1px solid #e2e8f0'
                }}>
                  {/* Real-time Counters */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge-ld" style={{ background: '#e2e8f0', color: '#334155', fontWeight: '700' }}>
                      Total: {attendanceStats.total}
                    </span>
                    <span className="badge-ld" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: '700' }}>
                      Unmarked: {attendanceList.filter(a => a.status === 'unmarked').length}
                    </span>
                    <span className="badge-ld" style={{ background: '#dcfce7', color: '#15803d', fontWeight: '700' }}>
                      Present: {attendanceList.filter(a => a.status === 'present').length}
                    </span>
                    <span className="badge-ld" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: '700' }}>
                      Absent: {attendanceList.filter(a => a.status === 'absent').length}
                    </span>
                    <span className="badge-ld" style={{ background: '#fef3c7', color: '#b45309', fontWeight: '700' }}>
                      Late: {attendanceList.filter(a => a.status === 'late').length}
                    </span>
                    <span className="badge-ld" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: '700' }}>
                      Excused: {attendanceList.filter(a => a.status === 'excused').length}
                    </span>
                  </div>

                  {/* Batch Action Buttons */}
                  {canWrite && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-ld btn-ld-secondary btn-ld-small"
                        onClick={() => handleMarkAll('present')}
                        style={{ fontSize: '12px' }}
                      >
                        Mark All Present
                      </button>
                      <button
                        type="button"
                        className="btn-ld btn-ld-secondary btn-ld-small"
                        onClick={() => handleMarkAll('absent')}
                        style={{ fontSize: '12px', color: '#ef4444' }}
                      >
                        Mark All Absent
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter Search Input */}
                <div style={{ marginBottom: '14px' }}>
                  <input
                    type="text"
                    className="form-input-ld"
                    placeholder="Search student by name, email or batch..."
                    value={attendanceSearchQuery}
                    onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>

                {/* Student Attendance List Table */}
                <div className="ld-table-container" style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '20px' }}>
                  {attendanceList.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
                      No active students enrolled or assigned to this session.
                    </div>
                  ) : (
                    <table className="ld-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Batch</th>
                          <th style={{ textAlign: 'center' }}>Attendance Status</th>
                          <th>Remarks / Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList
                          .filter(st => {
                            if (!attendanceSearchQuery.trim()) return true;
                            const q = attendanceSearchQuery.toLowerCase();
                            return st.name.toLowerCase().includes(q) ||
                              st.email.toLowerCase().includes(q) ||
                              (st.batch && st.batch.toLowerCase().includes(q));
                          })
                          .map((st) => (
                            <tr key={`attendance-student-${st.studentId}`}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {st.profile_url || st.profileUrl ? (
                                    <img 
                                      src={st.profile_url || st.profileUrl || ''} 
                                      alt={st.name} 
                                      className="teacher-avatar-thumb"
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="ld-avatar" style={{ width: '30px', height: '30px', fontSize: '11px' }}>
                                      {st.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                    </div>
                                  )}
                                  <div>
                                    <div style={{ fontWeight: '600', fontSize: '13.5px' }}>{st.name}</div>
                                    <div style={{ fontSize: '11.5px', color: 'var(--light-text-muted)' }}>{st.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {st.batch ? (
                                  <span className="badge-ld badge-ld-primary" style={{ fontSize: '11px' }}>{st.batch}</span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>General</span>
                                )}
                              </td>
                              <td>
                                {canWrite ? (
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusToggle(st.studentId, 'present')}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        border: st.status === 'present' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                                        background: st.status === 'present' ? '#22c55e' : '#f8fafc',
                                        color: st.status === 'present' ? '#ffffff' : '#475569',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Present
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleStatusToggle(st.studentId, 'absent')}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        border: st.status === 'absent' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                                        background: st.status === 'absent' ? '#ef4444' : '#f8fafc',
                                        color: st.status === 'absent' ? '#ffffff' : '#475569',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Absent
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleStatusToggle(st.studentId, 'late')}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        border: st.status === 'late' ? '2px solid #d97706' : '1px solid #cbd5e1',
                                        background: st.status === 'late' ? '#f59e0b' : '#f8fafc',
                                        color: st.status === 'late' ? '#ffffff' : '#475569',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Late
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleStatusToggle(st.studentId, 'excused')}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        border: st.status === 'excused' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                        background: st.status === 'excused' ? '#3b82f6' : '#f8fafc',
                                        color: st.status === 'excused' ? '#ffffff' : '#475569',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Excused
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ textAlign: 'center' }}>
                                    <span 
                                      className="badge-ld"
                                      style={{
                                        background: 
                                          st.status === 'present' ? '#dcfce7' :
                                          st.status === 'absent' ? '#fee2e2' :
                                          st.status === 'late' ? '#fef3c7' :
                                          st.status === 'excused' ? '#dbeafe' : '#f1f5f9',
                                        color: 
                                          st.status === 'present' ? '#15803d' :
                                          st.status === 'absent' ? '#b91c1c' :
                                          st.status === 'late' ? '#b45309' :
                                          st.status === 'excused' ? '#1d4ed8' : '#64748b',
                                        textTransform: 'capitalize',
                                        fontWeight: '700'
                                      }}
                                    >
                                      {st.status === 'unmarked' ? 'Not Marked' : st.status}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td>
                                {canWrite ? (
                                  <input
                                    type="text"
                                    className="form-input-ld"
                                    placeholder="Add notes..."
                                    value={st.remarks}
                                    onChange={(e) => handleRemarksChange(st.studentId, e.target.value)}
                                    style={{ padding: '4px 8px', fontSize: '12px', width: '100%' }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)' }}>{st.remarks || '-'}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer Submit Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="btn-ld btn-ld-secondary" 
                    onClick={() => setShowAttendanceModal(false)}
                  >
                    Close
                  </button>
                  {canWrite && (
                    <button 
                      type="button" 
                      className="btn-ld btn-ld-primary" 
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance}
                    >
                      {savingAttendance ? 'Saving...' : 'Save Attendance'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
