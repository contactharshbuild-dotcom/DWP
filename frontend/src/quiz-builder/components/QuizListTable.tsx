import { FiEye, FiEdit2, FiTrash2, FiHelpCircle, FiCopy } from 'react-icons/fi';
import type { Quiz } from '../types/quizBuilder.types';

interface QuizListTableProps {
  quizzes: Quiz[];
  loading: boolean;
  onPreview: (quiz: Quiz) => void;
  onEdit: (quiz: Quiz) => void;
  onClone: (quizId: number) => void;
  onDelete: (quizId: number) => void;
}

export const QuizListTable: React.FC<QuizListTableProps> = ({
  quizzes,
  loading,
  onPreview,
  onEdit,
  onClone,
  onDelete
}) => {
  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '32px', height: '32px' }}></span>
        <p style={{ marginTop: '12px', color: 'var(--light-text-secondary)', fontSize: '13px' }}>Loading organization quizzes...</p>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div style={{
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: '#fff',
        border: '1px solid var(--light-border)',
        borderRadius: '16px'
      }}>
        <FiHelpCircle size={48} style={{ color: 'var(--light-text-muted)', marginBottom: '16px' }} />
        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700' }}>No Quizzes Created Yet</h4>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--light-text-secondary)' }}>
          Create your organization's first MCQ or Subjective quiz using the <strong>+ Create New Quiz</strong> button above.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="ld-table-container">
      <table className="ld-table">
        <thead>
          <tr>
            <th>Quiz Name & Description</th>
            <th>Questions Summary</th>
            <th>Classroom Scope</th>
            <th>Created Date</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {quizzes.map((quiz) => {
            const questions = quiz.questions || [];
            const mcqCount = questions.filter(q => q.question_type !== 'subjective').length;
            const subjectiveCount = questions.filter(q => q.question_type === 'subjective').length;

            return (
              <tr key={quiz.id}>
                <td style={{ fontWeight: '600' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', color: 'var(--light-text-primary)' }}>{quiz.title}</span>
                    {quiz.description && (
                      <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: 'normal' }}>
                        {quiz.description}
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="badge-ld badge-ld-primary" style={{ fontSize: '11px' }}>
                      {quiz.total_questions || questions.length} Total
                    </span>
                    {mcqCount > 0 && (
                      <span className="badge-ld badge-ld-secondary" style={{ fontSize: '10px' }}>
                        {mcqCount} MCQ
                      </span>
                    )}
                    {subjectiveCount > 0 && (
                      <span className="badge-ld badge-ld-warning" style={{ fontSize: '10px' }}>
                        {subjectiveCount} Subjective
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  {quiz.classroom ? (
                    <span className="badge-ld badge-ld-secondary" style={{ fontSize: '11px' }}>
                      {quiz.classroom.name}
                    </span>
                  ) : (
                    <span className="badge-ld badge-ld-neutral" style={{ fontSize: '11px' }}>
                      Global Org Template
                    </span>
                  )}
                </td>

                <td style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                  {formatDate(quiz.created_at)}
                </td>

                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn-ld btn-ld-secondary btn-ld-small"
                      onClick={() => onPreview(quiz)}
                      title="Preview Quiz"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FiEye size={14} />
                      <span>Preview</span>
                    </button>

                    <button
                      className="btn-ld btn-ld-secondary btn-ld-small"
                      onClick={() => onEdit(quiz)}
                      title="Edit Quiz"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FiEdit2 size={14} />
                      <span>Edit</span>
                    </button>

                    <button
                      className="btn-ld btn-ld-secondary btn-ld-small"
                      onClick={() => onClone(quiz.id)}
                      title="Clone Quiz Template"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FiCopy size={14} />
                      <span>Clone</span>
                    </button>

                    <button
                      className="btn-ld btn-ld-danger btn-ld-small"
                      onClick={() => onDelete(quiz.id)}
                      title="Delete Quiz"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FiTrash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
