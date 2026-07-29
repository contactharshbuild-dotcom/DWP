import React, { useState, useEffect } from 'react';
import { FiX, FiShield, FiUsers, FiAlertCircle, FiShuffle } from 'react-icons/fi';
import { quizBuilderService } from '../services/quizBuilderService';
import type { Quiz } from '../types/quizBuilder.types';

interface Student {
  id: number;
  name: string;
  email: string;
}

interface AssignQuizModalProps {
  isOpen: boolean;
  classroomId: number;
  classroomStudents: Student[];
  quizToEdit?: Quiz | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignQuizModal: React.FC<AssignQuizModalProps> = ({
  isOpen,
  classroomId,
  classroomStudents,
  quizToEdit,
  onClose,
  onSuccess
}) => {
  const [orgQuizzes, setOrgQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);

  // Windows & Activation
  const [startWindow, setStartWindow] = useState('');
  const [endWindow, setEndWindow] = useState('');
  const [activationMode, setActivationMode] = useState<'auto' | 'manual'>('auto');

  // Score Release Mode
  const [scoreReleaseMode, setScoreReleaseMode] = useState<'immediate' | 'manual_review' | 'after_deadline'>('immediate');

  // Proctoring & Security
  const [forceFullscreen, setForceFullscreen] = useState(false);
  const [tabSwitchBehavior, setTabSwitchBehavior] = useState<'warning' | 'auto_submit_n_warnings' | 'immediate_auto_submit'>('warning');
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [proctorExtension, setProctorExtension] = useState(false);

  // Shuffling
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  // Target Students (DEFAULT: ALL SELECTED)
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available organization quizzes on mount
  useEffect(() => {
    if (isOpen) {
      setLoadingQuizzes(true);
      quizBuilderService.getQuizzes()
        .then(quizzes => {
          setOrgQuizzes(quizzes);
        })
        .catch(err => console.error('Failed to load organization quizzes:', err))
        .finally(() => setLoadingQuizzes(false));

      if (quizToEdit) {
        setTitle(quizToEdit.title || '');
        setDescription(quizToEdit.description || '');
        setTimeLimit(quizToEdit.time_limit || 30);
        setStartWindow(quizToEdit.start_window ? new Date(quizToEdit.start_window).toISOString().slice(0, 16) : '');
        setEndWindow(quizToEdit.end_window ? new Date(quizToEdit.end_window).toISOString().slice(0, 16) : '');
        setActivationMode(quizToEdit.activation_mode || 'auto');
        setScoreReleaseMode(quizToEdit.score_release_mode || 'immediate');
        setForceFullscreen(!!quizToEdit.security_force_fullscreen);
        setTabSwitchBehavior(quizToEdit.security_tab_switch_behavior || 'warning');
        setMaxWarnings(quizToEdit.security_max_warnings || 3);
        setProctorExtension(!!quizToEdit.proctor_extension_required);
        setShuffleQuestions(!!quizToEdit.shuffle_questions);
        setShuffleOptions(!!quizToEdit.shuffle_options);
        setSelectedStudentIds(quizToEdit.assigned_student_ids || classroomStudents.map(s => s.id));
      } else {
        setSelectedTemplateId('');
        setTitle('');
        setDescription('');
        setTimeLimit(30);
        // Default select ALL classroom students
        const allStudentIds = classroomStudents.map(s => s.id);
        setSelectedStudentIds(allStudentIds);

        // Default opening window dates
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setStartWindow(now.toISOString().slice(0, 16));
        setEndWindow(tomorrow.toISOString().slice(0, 16));
      }

      setError(null);
    }
  }, [isOpen, quizToEdit, classroomStudents]);

  if (!isOpen) return null;

  // Template select change handler
  const handleTemplateChange = (templateIdStr: string) => {
    if (!templateIdStr) {
      setSelectedTemplateId('');
      setTitle('');
      setDescription('');
      return;
    }

    const templateId = Number(templateIdStr);
    setSelectedTemplateId(templateId);
    const template = orgQuizzes.find(q => q.id === templateId);

    if (template) {
      setTitle(template.title);
      setDescription(template.description || '');
      setTimeLimit(template.time_limit || 30);
    }
  };

  const handleToggleStudent = (studentId: number) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === classroomStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(classroomStudents.map(s => s.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizToEdit && !selectedTemplateId) {
      setError('Please select a Quiz Template created via Quiz Builder.');
      return;
    }

    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student to assign this quiz.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (quizToEdit) {
        await quizBuilderService.updateQuiz(quizToEdit.id, {
          title,
          description,
          timeLimit: Number(timeLimit) || 30,
          startWindow: startWindow ? new Date(startWindow).toISOString() : null,
          endWindow: endWindow ? new Date(endWindow).toISOString() : null,
          activationMode,
          scoreReleaseMode,
          securityForceFullscreen: forceFullscreen,
          securityTabSwitchBehavior: tabSwitchBehavior,
          securityMaxWarnings: Number(maxWarnings) || 3,
          proctorExtensionRequired: proctorExtension,
          shuffleQuestions,
          shuffleOptions,
          assignedStudentIds: selectedStudentIds
        });
      } else {
        await quizBuilderService.assignQuizToClassroom({
          templateQuizId: Number(selectedTemplateId),
          classroomId,
          title,
          description,
          timeLimit: Number(timeLimit) || 30,
          startWindow: startWindow ? new Date(startWindow).toISOString() : null,
          endWindow: endWindow ? new Date(endWindow).toISOString() : null,
          activationMode,
          scoreReleaseMode,
          securityForceFullscreen: forceFullscreen,
          securityTabSwitchBehavior: tabSwitchBehavior,
          securityMaxWarnings: Number(maxWarnings) || 3,
          proctorExtensionRequired: proctorExtension,
          shuffleQuestions,
          shuffleOptions,
          assignedStudentIds: selectedStudentIds
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save assigned quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--light-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>
              {quizToEdit ? 'Edit Assigned Quiz' : 'Assign Quiz to Classroom'}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--light-text-secondary)' }}>
              {quizToEdit
                ? 'Modify schedules, proctoring options, time limits, and assigned students.'
                : 'Select a Quiz Builder template, configure schedules, proctoring options, and target students.'}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-secondary)', padding: '6px', borderRadius: '50%' }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <FiAlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Quiz Template Selection */}
            {!quizToEdit && (
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label-ld">Select Quiz Template (From Quiz Builder) *</label>
                {loadingQuizzes ? (
                  <div style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>Loading organization templates...</div>
                ) : (
                  <select
                    className="select-ld"
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Quiz Template --</option>
                    {orgQuizzes.map(quiz => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title} ({quiz.total_questions || (quiz.questions?.length || 0)} Questions)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* 2. Opening Window & Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label className="form-label-ld">Start Opening Window</label>
                <input
                  type="datetime-local"
                  className="input-ld"
                  value={startWindow}
                  onChange={(e) => setStartWindow(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label-ld">End Opening Window</label>
                <input
                  type="datetime-local"
                  className="input-ld"
                  value={endWindow}
                  onChange={(e) => setEndWindow(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label-ld">Quiz Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  className="input-ld"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                  required
                />
              </div>
            </div>

            {/* 3. Activation Mode & Score Release Policy */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ border: '1px solid var(--light-border)', padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                <label className="form-label-ld" style={{ marginBottom: '8px' }}>Quiz Activation Mode</label>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="activationMode"
                      value="auto"
                      checked={activationMode === 'auto'}
                      onChange={() => setActivationMode('auto')}
                    />
                    <span>Auto Start/End (Cron Job)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="activationMode"
                      value="manual"
                      checked={activationMode === 'manual'}
                      onChange={() => setActivationMode('manual')}
                    />
                    <span>Manual Start by Teacher</span>
                  </label>
                </div>
              </div>

              <div style={{ border: '1px solid var(--light-border)', padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                <label className="form-label-ld" style={{ marginBottom: '8px' }}>Score Release Policy</label>
                <select
                  className="select-ld"
                  value={scoreReleaseMode}
                  onChange={(e) => setScoreReleaseMode(e.target.value as any)}
                >
                  <option value="immediate">Show Score Immediately After Submission</option>
                  <option value="manual_review">Show Score Only After Teacher Review / Grading</option>
                  <option value="after_deadline">Show Score After Quiz Opening Window Deadline</option>
                </select>
              </div>
            </div>

            {/* 4. Cheating Prevention & Proctoring Options */}
            <div style={{ border: '1px solid var(--light-border)', padding: '16px', borderRadius: '12px', marginBottom: '20px', backgroundColor: '#fff' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--light-primary)' }}>
                <FiShield />
                <span>Anti-Cheating & Proctoring Prevention Options</span>
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={forceFullscreen}
                    onChange={(e) => setForceFullscreen(e.target.checked)}
                  />
                  <span>Enforce Full-Screen Mode</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={proctorExtension}
                    onChange={(e) => setProctorExtension(e.target.checked)}
                  />
                  <span>Require Proctoring Browser Extension</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label-ld">Tab Switch / New Tab Monitoring</label>
                  <select
                    className="select-ld"
                    value={tabSwitchBehavior}
                    onChange={(e) => setTabSwitchBehavior(e.target.value as any)}
                  >
                    <option value="warning">Warn Student on Tab Switch</option>
                    <option value="auto_submit_n_warnings">Auto-Submit After Max Warnings</option>
                    <option value="immediate_auto_submit">Immediate Auto-Submit on Tab Switch</option>
                  </select>
                </div>

                <div>
                  <label className="form-label-ld">Max Warnings</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="input-ld"
                    value={maxWarnings}
                    onChange={(e) => setMaxWarnings(parseInt(e.target.value) || 3)}
                  />
                </div>
              </div>
            </div>

            {/* 5. Shuffling Options */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', border: '1px solid var(--light-border)', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                />
                <FiShuffle size={14} />
                <span>Shuffle Questions</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                />
                <FiShuffle size={14} />
                <span>Shuffle Options</span>
              </label>
            </div>

            {/* 6. Target Student Selection (Default ALL Selected) */}
            <div style={{ border: '1px solid var(--light-border)', padding: '16px', borderRadius: '12px', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiUsers />
                  <span>Assign to Classroom Students ({selectedStudentIds.length} / {classroomStudents.length} Selected)</span>
                </h4>

                <button
                  type="button"
                  className="btn-ld btn-ld-secondary btn-ld-small"
                  onClick={handleSelectAllStudents}
                >
                  {selectedStudentIds.length === classroomStudents.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {classroomStudents.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>
                  No students currently enrolled in this classroom.
                </div>
              ) : (
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {classroomStudents.map(student => {
                    const isChecked = selectedStudentIds.includes(student.id);

                    return (
                      <label
                        key={student.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: isChecked ? '1px solid #6366f1' : '1px solid var(--light-border)',
                          backgroundColor: isChecked ? '#eef2ff' : '#fafafa',
                          fontSize: '12.5px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStudent(student.id)}
                        />
                        <span style={{ fontWeight: isChecked ? '600' : 'normal' }}>{student.name}</span>
                        <span style={{ color: 'var(--light-text-muted)', fontSize: '11px' }}>({student.email})</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--light-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: '#f9fafb'
          }}>
            <button
              type="button"
              className="btn-ld btn-ld-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-ld btn-ld-primary"
              disabled={submitting}
            >
              {submitting ? 'Assigning Quiz...' : 'Assign Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
