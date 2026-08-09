import React from 'react';
import { FiPlus, FiBookOpen, FiAward, FiTrendingUp } from 'react-icons/fi';
import type { MCQTest } from '../ClassroomDetails';

interface McqExamsTabProps {
  user: { id: number; role: string } | null;
  mcqLoading: boolean;
  mcqTests: MCQTest[];
  onOpenCreateMcqTest: () => void;
  onOpenQuestionBank: () => void;
  onStartAttempt: (test: MCQTest) => void;
  onViewReport: (attemptId: number) => void;
  onPreviewTest: (test: MCQTest) => void;
  onCloneTest: (testId: number) => Promise<void>;
  onOpenAnalytics: (testId: number) => void;
  onOpenAssignModal: (test: MCQTest) => void;
}

export const McqExamsTab: React.FC<McqExamsTabProps> = ({
  user,
  mcqLoading,
  mcqTests,
  onOpenCreateMcqTest,
  onOpenQuestionBank,
  onStartAttempt,
  onViewReport,
  onPreviewTest,
  onCloneTest,
  onOpenAnalytics,
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
            onClick={onOpenCreateMcqTest}
          >
            <FiPlus size={16} />
            <span>Create MCQ Test</span>
          </button>
          <button 
            className="btn-ld btn-ld-secondary" 
            onClick={onOpenQuestionBank}
          >
            <FiBookOpen size={16} />
            <span>Question Bank</span>
          </button>
        </div>
      )}

      {mcqLoading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '30px', height: '30px' }}></span>
        </div>
      ) : mcqTests.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiAward size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4>No examinations scheduled yet</h4>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Schedule module exams or session quizzes for this classroom.</p>
        </div>
      ) : (
        /* Group exams by test_type (Session Quiz vs Module Exams) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {(['session', 'module'] as const).map((typeKey) => {
            const typedTests = mcqTests.filter(t => t.test_type === typeKey);
            if (typedTests.length === 0) return null;

            return (
              <div key={typeKey}>
                <h3 style={{ textTransform: 'capitalize', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid var(--light-border)', paddingBottom: '8px' }}>
                  <FiTrendingUp style={{ color: 'var(--light-primary)' }} />
                  <span>{typeKey === 'session' ? 'Session-wise MCQ Tests' : 'Module MCQ Examinations'}</span>
                </h3>

                <div className="ld-table-container">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Exam Title</th>
                        <th>Active Window</th>
                        <th>Configs</th>
                        <th>Status / Grade</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typedTests.map((test) => {
                        const now = new Date();
                        const start = new Date(test.start_window);
                        const end = new Date(test.end_window);
                        const isActive = now >= start && now <= end;
                        const isExpired = now > end;
                        const isFuture = now < start;

                        // Check if user has attempt
                        const attempt = test.attempts && test.attempts[0];
                        const hasAttempt = !!attempt;

                        return (
                          <tr key={test.id}>
                            <td style={{ fontWeight: '600' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{test.title}</span>
                                <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: '500' }}>
                                  {test.total_questions} Questions • {test.time_limit} Mins
                                </span>
                              </div>
                            </td>
                            <td style={{ fontSize: '13px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>Start: {formatDate(test.start_window)}</span>
                                <span>End: {formatDate(test.end_window)}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {test.security_force_fullscreen && (
                                  <span className="badge-ld badge-ld-danger" style={{ fontSize: '10px' }}>Full-Screen</span>
                                )}
                                {test.security_tab_switch_behavior !== 'warning' && (
                                  <span className="badge-ld badge-ld-warning" style={{ fontSize: '10px' }}>Tab Monitor</span>
                                )}
                              </div>
                            </td>
                            <td>
                              {hasAttempt ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span className="badge-ld badge-ld-success" style={{ width: 'fit-content' }}>Submitted</span>
                                  {test.show_result_immediately || isExpired ? (
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--light-success)' }}>
                                      Score: {attempt.score} ({attempt.percentage}%)
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontStyle: 'italic' }}>
                                      Grades visible after deadline
                                    </span>
                                  )}
                                </div>
                              ) : isExpired ? (
                                <span className="badge-ld badge-ld-secondary">Expired</span>
                              ) : isFuture ? (
                                <span className="badge-ld badge-ld-warning">Scheduled</span>
                              ) : (
                                <span className="badge-ld badge-ld-primary">Active</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {user?.role === 'student' && !hasAttempt && isActive && (
                                  <button 
                                    className="btn-ld btn-ld-primary"
                                    onClick={() => onStartAttempt(test)}
                                  >
                                    Start Attempt
                                  </button>
                                )}

                                {hasAttempt && (test.show_result_immediately || isExpired) && (
                                  <button 
                                    className="btn-ld btn-ld-secondary btn-ld-small"
                                    onClick={() => onViewReport(attempt.id)}
                                  >
                                    View Report
                                  </button>
                                )}

                                {user?.role !== 'student' && (
                                  <>
                                    <button 
                                      className="btn-ld btn-ld-primary btn-ld-small"
                                      onClick={() => onPreviewTest(test)}
                                    >
                                      Preview
                                    </button>
                                    <button 
                                      className="btn-ld btn-ld-secondary btn-ld-small"
                                      onClick={() => onCloneTest(test.id)}
                                    >
                                      Clone
                                    </button>
                                    <button 
                                      className="btn-ld btn-ld-secondary btn-ld-small"
                                      onClick={() => onOpenAnalytics(test.id)}
                                    >
                                      Analytics
                                    </button>
                                    <button 
                                      className="btn-ld btn-ld-secondary btn-ld-small"
                                      onClick={() => onOpenAssignModal(test)}
                                    >
                                      Assign
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
