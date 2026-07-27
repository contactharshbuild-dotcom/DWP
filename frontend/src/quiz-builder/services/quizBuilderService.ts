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
   * Get all assigned quizzes for a classroom
   */
  async getClassroomQuizzes(classroomId: number): Promise<Quiz[]> {
    const response = await api.get(`/quiz-builder/classroom/${classroomId}`);
    return response.data.quizzes || [];
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
