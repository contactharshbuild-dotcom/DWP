import React from 'react';
import { FiUsers, FiCopy, FiUserPlus, FiUserCheck, FiX, FiTrash2 } from 'react-icons/fi';

interface StudentUser {
  id: number;
  name: string;
  email: string;
  batch?: string | null;
  status?: string;
  invite_token?: string | null;
}

interface StudentsTabProps {
  activeStudents: StudentUser[];
  pendingStudents: StudentUser[];
  user: { id: number; role: string } | null;
  classroomId: number | undefined;
  onOpenInviteOneStudent: () => void;
  onApproveStudentRequest: (studentId: number) => Promise<void>;
  onRejectStudentRequest: (studentId: number) => Promise<void>;
  onRemoveStudent: (studentId: number) => Promise<void>;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  activeStudents,
  pendingStudents,
  user,
  classroomId,
  onOpenInviteOneStudent,
  onApproveStudentRequest,
  onRejectStudentRequest,
  onRemoveStudent
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiUsers style={{ color: 'var(--light-primary)' }} />
          <span>Classroom Students</span>
        </h3>
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-ld btn-ld-secondary"
              onClick={() => {
                if (!classroomId) return;
                const link = `http://localhost:5173/join-classroom/${classroomId}?role=student`;
                copyToClipboard(link);
                alert('Copied student registration link to clipboard!');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FiCopy size={16} />
              <span>Copy Student Invite Link</span>
            </button>
            <button 
              className="btn-ld btn-ld-primary"
              onClick={onOpenInviteOneStudent}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FiUserPlus size={16} />
              <span>Invite One Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Pending Student Join Requests Section */}
      {pendingStudents.length > 0 && (
        <div style={{ marginBottom: '32px', backgroundColor: 'rgba(245, 158, 11, 0.03)', border: '1px dashed rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontWeight: '700', color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiUserPlus size={18} />
            <span>Pending Student Join Requests ({pendingStudents.length})</span>
          </h4>
          <div className="ld-table-container">
            <table className="ld-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Batch</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.map((stud) => (
                  <tr key={`pending-student-${stud.id}`}>
                    <td style={{ fontWeight: '600' }}>{stud.name}</td>
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
                        <button
                          className="btn-ld btn-ld-primary btn-ld-small"
                          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                          onClick={() => onApproveStudentRequest(stud.id)}
                        >
                          <FiUserCheck size={13} />
                          <span>Approve</span>
                        </button>
                        <button
                          className="btn-ld btn-ld-danger btn-ld-small"
                          onClick={() => onRejectStudentRequest(stud.id)}
                        >
                          <FiX size={13} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeStudents.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiUsers size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4>No active students found</h4>
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
                  <td style={{ fontWeight: '600' }}>{stud.name}</td>
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
                    ) : (
                      <span className="badge-ld badge-ld-success">Active</span>
                    )}
                  </td>
                  {(user?.role === 'admin' || user?.role === 'teacher') && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {stud.status === 'pending' && stud.invite_token && (
                          <button
                            className="btn-ld btn-ld-secondary btn-ld-small"
                            onClick={() => {
                              const link = `http://localhost:5173/accept-invite?token=${stud.invite_token}`;
                              copyToClipboard(link);
                              alert('Copied invite link to clipboard!');
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FiCopy size={12} />
                            <span>Copy Link</span>
                          </button>
                        )}
                        <button
                          className="btn-ld btn-ld-danger btn-ld-small"
                          onClick={() => onRemoveStudent(stud.id)}
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
