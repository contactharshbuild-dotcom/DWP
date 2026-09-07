import React, { useState } from 'react';
import { FiUserPlus, FiUserCheck, FiX, FiUsers, FiAward } from 'react-icons/fi';

interface PendingRequestUser {
  id: number;
  name: string;
  email: string;
  batch?: string | null;
  profile_url?: string | null;
  profileUrl?: string | null;
  role?: string;
}

interface JoinRequestsTabProps {
  user?: { id: number; role: string } | null;
  pendingRequests?: PendingRequestUser[];
  pendingTeachers?: PendingRequestUser[];
  pendingStudents?: PendingRequestUser[];
  onApproveTeacher?: (teacherId: number) => Promise<void>;
  onRejectTeacher?: (teacherId: number, isPending: boolean) => Promise<void>;
  onApproveStudent?: (studentId: number) => Promise<void>;
  onRejectStudent?: (studentId: number) => Promise<void>;
}

export const JoinRequestsTab: React.FC<JoinRequestsTabProps> = ({
  user,
  pendingRequests = [],
  pendingTeachers = [],
  pendingStudents = [],
  onApproveTeacher,
  onRejectTeacher,
  onApproveStudent,
  onRejectStudent
}) => {
  // Support both pendingRequests and pendingTeachers props for teacher requests
  const teachers = pendingTeachers.length > 0 ? pendingTeachers : pendingRequests;
  const students = pendingStudents;
  const totalCount = teachers.length + students.length;

  const [activeFilter, setActiveFilter] = useState<'all' | 'students' | 'teachers'>('all');

  const getInitials = (name?: string) => {
    if (!name) return 'S';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      {/* Header and Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiUserPlus style={{ color: 'var(--light-primary)' }} />
          <span>Join Requests ({totalCount})</span>
        </h3>

        {totalCount > 0 && (
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--light-table-header-bg)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid var(--light-border)',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeFilter === 'all' ? '700' : '500',
                backgroundColor: activeFilter === 'all' ? 'var(--light-card)' : 'transparent',
                color: activeFilter === 'all' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                boxShadow: activeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('students')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeFilter === 'students' ? '700' : '500',
                backgroundColor: activeFilter === 'students' ? 'var(--light-card)' : 'transparent',
                color: activeFilter === 'students' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                boxShadow: activeFilter === 'students' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Students ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('teachers')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeFilter === 'teachers' ? '700' : '500',
                backgroundColor: activeFilter === 'teachers' ? 'var(--light-card)' : 'transparent',
                color: activeFilter === 'teachers' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                boxShadow: activeFilter === 'teachers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Teachers ({teachers.length})
            </button>
          </div>
        )}
      </div>

      {totalCount === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: 'var(--light-card)', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiUserPlus size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4>No pending join requests</h4>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Share the invite link with students or teachers to let them request to join.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Student Join Requests Section */}
          {(activeFilter === 'all' || activeFilter === 'students') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <FiUsers style={{ color: '#d97706' }} size={18} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--light-text-primary)' }}>
                  Student Requests ({students.length})
                </h4>
              </div>

              {students.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--light-card)', borderRadius: '8px', border: '1px solid var(--light-border)', color: 'var(--light-text-secondary)', fontSize: '13px' }}>
                  No pending student join requests.
                </div>
              ) : (
                <div className="ld-table-container">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Batch</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((stud) => (
                        <tr key={`student-request-${stud.id}`}>
                          <td style={{ fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                            </div>
                          </td>
                          <td>{stud.email}</td>
                          <td>
                            {stud.batch ? (
                              <span className="badge-ld badge-ld-primary">{stud.batch}</span>
                            ) : (
                              <span style={{ color: 'var(--light-text-muted)', fontStyle: 'italic', fontSize: '13px' }}>No Batch</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              {onApproveStudent && (
                                <button
                                  className="btn-ld btn-ld-primary btn-ld-small"
                                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                                  onClick={() => onApproveStudent(stud.id)}
                                >
                                  <FiUserCheck size={13} />
                                  <span>Approve</span>
                                </button>
                              )}
                              {onRejectStudent && (
                                <button
                                  className="btn-ld btn-ld-danger btn-ld-small"
                                  onClick={() => onRejectStudent(stud.id)}
                                >
                                  <FiX size={13} />
                                  <span>Reject</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Teacher Join Requests Section */}
          {(activeFilter === 'all' || activeFilter === 'teachers') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <FiAward style={{ color: 'var(--light-primary)' }} size={18} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--light-text-primary)' }}>
                  Teacher Requests ({teachers.length})
                </h4>
              </div>

              {teachers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--light-card)', borderRadius: '8px', border: '1px solid var(--light-border)', color: 'var(--light-text-secondary)', fontSize: '13px' }}>
                  No pending teacher join requests.
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
                      {teachers.map((request) => (
                        <tr key={`teacher-request-${request.id}`}>
                          <td style={{ fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="ld-avatar" style={{ width: '32px', height: '32px', fontSize: '12px', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
                                {getInitials(request.name)}
                              </div>
                              <span>{request.name}</span>
                            </div>
                          </td>
                          <td>{request.email}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              {user?.role === 'admin' ? (
                                <>
                                  {onApproveTeacher && (
                                    <button
                                      className="btn-ld btn-ld-primary btn-ld-small"
                                      style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                                      onClick={() => onApproveTeacher(request.id)}
                                    >
                                      <FiUserCheck size={13} />
                                      <span>Approve</span>
                                    </button>
                                  )}
                                  {onRejectTeacher && (
                                    <button
                                      className="btn-ld btn-ld-danger btn-ld-small"
                                      onClick={() => onRejectTeacher(request.id, true)}
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
