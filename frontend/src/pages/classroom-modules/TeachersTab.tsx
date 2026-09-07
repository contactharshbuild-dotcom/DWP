import React from 'react';
import { FiUsers, FiTrash2, FiUserPlus, FiRepeat } from 'react-icons/fi';

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
  user: { id: number; role: string } | null;
  onUpgradeTeacher?: (teacherId: number) => Promise<void>;
  onToggleTeacherRole?: (teacherId: number, currentRole?: string) => Promise<void>;
  onRejectTeacher: (teacherId: number, isPending: boolean) => Promise<void>;
  onOpenAssignModal?: () => void;
}

export const TeachersTab: React.FC<TeachersTabProps> = ({
  activeTeachers,
  user,
  onUpgradeTeacher,
  onToggleTeacherRole,
  onRejectTeacher,
  onOpenAssignModal
}) => {
  const handleRoleToggle = (teacherId: number, currentRole?: string) => {
    if (onToggleTeacherRole) {
      onToggleTeacherRole(teacherId, currentRole);
    } else if (onUpgradeTeacher) {
      onUpgradeTeacher(teacherId);
    }
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiUsers style={{ color: 'var(--light-primary)' }} />
          <span>Active Teachers</span>
        </h3>

        {user?.role === 'admin' && onOpenAssignModal && (
          <button 
            className="btn-ld btn-ld-primary"
            onClick={onOpenAssignModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiUserPlus size={16} />
            <span>Assign Teacher</span>
          </button>
        )}
      </div>

      {activeTeachers.length === 0 ? (
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
                  <td style={{ fontWeight: '600' }}>{teacher.name}</td>
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
                        {/* Toggle switch track & thumb */}
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
      )}
    </div>
  );
};
