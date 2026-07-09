import React from 'react';
import { FiPlus, FiFile } from 'react-icons/fi';
import type { PracticalExam, PracticalSubmission } from '../ClassroomDetails';

interface PracticalsTabProps {
  user: { id: number; role: string } | null;
  practicalsLoading: boolean;
  practicals: PracticalExam[];
  onOpenCreatePractical: () => void;
  onStartSubmit: (prac: PracticalExam) => void;
  onViewGrade: (submission: PracticalSubmission) => void;
  onOpenGrading: (prac: PracticalExam) => void;
  onOpenAssignModal: (prac: PracticalExam) => void;
}

export const PracticalsTab: React.FC<PracticalsTabProps> = ({
  user,
  practicalsLoading,
  practicals,
  onOpenCreatePractical,
  onStartSubmit,
  onViewGrade,
  onOpenGrading,
  onOpenAssignModal
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      {/* Header actions */}
      {user?.role !== 'student' && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button 
            className="btn-ld btn-ld-primary" 
            onClick={onOpenCreatePractical}
          >
            <FiPlus size={16} />
            <span>Create Practical Exam</span>
          </button>
        </div>
      )}

      {practicalsLoading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '30px', height: '30px' }}></span>
        </div>
      ) : practicals.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiFile size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4>No practical exams created yet</h4>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Assign laboratory work, SQL tests, or coding challenges here.</p>
        </div>
      ) : (
        <div className="ld-table-container">
          <table className="ld-table">
            <thead>
              <tr>
                <th>Practical Task</th>
                <th>Due Date</th>
                <th>Max Marks</th>
                <th>Submission / Grade</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {practicals.map((prac) => {
                const now = new Date();
                const due = new Date(prac.due_date);
                const isOverdue = now > due;

                const submission = prac.submissions && prac.submissions[0];
                const hasSubmitted = !!submission;

                return (
                  <tr key={prac.id}>
                    <td style={{ fontWeight: '600' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{prac.title}</span>
                        <span style={{ fontSize: '12.5px', color: 'var(--light-text-secondary)', fontWeight: '500', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prac.instructions}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: isOverdue && !hasSubmitted ? '#ef4444' : 'var(--light-text)' }}>
                      {formatDate(prac.due_date)}
                    </td>
                    <td>{prac.total_marks} Marks</td>
                    <td>
                      {hasSubmitted ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="badge-ld badge-ld-success" style={{ width: 'fit-content' }}>Submitted</span>
                          {submission.graded ? (
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--light-success)' }}>
                              Grade: {submission.total_grade} / {prac.total_marks}
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontStyle: 'italic' }}>Pending Grade</span>
                          )}
                        </div>
                      ) : isOverdue ? (
                        <span className="badge-ld badge-ld-danger">Missing</span>
                      ) : (
                        <span className="badge-ld badge-ld-primary">Assigned</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {user?.role === 'student' && (
                          <button 
                            className="btn-ld btn-ld-primary"
                            onClick={() => onStartSubmit(prac)}
                          >
                            {hasSubmitted ? 'Resubmit' : 'Submit task'}
                          </button>
                        )}

                        {hasSubmitted && submission.graded && (
                          <button 
                            className="btn-ld btn-ld-secondary btn-ld-small"
                            onClick={() => onViewGrade(submission)}
                          >
                            View Grade
                          </button>
                        )}

                        {user?.role !== 'student' && (
                          <>
                            <button 
                              className="btn-ld btn-ld-secondary"
                              onClick={() => onOpenGrading(prac)}
                            >
                              Grade submissions
                            </button>
                            <button 
                              className="btn-ld btn-ld-primary btn-ld-small"
                              onClick={() => onOpenAssignModal(prac)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Assign</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
