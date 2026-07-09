import React from 'react';
import { FiUserPlus, FiUserCheck, FiX } from 'react-icons/fi';

interface PendingRequestUser {
  id: number;
  name: string;
  email: string;
}

interface JoinRequestsTabProps {
  pendingRequests: PendingRequestUser[];
  onApproveTeacher: (teacherId: number) => Promise<void>;
  onRejectTeacher: (teacherId: number, isPending: boolean) => Promise<void>;
}

export const JoinRequestsTab: React.FC<JoinRequestsTabProps> = ({
  pendingRequests,
  onApproveTeacher,
  onRejectTeacher
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiUserPlus style={{ color: 'var(--light-primary)' }} />
          <span>Join Requests</span>
        </h3>
      </div>

      {pendingRequests.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiUserPlus size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4>No pending join requests</h4>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Share the invite link with teachers to let them request to join.</p>
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
              {pendingRequests.map((request) => (
                <tr key={`request-${request.id}`}>
                  <td style={{ fontWeight: '600' }}>{request.name}</td>
                  <td>{request.email}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        className="btn-ld btn-ld-primary btn-ld-small"
                        style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        onClick={() => onApproveTeacher(request.id)}
                      >
                        <FiUserCheck size={13} />
                        <span>Approve</span>
                      </button>
                      <button
                        className="btn-ld btn-ld-danger btn-ld-small"
                        onClick={() => onRejectTeacher(request.id, true)}
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
      )}
    </div>
  );
};
