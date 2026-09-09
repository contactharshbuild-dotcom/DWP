import React, { useState } from 'react';
import { FiUsers, FiTrash2, FiUserPlus, FiRepeat, FiCopy, FiUserCheck, FiX } from 'react-icons/fi';

interface TeacherUser {
  id: number;
  name: string;
  email: string;
  ClassroomTeacher?: {
    role: string;
    status: string;
  };
}

interface TeachersTabProps {
  activeTeachers: TeacherUser[];
  pendingTeachers?: TeacherUser[];
  user: { id: number; role: string } | null;
  classroomId?: number;
  onUpgradeTeacher?: (teacherId: number) => Promise<void>;
  onToggleTeacherRole?: (teacherId: number, currentRole?: string) => Promise<void>;
  onRejectTeacher: (teacherId: number, isPending: boolean) => Promise<void>;
  onApproveTeacher?: (teacherId: number) => Promise<void>;
  onOpenAssignModal?: () => void;
}

export const TeachersTab: React.FC<TeachersTabProps> = ({
  activeTeachers,
  pendingTeachers = [],
  user,
  classroomId,
  onUpgradeTeacher,
  onToggleTeacherRole,
  onRejectTeacher,
  onApproveTeacher,
  onOpenAssignModal
}) => {
  const [subTab, setSubTab] = useState<'active' | 'requests'>('active');

  const handleRoleToggle = (teacherId: number, currentRole?: string) => {
    if (onToggleTeacherRole) {
      onToggleTeacherRole(teacherId, currentRole);
    } else if (onUpgradeTeacher) {
      onUpgradeTeacher(teacherId);
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

  const handleCopyTeacherInviteLink = () => {
    if (!classroomId) return;
    const link = `${window.location.origin}/join-classroom/${classroomId}?role=teacher`;
    navigator.clipboard.writeText(link);
    alert('Copied teacher registration link to clipboard!');
  };

  return (
    <div>
      {/* Sub-Tabs & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Two-Button Sub-tab Segmented Control */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'var(--light-table-header-bg)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--light-border)',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setSubTab('active')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: subTab === 'active' ? '700' : '500',
              backgroundColor: subTab === 'active' ? 'var(--light-card)' : 'transparent',
              color: subTab === 'active' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
              boxShadow: subTab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FiUsers size={15} />
            <span>Active Teachers ({activeTeachers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('requests')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: subTab === 'requests' ? '700' : '500',
              backgroundColor: subTab === 'requests' ? 'var(--light-card)' : 'transparent',
              color: subTab === 'requests' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
              boxShadow: subTab === 'requests' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FiUserPlus size={15} />
            <span>Teacher Requests</span>
            {pendingTeachers.length > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '99px',
                fontWeight: '700',
                lineHeight: 1
              }}>
                {pendingTeachers.length}
              </span>
            )}
          </button>
        </div>

        {/* Right action button */}
        {subTab === 'active' ? (
          user?.role === 'admin' && onOpenAssignModal && (
            <button 
              className="btn-ld btn-ld-primary"
              onClick={onOpenAssignModal}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FiUserPlus size={16} />
              <span>Assign Teacher</span>
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn-ld btn-ld-secondary"
            onClick={handleCopyTeacherInviteLink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FiCopy size={16} />
            <span>Copy Teacher Link</span>
          </button>
        )}
      </div>

      {subTab === 'active' ? (
        activeTeachers.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: 'var(--light-card)', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
            <FiUsers size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
            <h4 style={{ color: 'var(--light-text-primary)' }}>No active teachers found</h4>
          </div>
        ) : (
          <div className="ld-table-container">
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  {user?.role === 'admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {activeTeachers.map((teacher) => (
                  <tr key={`teacher-${teacher.id}`}>
                    <td style={{ fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="ld-avatar" style={{ width: '32px', height: '32px', fontSize: '12px', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
                          {getInitials(teacher.name)}
                        </div>
                        <span>{teacher.name}</span>
                      </div>
                    </td>
                    <td>{teacher.email}</td>
                    <td>
                      {user?.role === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => handleRoleToggle(teacher.id, teacher.ClassroomTeacher?.role)}
                          title={`Click to switch role to ${teacher.ClassroomTeacher?.role === 'teacher' ? 'Co-Teacher' : 'Teacher'}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: teacher.ClassroomTeacher?.role === 'teacher' 
                              ? '1px solid rgba(16, 185, 129, 0.4)' 
                              : '1px solid var(--light-border)',
                            backgroundColor: teacher.ClassroomTeacher?.role === 'teacher'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'var(--light-table-header-bg)',
                            color: teacher.ClassroomTeacher?.role === 'teacher'
                              ? '#10b981'
                              : 'var(--light-text-secondary)',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            outline: 'none'
                          }}
                        >
                          <span style={{
                            display: 'inline-block',
                            width: '28px',
                            height: '16px',
                            borderRadius: '10px',
                            backgroundColor: teacher.ClassroomTeacher?.role === 'teacher' ? '#10b981' : 'var(--light-border-hover)',
                            position: 'relative',
                            transition: 'background-color 0.2s ease'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: '#ffffff',
                              position: 'absolute',
                              top: '2px',
                              left: teacher.ClassroomTeacher?.role === 'teacher' ? '14px' : '2px',
                              transition: 'left 0.2s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
                            }} />
                          </span>
                          <span>{teacher.ClassroomTeacher?.role === 'teacher' ? 'Teacher' : 'Co-Teacher'}</span>
                        </button>
                      ) : (
                        teacher.ClassroomTeacher?.role === 'teacher' ? (
                          <span className="badge-ld badge-ld-success">Teacher</span>
                        ) : (
                          <span className="badge-ld badge-ld-secondary">Co-Teacher</span>
                        )
                      )}
                    </td>
                    {user?.role === 'admin' && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            className={`btn-ld btn-ld-small ${teacher.ClassroomTeacher?.role === 'teacher' ? 'btn-ld-secondary' : 'btn-ld-primary'}`}
                            onClick={() => handleRoleToggle(teacher.id, teacher.ClassroomTeacher?.role)}
                            title={`Switch to ${teacher.ClassroomTeacher?.role === 'teacher' ? 'Co-Teacher' : 'Teacher'}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <FiRepeat size={13} />
                            <span>{teacher.ClassroomTeacher?.role === 'teacher' ? 'Demote to Co-Teacher' : 'Upgrade to Teacher'}</span>
                          </button>
                          {teacher.id !== user?.id && (
                            <button
                              className="btn-ld btn-ld-danger btn-ld-small"
                              onClick={() => onRejectTeacher(teacher.id, false)}
                            >
                              <FiTrash2 size={13} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Teacher Join Requests Sub-Tab */
        pendingTeachers.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: 'var(--light-card)', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
            <FiUserPlus size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
            <h4 style={{ color: 'var(--light-text-primary)' }}>No pending teacher join requests</h4>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Teachers can request to join using the classroom link or code.</p>
            {classroomId && (
              <button
                type="button"
                className="btn-ld btn-ld-primary btn-ld-small"
                onClick={handleCopyTeacherInviteLink}
                style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FiCopy size={14} />
                <span>Copy Teacher Registration Link</span>
              </button>
            )}
          </div>
        ) : (
          <div className="ld-table-container">
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTeachers.map((teacher) => (
                  <tr key={`teacher-request-${teacher.id}`}>
                    <td style={{ fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="ld-avatar" style={{ width: '32px', height: '32px', fontSize: '12px', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
                          {getInitials(teacher.name)}
                        </div>
                        <span>{teacher.name}</span>
                      </div>
                    </td>
                    <td>{teacher.email}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {user?.role === 'admin' ? (
                          <>
                            {onApproveTeacher && (
                              <button
                                type="button"
                                className="btn-ld btn-ld-primary btn-ld-small"
                                style={{ backgroundColor: '#10b981', borderColor: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => onApproveTeacher(teacher.id)}
                              >
                                <FiUserCheck size={13} />
                                <span>Approve</span>
                              </button>
                            )}
                            {onRejectTeacher && (
                              <button
                                type="button"
                                className="btn-ld btn-ld-danger btn-ld-small"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => onRejectTeacher(teacher.id, true)}
                              >
                                <FiX size={13} />
                                <span>Reject</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--light-text-muted)', fontStyle: 'italic', padding: '4px 8px' }}>
                            Admin approval required
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};
