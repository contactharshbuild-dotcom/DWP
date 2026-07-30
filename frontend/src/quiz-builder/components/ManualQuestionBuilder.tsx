import { FiPlus, FiTrash2 } from 'react-icons/fi';
import type { QuizQuestionInput, QuestionType } from '../types/quizBuilder.types';

interface ManualQuestionBuilderProps {
  questions: QuizQuestionInput[];
  onChange: (questions: QuizQuestionInput[]) => void;
}

export const ManualQuestionBuilder: React.FC<ManualQuestionBuilderProps> = ({
  questions,
  onChange
}) => {
  const addQuestion = (type: QuestionType) => {
    const newQuestion: QuizQuestionInput = {
      question_type: type,
      question_text: '',
      marks: 1,
      difficulty: 'Medium',
      ...(type === 'mcq' ? {
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A'
      } : {
        explanation: ''
      })
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updatedFields: Partial<QuizQuestionInput>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updatedFields };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
          Questions List ({questions.length})
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-ld btn-ld-secondary btn-ld-small"
            onClick={() => addQuestion('mcq')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <FiPlus size={14} />
            <span>+ MCQ Question</span>
          </button>
          <button
            type="button"
            className="btn-ld btn-ld-secondary btn-ld-small"
            onClick={() => addQuestion('subjective')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <FiPlus size={14} />
            <span>+ Subjective Question</span>
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div style={{
          padding: '30px',
          textAlign: 'center',
          border: '2px dashed var(--light-border)',
          borderRadius: '12px',
          color: 'var(--light-text-secondary)'
        }}>
          <p style={{ fontSize: '14px', margin: '0 0 12px 0' }}>No questions created yet.</p>
          <p style={{ fontSize: '12px', color: 'var(--light-text-muted)' }}>
            Click <strong>+ MCQ Question</strong> or <strong>+ Subjective Question</strong> above to manually add content.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map((q, idx) => {
            const isSubjective = q.question_type === 'subjective';

            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--light-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--light-primary)' }}>
                      Q{idx + 1}
                    </span>
                    <select
                      className="input-ld"
                      style={{ padding: '2px 8px', fontSize: '12px', width: 'auto' }}
                      value={q.question_type}
                      onChange={(e) => updateQuestion(idx, { question_type: e.target.value as QuestionType })}
                    >
                      <option value="mcq">MCQ Question</option>
                      <option value="subjective">Subjective Question</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Marks:
                      <input
                        type="number"
                        min={1}
                        className="input-ld"
                        style={{ width: '60px', padding: '2px 6px', fontSize: '12px' }}
                        value={q.marks}
                        onChange={(e) => updateQuestion(idx, { marks: parseInt(e.target.value) || 1 })}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--light-danger)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px'
                      }}
                      title="Remove question"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label-ld">Question Prompt / Text</label>
                  <textarea
                    className="input-ld"
                    rows={2}
                    placeholder={isSubjective ? "Enter descriptive subjective question prompt..." : "Enter MCQ question text..."}
                    value={q.question_text}
                    onChange={(e) => updateQuestion(idx, { question_text: e.target.value })}
                  />
                </div>

                {/* MCQ Options */}
                {!isSubjective && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <label className="form-label-ld">Multiple Choice Options</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { key: 'option_a', label: 'Option A' },
                        { key: 'option_b', label: 'Option B' },
                        { key: 'option_c', label: 'Option C' },
                        { key: 'option_d', label: 'Option D' }
                      ].map((opt) => (
                        <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', width: '60px' }}>{opt.label}:</span>
                          <input
                            type="text"
                            className="input-ld"
                            placeholder={`Enter ${opt.label}...`}
                            value={(q as any)[opt.key] || ''}
                            onChange={(e) => updateQuestion(idx, { [opt.key]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="form-label-ld" style={{ margin: 0 }}>Correct Answer:</label>
                      <select
                        className="input-ld"
                        style={{ width: '100px', padding: '4px 8px' }}
                        value={q.correct_answer || 'A'}
                        onChange={(e) => updateQuestion(idx, { correct_answer: e.target.value })}
                      >
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Subjective Rubric / Explanation */}
                <div>
                  <label className="form-label-ld">
                    {isSubjective ? 'Rubric / Model Answer Guidelines' : 'Explanation (Optional)'}
                  </label>
                  <textarea
                    className="input-ld"
                    rows={2}
                    placeholder={isSubjective ? "Enter evaluation criteria or expected key points..." : "Enter explanation for correct answer..."}
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
