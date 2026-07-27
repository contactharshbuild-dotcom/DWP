import React, { useState, useEffect } from 'react';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import { ManualQuestionBuilder } from './ManualQuestionBuilder';
import { ExcelImportModal } from './ExcelImportModal';
import type { Quiz, QuizQuestionInput, CreateQuizPayload } from '../types/quizBuilder.types';
import { useClassrooms } from '../../components/ClassroomContext';

interface CreateEditQuizModalProps {
  isOpen: boolean;
  quizToEdit: Quiz | null;
  onClose: () => void;
  onSave: (payload: CreateQuizPayload) => Promise<void>;
}

export const CreateEditQuizModal: React.FC<CreateEditQuizModalProps> = ({
  isOpen,
  quizToEdit,
  onClose,
  onSave
}) => {
  const { classrooms } = useClassrooms();

  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [classroomId, setClassroomId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionInput[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizToEdit) {
      setTitle(quizToEdit.title || '');
      setDescription(quizToEdit.description || '');
      setTimeLimit(quizToEdit.time_limit || 30);
      setClassroomId(quizToEdit.classroom_id || null);
      setQuestions(quizToEdit.questions || []);
    } else {
      setTitle('');
      setDescription('');
      setTimeLimit(30);
      setClassroomId(null);
      setQuestions([]);
    }
    setError(null);
    setActiveTab('manual');
  }, [quizToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Quiz Name is required.');
      return;
    }

    if (questions.length === 0) {
      setError('Please add at least one question (MCQ or Subjective) to the quiz.');
      return;
    }

    // Validate that questions have question_text
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        setError(`Question ${i + 1} is missing a question prompt/text.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        timeLimit: Number(timeLimit) || 30,
        classroomId: classroomId ? Number(classroomId) : null,
        questions
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImportComplete = (importedQuestions: QuizQuestionInput[]) => {
    setQuestions(prev => [...prev, ...importedQuestions]);
    setActiveTab('manual'); // Switch to manual tab to see imported questions
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
              {quizToEdit ? 'Edit Quiz / Assessment' : 'Create New Quiz / Assessment'}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--light-text-secondary)' }}>
              Configure quiz metadata and add MCQ or Subjective questions.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--light-text-secondary)',
              padding: '6px',
              borderRadius: '50%'
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Modal Form Content */}
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

            {/* Quiz Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label-ld">Quiz Name / Title *</label>
                <input
                  type="text"
                  className="input-ld"
                  placeholder="e.g. Midterm Physics Quiz or Javascript Mastery Test"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label-ld">Classroom Assignment (Optional)</label>
                <select
                  className="select-ld"
                  value={classroomId || ''}
                  onChange={(e) => setClassroomId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Global Organization Quiz Template</option>
                  {classrooms.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name} ({cls.subject})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label-ld">Quiz Description</label>
              <textarea
                className="input-ld"
                rows={2}
                placeholder="Provide instructions or overview for this quiz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Content Mode Selection Tabs */}
            <div style={{ borderBottom: '1px solid var(--light-border)', marginBottom: '20px', display: 'flex', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'manual' ? '3px solid var(--light-primary)' : '3px solid transparent',
                  padding: '8px 12px',
                  fontWeight: activeTab === 'manual' ? '700' : '500',
                  color: activeTab === 'manual' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Manual Question Builder ({questions.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'excel' ? '3px solid var(--light-primary)' : '3px solid transparent',
                  padding: '8px 12px',
                  fontWeight: activeTab === 'excel' ? '700' : '500',
                  color: activeTab === 'excel' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Import via Excel / CSV File
              </button>
            </div>

            {/* Active Mode Content */}
            {activeTab === 'manual' ? (
              <ManualQuestionBuilder
                questions={questions}
                onChange={setQuestions}
              />
            ) : (
              <ExcelImportModal
                onImportComplete={handleExcelImportComplete}
              />
            )}
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
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-ld btn-ld-primary"
              disabled={loading}
            >
              {loading ? 'Saving Quiz...' : (quizToEdit ? 'Update Quiz' : 'Create Quiz')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
