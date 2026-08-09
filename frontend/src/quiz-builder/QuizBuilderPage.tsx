import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { FiPlus, FiSearch, FiFileText, FiCheckSquare } from 'react-icons/fi';
import { QuizListTable } from './components/QuizListTable';
import { CreateEditQuizModal } from './components/CreateEditQuizModal';
import { QuizPreviewModal } from './components/QuizPreviewModal';
import { quizBuilderService } from './services/quizBuilderService';
import type { Quiz, CreateQuizPayload } from './types/quizBuilder.types';
import type { RootState } from '../store';

export const QuizBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mcq' | 'subjective'>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState<Quiz | null>(null);
  const [quizToPreview, setQuizToPreview] = useState<Quiz | null>(null);

  // Redirect students away from Quiz Builder page
  useEffect(() => {
    if (user && user.role === 'student') {
      navigate('/');
    }
  }, [user, navigate]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const data = await quizBuilderService.getQuizzes();
      setQuizzes(data);
    } catch (err: any) {
      console.error('Failed to fetch quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'student') {
      fetchQuizzes();
    }
  }, [user]);

  // Filter quizzes based on search query and question type filter
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'mcq') {
      return (quiz.questions || []).some(q => q.question_type !== 'subjective');
    }
    if (filterType === 'subjective') {
      return (quiz.questions || []).some(q => q.question_type === 'subjective');
    }

    return true;
  });

  const handleOpenCreateModal = () => {
    setQuizToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = async (quiz: Quiz) => {
    try {
      // Fetch full quiz details with complete questions array
      const fullQuiz = await quizBuilderService.getQuizById(quiz.id);
      setQuizToEdit(fullQuiz);
      setIsCreateModalOpen(true);
    } catch (err: any) {
      alert('Failed to fetch quiz details: ' + (err.message || 'Error'));
    }
  };

  const handleOpenPreviewModal = async (quiz: Quiz) => {
    try {
      const fullQuiz = await quizBuilderService.getQuizById(quiz.id);
      setQuizToPreview(fullQuiz);
    } catch (err: any) {
      alert('Failed to fetch preview details: ' + (err.message || 'Error'));
    }
  };

  const handleSaveQuiz = async (payload: CreateQuizPayload) => {
    if (quizToEdit) {
      await quizBuilderService.updateQuiz(quizToEdit.id, payload);
    } else {
      await quizBuilderService.createQuiz(payload);
    }
    await fetchQuizzes();
  };

  const handleDeleteQuiz = async (quizId: number) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      try {
        await quizBuilderService.deleteQuiz(quizId);
        await fetchQuizzes();
      } catch (err: any) {
        alert('Failed to delete quiz: ' + (err.message || 'Error'));
      }
    }
  };

  const handleCloneQuiz = async (quizId: number) => {
    try {
      await quizBuilderService.cloneQuiz(quizId);
      await fetchQuizzes();
    } catch (err: any) {
      alert('Failed to clone quiz: ' + (err.message || 'Error'));
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: 'var(--light-text-primary)' }}>
              Quiz Builder
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--light-text-secondary)' }}>
              Create, manage, and clone organization quiz templates (MCQ & Subjective) to assign across classrooms.
            </p>
          </div>

          <button
            className="btn-ld btn-ld-primary"
            onClick={handleOpenCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiPlus size={18} />
            <span>+ Create New Quiz</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
            <FiSearch size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--light-text-muted)' }} />
            <input
              type="text"
              className="input-ld"
              placeholder="Search quizzes by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn-ld ${filterType === 'all' ? 'btn-ld-primary' : 'btn-ld-secondary'} btn-ld-small`}
              onClick={() => setFilterType('all')}
            >
              All Quizzes
            </button>
            <button
              className={`btn-ld ${filterType === 'mcq' ? 'btn-ld-primary' : 'btn-ld-secondary'} btn-ld-small`}
              onClick={() => setFilterType('mcq')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FiCheckSquare size={14} />
              <span>MCQ Only</span>
            </button>
            <button
              className={`btn-ld ${filterType === 'subjective' ? 'btn-ld-primary' : 'btn-ld-secondary'} btn-ld-small`}
              onClick={() => setFilterType('subjective')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FiFileText size={14} />
              <span>Subjective Only</span>
            </button>
          </div>
        </div>

        {/* Quizzes Table */}
        <QuizListTable
          quizzes={filteredQuizzes}
          loading={loading}
          onPreview={handleOpenPreviewModal}
          onEdit={handleOpenEditModal}
          onClone={handleCloneQuiz}
          onDelete={handleDeleteQuiz}
        />

        {/* Create / Edit Quiz Modal */}
        <CreateEditQuizModal
          isOpen={isCreateModalOpen}
          quizToEdit={quizToEdit}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleSaveQuiz}
        />

        {/* Preview Modal */}
        <QuizPreviewModal
          quiz={quizToPreview}
          onClose={() => setQuizToPreview(null)}
        />
      </div>
    </DashboardLayout>
  );
};
