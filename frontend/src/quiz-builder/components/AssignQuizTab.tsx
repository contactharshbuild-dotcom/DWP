import React, { useState, useEffect } from 'react';
import { FiPlus, FiPlay, FiSquare, FiCheckCircle, FiTrash2, FiAward, FiEye, FiEdit2, FiBarChart2, FiFileText } from 'react-icons/fi';
import { quizBuilderService } from '../services/quizBuilderService';
import { AssignQuizModal } from './AssignQuizModal';
import type { Quiz } from '../types/quizBuilder.types';

interface Student {
  id: number;
  name: string;
  email: string;
}

interface AssignQuizTabProps {
  classroomId: number;
  userRole: string;
  user?: { id: number; role: string } | null;
  classroomStudents: Student[];
  onViewReport?: (attemptId: number) => void;
  onPreviewTest?: (test: any) => void;
  onOpenAnalytics?: (testId: number) => void;
  onStartAttempt?: (test: any) => void;
  onPendingCountChange?: (count: number) => void;
}

export const AssignQuizTab: React.FC<AssignQuizTabProps> = ({
  classroomId,
  userRole,
  user,
  classroomStudents,
  onViewReport,
  onPreviewTest,
  onOpenAnalytics,
  onStartAttempt,
  onPendingCountChange
}) => {
  const [assignedQuizzes, setAssignedQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [quizToEditSettings, setQuizToEditSettings] = useState<Quiz | null>(null);

  const fetchClassroomQuizzes = async () => {
    setLoading(true);
    try {
      const data = await quizBuilderService.getClassroomQuizzes(classroomId);
      setAssignedQuizzes(data);

      if (onPendingCountChange) {
        const now = new Date();
        const pendingCount = data.filter((quiz: any) => {
          const start = quiz.start_window ? new Date(quiz.start_window) : null;
          const end = quiz.end_window ? new Date(quiz.end_window) : null;
          const isWindowActive = (!start || now >= start) && (!end || now <= end);
          const isExpired = !!end && now > end;
          const isScheduled = quiz.status === 'scheduled';
          const isActive = (quiz.status === 'active' || isWindowActive) && !isExpired;

          const attempts = quiz.attempts || [];
          const hasAttempt = user ? attempts.some((a: any) => a.user_id === user.id) : false;

          return (isActive || isScheduled) && !hasAttempt;
        }).length;
        onPendingCountChange(pendingCount);
      }
    } catch (err: any) {
      console.error('Failed to fetch assigned classroom quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classroomId) {
      fetchClassroomQuizzes();
    }
  }, [classroomId]);

  const handleManualStart = async (quizId: number) => {
    try {
      await quizBuilderService.manualStart(quizId);
      await fetchClassroomQuizzes();
    } catch (err: any) {
      alert('Failed to start quiz: ' + (err.message || 'Error'));
    }
  };

  const handleManualEnd = async (quizId: number) => {
    if (window.confirm('Are you sure you want to end this quiz now? Unsubmitted student attempts will be auto-submitted.')) {
      try {
        await quizBuilderService.manualEnd(quizId);
        await fetchClassroomQuizzes();
      } catch (err: any) {
        alert('Failed to end quiz: ' + (err.message || 'Error'));
      }
    }
  };

  const handleReleaseScores = async (quizId: number) => {
    if (window.confirm('Release scores to students for this quiz? Students will immediately be able to view their results.')) {
      try {
        await quizBuilderService.releaseScores(quizId);
        await fetchClassroomQuizzes();
      } catch (err: any) {
        alert('Failed to release scores: ' + (err.message || 'Error'));
      }
    }
  };

  const handleDeleteAssignment = async (quizId: number) => {
    if (window.confirm('Are you sure you want to delete this classroom quiz assignment?')) {
      try {
        await quizBuilderService.deleteQuiz(quizId);
        await fetchClassroomQuizzes();
      } catch (err: any) {
        alert('Failed to delete assignment: ' + (err.message || 'Error'));
      }
    }
  };

  const handleOpenEditSettings = (quiz: Quiz) => {
    setQuizToEditSettings(quiz);
    setShowAssignModal(true);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      {/* Header Actions */}
      {userRole !== 'student' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>
              Assigned Classroom Quizzes
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--light-text-secondary)' }}>
              Quizzes assigned to this classroom with automated/manual schedule windows and proctoring.
            </p>
          </div>

          <button
            className="btn-ld btn-ld-primary"
            onClick={() => {
              setQuizToEditSettings(null);
              setShowAssignModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiPlus size={16} />
            <span>+ Assign Quiz</span>
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '32px', height: '32px' }}></span>
          <p style={{ marginTop: '12px', color: 'var(--light-text-secondary)', fontSize: '13px' }}>Loading classroom quizzes...</p>
        </div>
      ) : assignedQuizzes.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: '#fff',
          border: '1px solid var(--light-border)',
          borderRadius: '16px'
        }}>
          <FiAward size={48} style={{ color: 'var(--light-text-muted)', marginBottom: '16px' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700' }}>No Quizzes Assigned to Classroom</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--light-text-secondary)' }}>
            Use the <strong>+ Assign Quiz</strong> button above to pick a Quiz Builder template and publish it to students.
          </p>
        </div>
      ) : (
        <div className="ld-table-container">
          <table className="ld-table">
            <thead>
              <tr>
                <th>Quiz Name</th>
                <th>Opening Window & Duration</th>
                <th>Status</th>
                <th>Score Release</th>
                <th>Target Students</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignedQuizzes.map((quiz: any) => {
                const now = new Date();
                const start = quiz.start_window ? new Date(quiz.start_window) : null;
                const end = quiz.end_window ? new Date(quiz.end_window) : null;
                const isWindowActive = (!start || now >= start) && (!end || now <= end);
                const isExpired = !!end && now > end;

                const isScheduled = quiz.status === 'scheduled';
                const isActive = quiz.status === 'active' || isWindowActive;
                const isCompleted = quiz.status === 'completed' || isExpired;

                // Check student attempt
                const attempts = quiz.attempts || [];
                const attempt = user 
                  ? attempts.find((a: any) => a.user_id === user.id) 
                  : (attempts.length > 0 ? attempts[0] : null);
                const hasAttempt = !!attempt;

                return (
                  <tr key={quiz.id}>
                    <td style={{ fontWeight: '600' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px' }}>{quiz.title}</span>
                        <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: 'normal' }}>
                          {quiz.total_questions || (quiz.questions?.length || 0)} Questions • {quiz.time_limit} Mins
                        </span>
                      </div>
                    </td>

                    <td style={{ fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>Start: {formatDate(quiz.start_window)}</span>
                        <span>End: {formatDate(quiz.end_window)}</span>
                      </div>
                    </td>

                    <td>
                      {isActive && <span className="badge-ld badge-ld-primary">Active</span>}
                      {isScheduled && !isActive && <span className="badge-ld badge-ld-warning">Scheduled</span>}
                      {isCompleted && !isActive && <span className="badge-ld badge-ld-secondary">Completed</span>}
                    </td>

                    <td>
                      {quiz.show_result_immediately || quiz.score_release_mode === 'immediate' ? (
                        <span className="badge-ld badge-ld-success" style={{ fontSize: '10px' }}>Immediate</span>
                      ) : quiz.score_release_mode === 'manual_review' ? (
                        <span className="badge-ld badge-ld-warning" style={{ fontSize: '10px' }}>Teacher Review</span>
                      ) : (
                        <span className="badge-ld badge-ld-secondary" style={{ fontSize: '10px' }}>After Deadline</span>
                      )}
                    </td>

                    <td style={{ fontSize: '13px' }}>
                      {quiz.assigned_student_ids && quiz.assigned_student_ids.length > 0 ? (
                        <span>{quiz.assigned_student_ids.length} Students</span>
                      ) : (
                        <span>All Students</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Student Start Attempt */}
                        {userRole === 'student' && !hasAttempt && isActive && onStartAttempt && (
                          <button 
                            className="btn-ld btn-ld-primary btn-ld-small"
                            onClick={() => onStartAttempt(quiz)}
                            title="Start Attempt"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                          >
                            <FiPlay size={14} />
                          </button>
                        )}

                        {/* View Report */}
                        {hasAttempt && (quiz.show_result_immediately || quiz.score_release_mode === 'immediate' || isExpired) && onViewReport && (
                          <button 
                            className="btn-ld btn-ld-secondary btn-ld-small"
                            onClick={() => onViewReport(attempt.id)}
                            title="View Report"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                          >
                            <FiFileText size={14} />
                          </button>
                        )}

                        {/* Teacher/Admin Actions */}
                        {userRole !== 'student' && (
                          <>
                            {/* Preview */}
                            {onPreviewTest && (
                              <button 
                                className="btn-ld btn-ld-primary btn-ld-small"
                                onClick={() => onPreviewTest(quiz)}
                                title="Preview Quiz"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                              >
                                <FiEye size={14} />
                              </button>
                            )}

                            {/* Analytics */}
                            {onOpenAnalytics && (
                              <button 
                                className="btn-ld btn-ld-secondary btn-ld-small"
                                onClick={() => onOpenAnalytics(quiz.id)}
                                title="Preview Analytics"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                              >
                                <FiBarChart2 size={14} />
                              </button>
                            )}

                            {/* Edit Settings */}
                            <button 
                              className="btn-ld btn-ld-secondary btn-ld-small"
                              onClick={() => handleOpenEditSettings(quiz)}
                              title="Edit Quiz Settings & Schedule"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                            >
                              <FiEdit2 size={14} />
                            </button>

                            {/* Manual Session Start */}
                            {isScheduled && (
                              <button
                                className="btn-ld btn-ld-primary btn-ld-small"
                                onClick={() => handleManualStart(quiz.id)}
                                title="Start Quiz Now"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                              >
                                <FiPlay size={14} />
                              </button>
                            )}

                            {/* Manual Session End */}
                            {isActive && (
                              <button
                                className="btn-ld btn-ld-warning btn-ld-small"
                                onClick={() => handleManualEnd(quiz.id)}
                                title="End Quiz Session"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                              >
                                <FiSquare size={14} />
                              </button>
                            )}

                            {/* Release Scores */}
                            {quiz.score_release_mode === 'manual_review' && !quiz.show_result_immediately && (
                              <button
                                className="btn-ld btn-ld-success btn-ld-small"
                                onClick={() => handleReleaseScores(quiz.id)}
                                title="Publish Scores to Students"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                              >
                                <FiCheckCircle size={14} />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              className="btn-ld btn-ld-danger btn-ld-small"
                              onClick={() => handleDeleteAssignment(quiz.id)}
                              title="Delete Assignment"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px' }}
                            >
                              <FiTrash2 size={14} />
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

      {/* Assign / Edit Quiz Settings Modal */}
      <AssignQuizModal
        isOpen={showAssignModal}
        classroomId={classroomId}
        classroomStudents={classroomStudents}
        quizToEdit={quizToEditSettings}
        onClose={() => {
          setShowAssignModal(false);
          setQuizToEditSettings(null);
        }}
        onSuccess={fetchClassroomQuizzes}
      />
    </div>
  );
};
