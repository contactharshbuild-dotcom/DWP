import React, { useState, useEffect, useRef } from 'react';
import { FiUsers, FiCopy, FiUserPlus, FiUserCheck, FiX, FiTrash2, FiSlash, FiCheckCircle, FiChevronDown } from 'react-icons/fi';

interface StudentUser {
  id: number;
  name: string;
  email: string;
  batch?: string | null;
  status?: string;
  invite_token?: string | null;
  profile_url?: string | null;
  profileUrl?: string | null;
}

interface StudentsTabProps {
  activeStudents: StudentUser[];
  pendingStudents?: StudentUser[];
  user: { id: number; role: string } | null;
  classroomId: number | undefined;
  onOpenInviteOneStudent: () => void;
  onOpenAssignExistingStudents?: () => void;
  onApproveStudentRequest?: (studentId: number) => Promise<void>;
  onRejectStudentRequest?: (studentId: number) => Promise<void>;
  onRemoveStudent: (studentId: number) => Promise<void>;
  onToggleSuspendStudent?: (studentId: number, currentStatus?: string) => Promise<void>;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  activeStudents,
  user,
  classroomId,
  onOpenInviteOneStudent,
  onOpenAssignExistingStudents,
  onRemoveStudent,
  onToggleSuspendStudent
}) => {
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleCopyInviteLink = () => {
    if (!classroomId) return;
    const link = `${window.location.origin}/join-classroom/${classroomId}?role=student`;
    navigator.clipboard.writeText(link);
    setIsDropdownOpen(false);
    alert('Copied student registration link to clipboard!');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiUsers style={{ color: 'var(--light-primary)' }} />
          <span>Active Students ({activeStudents.length})</span>
        </h3>
        {user?.role !== 'student' && (
          <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              type="button"
              className="btn-ld btn-ld-primary" 
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <FiUserPlus size={16} />
              <span>+ Add Student</span>
              <FiChevronDown
                size={16}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '280px',
                  backgroundColor: 'var(--light-card, #fff)',
                  border: '1px solid var(--light-border, #e2e8f0)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '6px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {/* 1. Invite One Student */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenInviteOneStudent();
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <FiUserPlus size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--light-text-primary)', display: 'block' }}>
                      Invite One Student
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--light-text-secondary)', display: 'block' }}>
                      Send invite with name and email
                    </span>
                  </div>
                </button>

                {/* 2. Assign from Other Classroom */}
                {onOpenAssignExistingStudents && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAssignExistingStudents();
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <FiUserCheck size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--light-text-primary)', display: 'block' }}>
                        Assign from Other Classroom
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--light-text-secondary)', display: 'block' }}>
                        Add students already in organization
                      </span>
                    </div>
                  </button>
                )}

                {/* 3. Copy Student Invite Link */}
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <FiCopy size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--light-text-primary)', display: 'block' }}>
                      Copy Student Invite Link
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--light-text-secondary)', display: 'block' }}>
                      Share link for self-registration
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {activeStudents.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: 'var(--light-card)', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiUsers size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4 style={{ color: 'var(--light-text-primary)' }}>No active students found</h4>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Invite students to join your classroom batches.</p>
        </div>
      ) : (
        <div className="ld-table-container">
          <table className="ld-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Batch</th>
                <th>Status</th>
                {(user?.role === 'admin' || user?.role === 'teacher') && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {activeStudents.map((stud) => (
                <tr key={`student-${stud.id}`}>
                  <td style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {stud.profile_url || stud.profileUrl ? (
                      <img 
                        src={stud.profile_url || stud.profileUrl || ''} 
                        alt={stud.name} 
                        className="teacher-avatar-thumb"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="ld-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                        {getInitials(stud.name)}
                      </div>
                    )}
                    <span>{stud.name}</span>
                  </td>
                  <td>{stud.email}</td>
                  <td>
                    {stud.batch ? (
                      <span className="badge-ld badge-ld-primary">{stud.batch}</span>
                    ) : (
                      <span style={{ color: 'var(--light-text-muted)', fontStyle: 'italic', fontSize: '13px' }}>No Batch</span>
                    )}
                  </td>
                  <td>
                    {stud.status === 'pending' ? (
                      <span className="badge-ld badge-ld-warning">Pending Invite</span>
                    ) : stud.status === 'suspended' ? (
                      <span className="badge-ld" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#ef4444', border: '1px solid rgba(220, 38, 38, 0.3)' }}>Suspended</span>
                    ) : (
                      <span className="badge-ld badge-ld-success">Active</span>
                    )}
                  </td>
                  {(user?.role === 'admin' || user?.role === 'teacher') && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {onToggleSuspendStudent && (
                          stud.status === 'suspended' ? (
                            <button
                              className="btn-ld btn-ld-secondary btn-ld-small"
                              onClick={() => onToggleSuspendStudent(stud.id, stud.status)}
                              title="Activate student login"
                              style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
                            >
                              <FiCheckCircle size={13} />
                              <span>Activate</span>
                            </button>
                          ) : (
                            <button
                              className="btn-ld btn-ld-secondary btn-ld-small"
                              onClick={() => onToggleSuspendStudent(stud.id, stud.status)}
                              title="Suspend student login access"
                              style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
                            >
                              <FiSlash size={13} />
                              <span>Suspend</span>
                            </button>
                          )
                        )}
                        <button
                          className="btn-ld btn-ld-danger btn-ld-small"
                          onClick={() => onRemoveStudent(stud.id)}
                          title="Remove student and delete user account"
                        >
                          <FiTrash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
