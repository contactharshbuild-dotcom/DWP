import React, { useState, useEffect } from 'react';
import { FiPlus, FiClock, FiShield, FiPlay, FiSquare, FiCheckCircle, FiTrash2, FiAward } from 'react-icons/fi';
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
  classroomStudents: Student[];
}

export const AssignQuizTab: React.FC<AssignQuizTabProps> = ({
  classroomId,
  userRole,
  classroomStudents
}) => {
  const [assignedQuizzes, setAssignedQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchClassroomQuizzes = async () => {
    setLoading(true);
    try {
      const data = await quizBuilderService.getClassroomQuizzes(classroomId);
      setAssignedQuizzes(data);
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
            onClick={() => setShowAssignModal(true)}
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
                const isScheduled = quiz.status === 'scheduled';
                const isActive = quiz.status === 'active';
                const isCompleted = quiz.status === 'completed';

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
                      {isScheduled && <span className="badge-ld badge-ld-warning">Scheduled</span>}
                      {isCompleted && <span className="badge-ld badge-ld-secondary">Completed</span>}
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
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {userRole !== 'student' && isScheduled && (
                          <button
                            className="btn-ld btn-ld-primary btn-ld-small"
                            onClick={() => handleManualStart(quiz.id)}
                            title="Start Quiz Now"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FiPlay size={12} />
                            <span>Start Now</span>
                          </button>
                        )}

                        {userRole !== 'student' && isActive && (
                          <button
                            className="btn-ld btn-ld-warning btn-ld-small"
                            onClick={() => handleManualEnd(quiz.id)}
                            title="End Quiz Session"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FiSquare size={12} />
                            <span>End Session</span>
                          </button>
                        )}

                        {userRole !== 'student' && quiz.score_release_mode === 'manual_review' && !quiz.show_result_immediately && (
                          <button
                            className="btn-ld btn-ld-success btn-ld-small"
                            onClick={() => handleReleaseScores(quiz.id)}
                            title="Publish Scores to Students"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FiCheckCircle size={12} />
                            <span>Release Scores</span>
                          </button>
                        )}

                        {userRole !== 'student' && (
                          <button
                            className="btn-ld btn-ld-danger btn-ld-small"
                            onClick={() => handleDeleteAssignment(quiz.id)}
                            title="Delete Assignment"
                          >
                            <FiTrash2 size={14} />
                          </button>
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

      {/* Assign Quiz Modal */}
      <AssignQuizModal
        isOpen={showAssignModal}
        classroomId={classroomId}
        classroomStudents={classroomStudents}
        onClose={() => setShowAssignModal(false)}
        onSuccess={fetchClassroomQuizzes}
      />
    </div>
  );
};
