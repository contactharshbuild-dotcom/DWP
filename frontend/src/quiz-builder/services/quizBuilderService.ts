import api from '../../services/api';
import type { Quiz, CreateQuizPayload } from '../types/quizBuilder.types';

export const quizBuilderService = {
  /**
   * Fetch all organization quizzes
   */
  async getQuizzes(): Promise<Quiz[]> {
    const response = await api.get('/quiz-builder');
    return response.data.quizzes || [];
  },

  /**
   * Fetch a single quiz details with full question definitions
   */
  async getQuizById(id: number): Promise<Quiz> {
    const response = await api.get(`/quiz-builder/${id}`);
    return response.data.quiz;
  },

  /**
   * Create a new quiz with MCQ and/or Subjective questions
   */
  async createQuiz(payload: CreateQuizPayload): Promise<Quiz> {
    const response = await api.post('/quiz-builder', payload);
    return response.data.quiz;
  },

  /**
   * Update an existing quiz
   */
  async updateQuiz(id: number, payload: Partial<CreateQuizPayload>): Promise<Quiz> {
    const response = await api.put(`/quiz-builder/${id}`, payload);
    return response.data.quiz;
  },

  /**
   * Delete a quiz
   */
  async deleteQuiz(id: number): Promise<void> {
    await api.delete(`/quiz-builder/${id}`);
  },

  /**
   * Clone a quiz template
   */
  async cloneQuiz(id: number): Promise<Quiz> {
    const response = await api.post(`/quiz-builder/${id}/clone`);
    return response.data.quiz;
  },

  /**
   * Assign a Quiz Template to a Classroom
   */
  async assignQuizToClassroom(payload: any): Promise<Quiz> {
    const response = await api.post('/quiz-builder/assign', payload);
    return response.data.quiz;
  },

  /**
   * Get assigned quizzes for a classroom with pagination and search
   */
  async getClassroomQuizzes(
    classroomId: number,
    params?: { page?: number; limit?: number; search?: string }
  ): Promise<{ quizzes: Quiz[]; total: number; page: number; limit: number; totalPages: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const url = `/quiz-builder/classroom/${classroomId}${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);

    if (Array.isArray(response.data)) {
      return {
        quizzes: response.data,
        total: response.data.length,
        page: 1,
        limit: response.data.length || 5,
        totalPages: 1
      };
    }

    return {
      quizzes: response.data.quizzes || [],
      total: response.data.total ?? (response.data.quizzes ? response.data.quizzes.length : 0),
      page: response.data.page ?? 1,
      limit: response.data.limit ?? 5,
      totalPages: response.data.totalPages ?? 1
    };
  },

  /**
   * Manually start a quiz
   */
  async manualStart(id: number): Promise<Quiz> {
    const response = await api.post(`/quiz-builder/${id}/manual-start`);
    return response.data.quiz;
  },

  /**
   * Manually end/complete a quiz
   */
  async manualEnd(id: number): Promise<Quiz> {
    const response = await api.post(`/quiz-builder/${id}/manual-end`);
    return response.data.quiz;
  },

  /**
   * Release scores to students
   */
  async releaseScores(id: number): Promise<Quiz> {
    const response = await api.post(`/quiz-builder/${id}/release-scores`);
    return response.data.quiz;
  }
};
