import { QuizBuilderService } from './quiz-builder.service.js';

export const getQuizzes = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const quizzes = await QuizBuilderService.getOrganizationQuizzes(organizationId);
    return res.json({ quizzes });
  } catch (error) {
    console.error('Error in getQuizzes:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to fetch quizzes.' });
  }
};

export const getQuizDetails = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const quiz = await QuizBuilderService.getQuizById(id, organizationId);
    return res.json({ quiz });
  } catch (error) {
    console.error('Error in getQuizDetails:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to fetch quiz details.' });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const newQuiz = await QuizBuilderService.createQuiz(req.body, organizationId);
    return res.status(201).json({
      message: 'Quiz created successfully.',
      quiz: newQuiz
    });
  } catch (error) {
    console.error('Error in createQuiz:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to create quiz.' });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const updatedQuiz = await QuizBuilderService.updateQuiz(id, req.body, organizationId);
    return res.json({
      message: 'Quiz updated successfully.',
      quiz: updatedQuiz
    });
  } catch (error) {
    console.error('Error in updateQuiz:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to update quiz.' });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const result = await QuizBuilderService.deleteQuiz(id, organizationId);
    return res.json(result);
  } catch (error) {
    console.error('Error in deleteQuiz:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to delete quiz.' });
  }
};

export const cloneQuiz = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const clonedQuiz = await QuizBuilderService.cloneQuiz(id, organizationId);
    return res.status(201).json({
      message: 'Quiz cloned successfully.',
      quiz: clonedQuiz
    });
  } catch (error) {
    console.error('Error in cloneQuiz:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to clone quiz.' });
  }
};

export const assignQuiz = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const assignedQuiz = await QuizBuilderService.assignQuizToClassroom(req.body, organizationId);
    return res.status(201).json({
      message: 'Quiz assigned to classroom successfully.',
      quiz: assignedQuiz
    });
  } catch (error) {
    console.error('Error in assignQuiz:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to assign quiz.' });
  }
};

export const getClassroomQuizzes = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { classroomId } = req.params;
    const quizzes = await QuizBuilderService.getClassroomAssignedQuizzes(classroomId, organizationId);
    return res.json({ quizzes });
  } catch (error) {
    console.error('Error in getClassroomQuizzes:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to fetch classroom quizzes.' });
  }
};

export const manualStart = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const quiz = await QuizBuilderService.manualStartQuiz(id, organizationId);
    return res.json({ message: 'Quiz started manually.', quiz });
  } catch (error) {
    console.error('Error in manualStart:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to start quiz.' });
  }
};

export const manualEnd = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const quiz = await QuizBuilderService.manualEndQuiz(id, organizationId);
    return res.json({ message: 'Quiz ended manually.', quiz });
  } catch (error) {
    console.error('Error in manualEnd:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to end quiz.' });
  }
};

export const releaseScores = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const quiz = await QuizBuilderService.releaseQuizScores(id, organizationId);
    return res.json({ message: 'Quiz scores released to students.', quiz });
  } catch (error) {
    console.error('Error in releaseScores:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to release scores.' });
  }
};
