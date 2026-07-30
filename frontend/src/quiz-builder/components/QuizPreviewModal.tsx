import React from 'react';
import { FiX, FiCheckCircle, FiHelpCircle, FiFileText } from 'react-icons/fi';
import type { Quiz, QuizQuestionInput } from '../types/quizBuilder.types';

interface QuizPreviewModalProps {
  quiz: Quiz | null;
  onClose: () => void;
}

export const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({ quiz, onClose }) => {
  if (!quiz) return null;

  const questions: QuizQuestionInput[] = quiz.questions || [];

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
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-ld badge-ld-primary">Preview Mode</span>
              {quiz.classroom && (
                <span className="badge-ld badge-ld-secondary">{quiz.classroom.name}</span>
              )}
            </div>
            <h3 style={{ margin: '6px 0 2px 0', fontSize: '18px', fontWeight: '700', color: 'var(--light-text-primary)' }}>
              {quiz.title}
            </h3>
            {quiz.description && (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                {quiz.description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--light-text-secondary)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex'
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: '#eef2ff',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#3730a3'
          }}>
            <span>❓ <strong>Total Questions:</strong> {questions.length}</span>
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--light-text-muted)' }}>
              No questions added to this quiz yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {questions.map((q, idx) => {
                const isSubjective = q.question_type === 'subjective';

                return (
                  <div 
                    key={q.id || idx}
                    style={{
                      border: '1px solid var(--light-border)',
                      borderRadius: '12px',
                      padding: '20px',
                      backgroundColor: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--light-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isSubjective ? <FiFileText /> : <FiHelpCircle />}
                        Question {idx + 1} ({isSubjective ? 'Subjective' : 'MCQ'})
                      </span>
                      <span className="badge-ld badge-ld-secondary" style={{ fontSize: '11px' }}>
                        {q.marks || 1} Marks
                      </span>
                    </div>

                    <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--light-text-primary)', marginBottom: '16px', whiteSpace: 'pre-line' }}>
                      {q.question_text}
                    </p>

                    {isSubjective ? (
                      <div>
                        <textarea
                          placeholder="Student answer preview textarea..."
                          disabled
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px dashed #cbd5e1',
                            backgroundColor: '#f8fafc',
                            fontSize: '13px',
                            cursor: 'not-allowed',
                            color: '#64748b'
                          }}
                        />
                        {q.explanation && (
                          <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: '4px', fontSize: '12px', color: '#15803d' }}>
                            <strong>Rubric / Model Answer:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {[
                          { key: 'A', text: q.option_a },
                          { key: 'B', text: q.option_b },
                          { key: 'C', text: q.option_c },
                          { key: 'D', text: q.option_d }
                        ].map((opt) => {
                          const isCorrect = q.correct_answer === opt.key;

                          return (
                            <div
                              key={opt.key}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: isCorrect ? '2px solid #22c55e' : '1px solid var(--light-border)',
                                backgroundColor: isCorrect ? '#f0fdf4' : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                fontWeight: isCorrect ? '600' : 'normal'
                              }}
                            >
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: isCorrect ? '#22c55e' : '#e2e8f0',
                                color: isCorrect ? '#fff' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                {opt.key}
                              </span>
                              <span style={{ flex: 1 }}>{opt.text || '-'}</span>
                              {isCorrect && <FiCheckCircle style={{ color: '#22c55e' }} size={16} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--light-border)', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f9fafb' }}>
          <button className="btn-ld btn-ld-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
