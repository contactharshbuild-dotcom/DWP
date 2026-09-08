import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiX, 
  FiUserPlus, 
  FiSearch, 
  FiFilter, 
  FiCheckSquare, 
  FiSquare, 
  FiBookOpen, 
  FiAlertCircle, 
  FiCheck,
  FiTag
} from 'react-icons/fi';
import api from '../../../services/api';

export interface AvailableStudentClassroom {
  id: number;
  name: string;
  classroom_id: number;
}

export interface AvailableStudent {
  id: number;
  name: string;
  email: string;
  batch?: string | null;
  status: string;
  profile_url?: string | null;
  classrooms?: AvailableStudentClassroom[];
}

export interface OtherClassroom {
  id: number;
  name: string;
  classroom_id: number;
  subject?: string;
}

interface AssignExistingStudentsModalProps {
  isOpen: boolean;
  classroomId: number;
  classroomName?: string;
  onClose: () => void;
  onSuccess: (assignedCount: number) => void;
}

export const AssignExistingStudentsModal: React.FC<AssignExistingStudentsModalProps> = ({
  isOpen,
  classroomId,
  classroomName,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [otherClassrooms, setOtherClassrooms] = useState<OtherClassroom[]>([]);

  // Filter and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceClassroomFilter, setSourceClassroomFilter] = useState<string>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [assignBatch, setAssignBatch] = useState('');

  // Fetch available students whenever modal opens
  useEffect(() => {
    if (!isOpen || !classroomId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSelectedStudentIds([]);
    setSearchQuery('');
    setSourceClassroomFilter('all');
    setAssignBatch('');

    const fetchAvailableStudents = async () => {
      try {
        const res = await api.get(`/classrooms/${classroomId}/students/available`);
        if (isMounted) {
          setAvailableStudents(res.data.students || []);
          setOtherClassrooms(res.data.otherClassrooms || []);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load available students:', err);
          setError(err.response?.data?.message || 'Failed to load students from other classrooms.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAvailableStudents();

    return () => {
      isMounted = false;
    };
  }, [isOpen, classroomId]);

  // Compute filtered students list based on search and classroom filter
  const filteredStudents = useMemo(() => {
    return availableStudents.filter(student => {
      // 1. Source Classroom filter
      if (sourceClassroomFilter === 'unassigned') {
        if (student.classrooms && student.classrooms.length > 0) return false;
      } else if (sourceClassroomFilter !== 'all') {
        const filterId = parseInt(sourceClassroomFilter);
        const isInClassroom = student.classrooms?.some(c => c.id === filterId);
        if (!isInClassroom) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = student.name?.toLowerCase().includes(q);
        const matchesEmail = student.email?.toLowerCase().includes(q);
        const matchesBatch = student.batch?.toLowerCase().includes(q);
        const matchesSourceClassroom = student.classrooms?.some(c => c.name.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesBatch && !matchesSourceClassroom) {
          return false;
        }
      }

      return true;
    });
  }, [availableStudents, sourceClassroomFilter, searchQuery]);

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      const filteredIds = new Set(filteredStudents.map(s => s.id));
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      // Select all filtered
      const newSelected = new Set(selectedStudentIds);
      filteredStudents.forEach(s => newSelected.add(s.id));
      setSelectedStudentIds(Array.from(newSelected));
    }
  };

  const handleToggleStudent = (studentId: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student to assign.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post(`/classrooms/${classroomId}/students/assign`, {
        studentIds: selectedStudentIds,
        batch: assignBatch.trim() || undefined
      });

      onSuccess(res.data.assignedCount || selectedStudentIds.length);
      onClose();
    } catch (err: any) {
      console.error('Failed to assign students:', err);
      setError(err.response?.data?.message || 'Failed to assign students to classroom.');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-ld" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content-ld" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexShrink: 0 }}>
          <div>
            <h3 className="modal-title-ld" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiUserPlus style={{ color: 'var(--light-primary)' }} />
              <span>Assign Students from Other Classrooms</span>
            </h3>
            <p className="modal-subtitle-ld" style={{ marginTop: '4px', marginBottom: 0 }}>
              Enroll students existing in other classrooms or your organization into {classroomName ? <strong>{classroomName}</strong> : 'this classroom'}.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)', padding: '4px' }}
            aria-label="Close modal"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert-ld alert-ld-error" style={{ marginBottom: '14px', flexShrink: 0 }}>
            <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <FiSearch 
              size={15} 
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--light-text-muted)' }} 
            />
            <input
              type="text"
              className="form-input-ld"
              placeholder="Search by name, email, or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '38px', fontSize: '13px' }}
            />
          </div>

          {/* Source Classroom Filter */}
          <div style={{ position: 'relative', flex: '0 0 auto', minWidth: '180px' }}>
            <FiFilter 
              size={14} 
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--light-text-muted)', pointerEvents: 'none' }} 
            />
            <select
              className="form-input-ld"
              value={sourceClassroomFilter}
              onChange={(e) => setSourceClassroomFilter(e.target.value)}
              style={{ paddingLeft: '30px', height: '38px', fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="all">All Other Classrooms ({availableStudents.length})</option>
              {otherClassrooms.map(c => {
                const count = availableStudents.filter(s => s.classrooms?.some(sc => sc.id === c.id)).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({count})
                  </option>
                );
              })}
              <option value="unassigned">
                Unassigned / No Classroom ({availableStudents.filter(s => !s.classrooms || s.classrooms.length === 0).length})
              </option>
            </select>
          </div>
        </div>

        {/* Optional Batch Input Row */}
        <div style={{ marginBottom: '12px', flexShrink: 0, padding: '10px 12px', background: 'var(--light-bg-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--light-border, #e2e8f0)' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--light-text-secondary, #475569)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <FiTag size={13} style={{ color: 'var(--light-primary)' }} />
            <span>Classroom Batch for Assigned Students (Optional)</span>
          </label>
          <input
            type="text"
            className="form-input-ld"
            placeholder="e.g. Batch A, Morning 2026 (Leave blank to keep existing batch)"
            value={assignBatch}
            onChange={(e) => setAssignBatch(e.target.value)}
            style={{ height: '34px', fontSize: '13px' }}
          />
        </div>

        {/* Selection Stats Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', marginBottom: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleToggleSelectAll}
            disabled={filteredStudents.length === 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: filteredStudents.length === 0 ? 'not-allowed' : 'pointer',
              color: 'var(--light-primary)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 4px'
            }}
          >
            {allFilteredSelected ? <FiCheckSquare size={16} /> : <FiSquare size={16} />}
            <span>{allFilteredSelected ? 'Deselect All' : 'Select All'} ({filteredStudents.length})</span>
          </button>

          <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: '500' }}>
            {selectedStudentIds.length} of {availableStudents.length} selected
          </span>
        </div>

        {/* Students List Container */}
        <div 
          style={{ 
            flex: '1 1 auto', 
            overflowY: 'auto', 
            minHeight: '200px', 
            maxHeight: '340px',
            border: '1px solid var(--light-border)', 
            borderRadius: '8px',
            background: '#fff'
          }}
        >
          {loading ? (
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span className="spinner" style={{ width: '28px', height: '28px' }}></span>
              <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>Loading students...</span>
            </div>
          ) : availableStudents.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
              <FiUserPlus size={36} style={{ color: 'var(--light-text-muted)', marginBottom: '10px' }} />
              <h4 style={{ margin: '0 0 6px', color: 'var(--light-text-primary)' }}>No Available Students</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>
                All registered students in your organization are already enrolled in this classroom.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
              <FiSearch size={32} style={{ color: 'var(--light-text-muted)', marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>
                No students match the current search or classroom filter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredStudents.map((stud) => {
                const isSelected = selectedStudentIds.includes(stud.id);
                return (
                  <div
                    key={`assign-stud-${stud.id}`}
                    onClick={() => handleToggleStudent(stud.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--light-border)',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.07)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--light-bg-subtle, #f8fafc)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ color: isSelected ? 'var(--light-primary)' : 'var(--light-text-muted)', display: 'flex', alignItems: 'center' }}>
                      {isSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
                    </div>

                    {/* Avatar */}
                    {stud.profile_url ? (
                      <img 
                        src={stud.profile_url} 
                        alt={stud.name} 
                        className="teacher-avatar-thumb"
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div 
                        className="ld-avatar" 
                        style={{ width: '34px', height: '34px', fontSize: '12px', flexShrink: 0 }}
                      >
                        {getInitials(stud.name)}
                      </div>
                    )}

                    {/* Student Info */}
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--light-text-primary)' }}>
                          {stud.name}
                        </span>
                        {stud.batch && (
                          <span className="badge-ld badge-ld-primary" style={{ fontSize: '11px', padding: '1px 7px' }}>
                            {stud.batch}
                          </span>
                        )}
                        {stud.status === 'pending' && (
                          <span className="badge-ld badge-ld-warning" style={{ fontSize: '11px', padding: '1px 7px' }}>
                            Pending
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--light-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stud.email}
                      </div>

                      {/* Source Classroom Tags */}
                      {stud.classrooms && stud.classrooms.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: 'var(--light-text-muted)' }}>From:</span>
                          {stud.classrooms.map(c => (
                            <span 
                              key={`source-c-${c.id}`} 
                              className="badge-ld" 
                              style={{ 
                                fontSize: '10px', 
                                padding: '1px 6px', 
                                backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                                color: '#4f46e5',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <FiBookOpen size={10} />
                              <span>{c.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--light-border)', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>
            {selectedStudentIds.length > 0 ? (
              <span style={{ color: 'var(--light-primary)', fontWeight: '600' }}>
                {selectedStudentIds.length} student{selectedStudentIds.length > 1 ? 's' : ''} ready to assign
              </span>
            ) : (
              'No students selected'
            )}
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className="btn-ld btn-ld-secondary" 
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn-ld btn-ld-primary"
              onClick={handleSubmit}
              disabled={submitting || selectedStudentIds.length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <FiCheck size={16} />
                  <span>Assign {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length}) Students` : 'Students'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
