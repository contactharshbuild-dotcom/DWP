import React from 'react';
import { FiClock } from 'react-icons/fi';

interface UserItem {
  id: number;
  name: string;
  email: string;
}

interface AssignContentModalProps {
  show: boolean;
  onClose: () => void;
  assignTargetType: 'material' | 'folder' | 'mcq' | 'practical' | null;
  assignBatches: string;
  setAssignBatches: (value: string) => void;
  assignToSpecificStudents: boolean;
  setAssignToSpecificStudents: (value: boolean) => void;
  activeStudents: UserItem[];
  assignSelectedStudentIds: number[];
  setAssignSelectedStudentIds: React.Dispatch<React.SetStateAction<number[]>>;
  
  // Student visibility mode
  assignVisibility?: 'all_students' | 'specific_students' | 'hidden';
  setAssignVisibility?: (value: 'all_students' | 'specific_students' | 'hidden') => void;

  // Teacher assignment props
  activeTeachers?: UserItem[];
  assignToSpecificTeachers?: boolean;
  setAssignToSpecificTeachers?: (value: boolean) => void;
  assignSelectedTeacherIds?: number[];
  setAssignSelectedTeacherIds?: React.Dispatch<React.SetStateAction<number[]>>;

  // Date/Time Scheduling props
  scheduledAt?: string;
  setScheduledAt?: (value: string) => void;
  expiryAt?: string;
  setExpiryAt?: (value: string) => void;

  assignSaving: boolean;
  onAssignSubmit: (e: React.FormEvent) => void;
}

export const AssignContentModal: React.FC<AssignContentModalProps> = ({
  show,
  onClose,
  assignTargetType,
  assignBatches,
  setAssignBatches,
  assignToSpecificStudents,
  setAssignToSpecificStudents,
  activeStudents,
  assignSelectedStudentIds,
  setAssignSelectedStudentIds,
  assignVisibility = 'hidden',
  setAssignVisibility,
  activeTeachers = [],
  assignToSpecificTeachers = false,
  setAssignToSpecificTeachers,
  assignSelectedTeacherIds = [],
  setAssignSelectedTeacherIds,
  scheduledAt = '',
  setScheduledAt,
  expiryAt = '',
  setExpiryAt,
  assignSaving,
  onAssignSubmit
}) => {
  if (!show) return null;

  const targetTitle = assignTargetType === 'folder' 
    ? 'Folder' 
    : assignTargetType === 'material' 
      ? 'Study Material' 
      : assignTargetType === 'mcq' 
        ? 'MCQ Exam' 
        : 'Practical Exam';

  const isStudentSpecific = assignVisibility === 'specific_students' || (setAssignVisibility === undefined && assignToSpecificStudents);

  return (
    <div className="modal-overlay-ld" onClick={onClose}>
      <div 
        className="modal-content-ld" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '540px', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <h3 className="modal-title-ld" style={{ textTransform: 'capitalize' }}>
          Assign {targetTitle}
        </h3>
        <p className="modal-subtitle-ld">Configure student/teacher access and schedule publishing time.</p>

        <form onSubmit={onAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Student Access Selection */}
          {setAssignVisibility ? (
            <div className="form-group-ld">
              <label className="form-label-ld">Student Access Option</label>
              <select
                className="form-input-ld"
                value={assignVisibility}
                onChange={(e) => {
                  const val = e.target.value as 'all_students' | 'specific_students' | 'hidden';
                  setAssignVisibility(val);
                  setAssignToSpecificStudents(val === 'specific_students');
                }}
              >
                <option value="hidden">🔒 Unassigned / Hidden (Default)</option>
                <option value="all_students">👥 Assign to All Students</option>
                <option value="specific_students">🎯 Assign to Specific Students</option>
              </select>
            </div>
          ) : (
            <div className="form-group-ld">
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
                <input 
                  type="checkbox"
                  checked={assignToSpecificStudents}
                  onChange={(e) => {
                    setAssignToSpecificStudents(e.target.checked);
                  }}
                />
                <span>Assign to specific individual students</span>
              </label>
            </div>
          )}

          {/* Students Checkbox List */}
          {isStudentSpecific && (
            <div className="form-group-ld">
              <label className="form-label-ld" style={{ fontSize: '13px' }}>Select Individual Students *</label>
              <div style={{
                maxHeight: '160px',
                overflowY: 'auto',
                border: '1px solid var(--light-border)',
                borderRadius: '8px',
                padding: '10px',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {activeStudents.length === 0 ? (
                  <span style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>No active students in classroom</span>
                ) : (
                  activeStudents.map(student => (
                    <label key={`assign-modal-student-${student.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                      <input 
                        type="checkbox" 
                        checked={assignSelectedStudentIds.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignSelectedStudentIds(prev => [...prev, student.id]);
                          } else {
                            setAssignSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                      />
                      <span>{student.name} ({student.email})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Teachers Checkbox List */}
          {setAssignToSpecificTeachers && setAssignSelectedTeacherIds && (
            <div className="form-group-ld">
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
                <input 
                  type="checkbox"
                  checked={assignToSpecificTeachers}
                  onChange={(e) => {
                    setAssignToSpecificTeachers(e.target.checked);
                  }}
                />
                <span>Assign / Restrict to specific teachers / co-teachers</span>
              </label>
              {assignToSpecificTeachers && (
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  border: '1px solid var(--light-border)',
                  borderRadius: '8px',
                  padding: '10px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {activeTeachers.length === 0 ? (
                    <span style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>No co-teachers in classroom</span>
                  ) : (
                    activeTeachers.map(teacher => (
                      <label key={`assign-modal-teacher-${teacher.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                        <input 
                          type="checkbox" 
                          checked={assignSelectedTeacherIds.includes(teacher.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignSelectedTeacherIds(prev => [...prev, teacher.id]);
                            } else {
                              setAssignSelectedTeacherIds(prev => prev.filter(id => id !== teacher.id));
                            }
                          }}
                        />
                        <span>{teacher.name} ({teacher.email})</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Date & Time Scheduling */}
          {(setScheduledAt || setExpiryAt) && (
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                <FiClock size={16} style={{ color: 'var(--light-primary)' }} />
                <span>Date & Time Schedule</span>
              </div>

              {setScheduledAt && (
                <div className="form-group-ld" style={{ margin: 0 }}>
                  <label className="form-label-ld" style={{ fontSize: '12px' }}>
                    Publish Start Date & Time (Leave empty to publish immediately upon saving assignment)
                  </label>
                  <input 
                    type="datetime-local" 
                    className="form-input-ld"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              )}

              {setExpiryAt && (
                <div className="form-group-ld" style={{ margin: 0 }}>
                  <label className="form-label-ld" style={{ fontSize: '12px' }}>
                    Access Expiration Date & Time (Optional)
                  </label>
                  <input 
                    type="datetime-local" 
                    className="form-input-ld"
                    value={expiryAt}
                    onChange={(e) => setExpiryAt(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" className="btn-ld btn-ld-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-ld btn-ld-primary" disabled={assignSaving}>
              {assignSaving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
