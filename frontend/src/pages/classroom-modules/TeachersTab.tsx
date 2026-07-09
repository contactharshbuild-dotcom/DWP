import React from 'react';
import { FiUsers, FiUserCheck, FiTrash2 } from 'react-icons/fi';

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
  onUpgradeTeacher: (teacherId: number) => Promise<void>;
  onRejectTeacher: (teacherId: number, isPending: boolean) => Promise<void>;
}

export const TeachersTab: React.FC<TeachersTabProps> = ({
  activeTeachers,
  user,
  onUpgradeTeacher,
  onRejectTeacher
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiUsers style={{ color: 'var(--light-primary)' }} />
          <span>Active Teachers</span>
        </h3>
      </div>

      {activeTeachers.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiUsers size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4>No active teachers found</h4>
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
                    {teacher.ClassroomTeacher?.role === 'teacher' ? (
                      <span className="badge-ld badge-ld-success">Teacher</span>
                    ) : (
                      <span className="badge-ld badge-ld-secondary">Co-Teacher</span>
                    )}
                  </td>
                  {user?.role === 'admin' && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {teacher.ClassroomTeacher?.role === 'co-teacher' && (
                          <button
                            className="btn-ld btn-ld-primary btn-ld-small"
                            onClick={() => onUpgradeTeacher(teacher.id)}
                          >
                            <FiUserCheck size={13} />
                            <span>Upgrade to Teacher</span>
                          </button>
                        )}
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
