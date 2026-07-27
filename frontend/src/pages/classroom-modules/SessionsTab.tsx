import React, { useState, useEffect } from 'react';
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
  FiEdit
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
}

interface SessionsTabProps {
  classroomId: number | undefined;
  user: { id: number; role: string; name: string; email: string } | null;
  teachers: Teacher[] | undefined;
  activeStudents: StudentUser[];
}

export const SessionsTab: React.FC<SessionsTabProps> = ({
  classroomId,
  user,
  teachers = [],
  activeStudents = []
}) => {
  const [modules, setModules] = useState<ClassroomModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const isOrgAdmin = user?.role === 'admin';
  const primaryTeacher = teachers.find(t => t.id === user?.id && t.ClassroomTeacher?.role === 'teacher');
  const canWrite = isOrgAdmin || !!primaryTeacher;

  // Filter teachers/co-teachers in classroom
  const activeTeachers = teachers.filter(t => 
    (t.ClassroomTeacher?.role === 'teacher' || t.ClassroomTeacher?.role === 'co-teacher') && 
    t.ClassroomTeacher?.status === 'approved'
  );

  // UI state
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
          padding: 16px 20px;
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

        .module-accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(243, 244, 246, 0.8);
          border: 1px solid var(--light-border);
          border-radius: 12px;
          padding: 16px 24px;
          margin-bottom: 12px;
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
      `}</style>

      {/* Main Tab Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCalendar style={{ color: 'var(--light-primary)' }} />
            <span>Classroom Sessions & Modules</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--light-text-secondary)' }}>
            Organize modules, schedule online/offline sessions, and track recurring lectures.
          </p>
        </div>

        {canWrite && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-ld btn-ld-secondary"
              onClick={() => setShowBulkAssign(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FiUser size={16} />
              <span>Bulk Assign</span>
            </button>
            
            {!showAddModule && (
              <button 
                className="btn-ld btn-ld-primary"
                onClick={() => setShowAddModule(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FiPlus size={16} />
                <span>Create Module</span>
              </button>
            )}
          </div>
        )}
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

      {/* Modules List & Session Timelines */}
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
              background: 'rgba(255, 255, 255, 0.5)',
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

                <div style={{ display: 'flex', gap: '12px' }}>
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
                <div className="sessions-timeline-container">
                  {mod.sessions.map((sess) => {
                    const statusStyle = getStatusStyle(sess.status);
                    return (
                      <div key={`session-node-${sess.id}`} className="timeline-session-node">
                        <div className="timeline-bullet"></div>

                        {/* Title and Metadata line */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'black' }}>
                              Session {sess.session_number}
                              {sess.name ? `: ${sess.name}` : ''}
                              {sess.part_extension ? ` (${sess.part_extension})` : ''}
                            </h5>

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

                        {/* Middle contents: meeting link/venue, notes, assignments */}
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

                          {/* Location / Meet link */}
                          {sess.mode === 'online' && sess.meet_link && (
                            <div style={{ marginBottom: '8px' }}>
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
                            </div>
                          )}

                          {sess.mode === 'offline' && sess.venue && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--light-text-secondary)', marginBottom: '8px' }}>
                              <FiMapPin size={14} style={{ color: 'var(--light-text-muted)' }} />
                              <span>Venue: <strong style={{ color: 'black' }}>{sess.venue}</strong></span>
                            </div>
                          )}

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

                          {/* Assignments info */}
                          {canWrite && (sess.batches || sess.assigned_student_ids) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                              {sess.batches && sess.batches.map(b => (
                                <span key={`badge-batch-${b}`} className="badge-ld badge-ld-primary" style={{ fontSize: '11px' }}>
                                  Batch: {b}
                                </span>
                              ))}
                              {sess.assigned_student_ids && sess.assigned_student_ids.length > 0 && (
                                <span className="badge-ld badge-ld-secondary" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <FiUser size={10} />
                                  <span>{sess.assigned_student_ids.length} Assigned Student(s)</span>
                                </span>
                              )}
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

                            {/* Edit & Delete actions */}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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
    </div>
  );
};
