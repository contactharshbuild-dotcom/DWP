import { McqTest, McqQuestion, McqAttempt, Classroom, User } from '../models/index.js';
import { Op } from 'sequelize';

export class QuizBuilderService {
  /**
   * Get all quizzes for a specific organization
   */
  static async getOrganizationQuizzes(organizationId) {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const quizzes = await McqTest.findAll({
      where: {
        organization_id: organizationId,
        classroom_id: null
      },
      include: [
        {
          model: McqQuestion,
          as: 'questions',
          attributes: ['id', 'question_type']
        },
        {
          model: Classroom,
          as: 'classroom',
          attributes: ['id', 'name', 'subject']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return quizzes;
  }

  /**
   * Clone a quiz template
   */
  static async cloneQuiz(quizId, organizationId) {
    const original = await McqTest.findOne({
      where: { id: quizId, organization_id: organizationId },
      include: [{ model: McqQuestion, as: 'questions' }]
    });

    if (!original) {
      const error = new Error('Quiz template not found.');
      error.statusCode = 404;
      throw error;
    }

    const clonedQuiz = await McqTest.create({
      organization_id: organizationId,
      classroom_id: null,
      title: `${original.title} (Copy)`,
      description: original.description,
      time_limit: original.time_limit,
      test_type: original.test_type || 'template',
      shuffle_questions: original.shuffle_questions,
      shuffle_options: original.shuffle_options,
      show_result_immediately: original.show_result_immediately,
      total_questions: original.questions ? original.questions.length : 0
    });

    let clonedQuestions = [];
    if (original.questions && original.questions.length > 0) {
      clonedQuestions = await Promise.all(
        original.questions.map(q => McqQuestion.create({
          test_id: clonedQuiz.id,
          is_bank: false,
          question_type: q.question_type || 'mcq',
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || 'Medium',
          marks: q.marks || 1
        }))
      );
    }

    return { ...clonedQuiz.toJSON(), questions: clonedQuestions };
  }

  /**
   * Get single quiz details with full question definitions
   */
  static async getQuizById(quizId, organizationId) {
    const quiz = await McqTest.findOne({
      where: {
        id: quizId,
        organization_id: organizationId
      },
      include: [
        {
          model: McqQuestion,
          as: 'questions'
        },
        {
          model: Classroom,
          as: 'classroom',
          attributes: ['id', 'name', 'subject']
        }
      ]
    });

    if (!quiz) {
      const error = new Error('Quiz not found or access denied for your organization.');
      error.statusCode = 404;
      throw error;
    }

    return quiz;
  }

  /**
   * Create a new Quiz with MCQ & Subjective questions for an organization
   */
  static async createQuiz(quizData, organizationId) {
    const {
      title,
      description,
      timeLimit,
      classroomId,
      testType,
      shuffleQuestions,
      shuffleOptions,
      showResultImmediately,
      startWindow,
      endWindow,
      questions = []
    } = quizData;

    if (!title || !title.trim()) {
      const error = new Error('Quiz title is required.');
      error.statusCode = 400;
      throw error;
    }

    // Verify classroom belongs to organization if provided
    let validClassroomId = null;
    if (classroomId) {
      const classroom = await Classroom.findOne({
        where: { id: classroomId, organization_id: organizationId }
      });
      if (classroom) {
        validClassroomId = classroom.id;
      }
    }

    // Create McqTest record
    const quiz = await McqTest.create({
      organization_id: organizationId,
      classroom_id: validClassroomId,
      title: title.trim(),
      description: description ? description.trim() : null,
      total_questions: questions.length,
      time_limit: parseInt(timeLimit) || 30,
      test_type: testType || 'session',
      shuffle_questions: !!shuffleQuestions,
      shuffle_options: !!shuffleOptions,
      show_result_immediately: showResultImmediately !== false,
      start_window: startWindow ? new Date(startWindow) : null,
      end_window: endWindow ? new Date(endWindow) : null
    });

    // Create questions
    let createdQuestions = [];
    if (questions.length > 0) {
      createdQuestions = await Promise.all(
        questions.map(q => {
          const type = (q.question_type || q.type || 'mcq').toLowerCase();
          const isSubjective = type === 'subjective';

          return McqQuestion.create({
            test_id: quiz.id,
            is_bank: false,
            question_type: isSubjective ? 'subjective' : 'mcq',
            question_text: q.question_text || q.questionText || '',
            option_a: isSubjective ? null : (q.option_a || q.optionA || null),
            option_b: isSubjective ? null : (q.option_b || q.optionB || null),
            option_c: isSubjective ? null : (q.option_c || q.optionC || null),
            option_d: isSubjective ? null : (q.option_d || q.optionD || null),
            correct_answer: isSubjective ? null : (q.correct_answer || q.correctAnswer || 'A'),
            explanation: q.explanation || q.rubric || null,
            difficulty: q.difficulty || 'Medium',
            marks: parseInt(q.marks) || 1
          });
        })
      );
    }

    return { ...quiz.toJSON(), questions: createdQuestions };
  }

  /**
   * Update quiz metadata and questions for an organization
   */
  static async updateQuiz(quizId, quizData, organizationId) {
    const quiz = await McqTest.findOne({
      where: { id: quizId, organization_id: organizationId }
    });

    if (!quiz) {
      const error = new Error('Quiz not found or access denied for your organization.');
      error.statusCode = 404;
      throw error;
    }

    const {
      title,
      description,
      timeLimit,
      classroomId,
      testType,
      shuffleQuestions,
      shuffleOptions,
      showResultImmediately,
      startWindow,
      endWindow,
      activationMode,
      scoreReleaseMode,
      securityForceFullscreen,
      securityTabSwitchBehavior,
      securityMaxWarnings,
      proctorExtensionRequired,
      assignedStudentIds,
      questions
    } = quizData;

    // Verify classroom belongs to organization if provided
    let validClassroomId = quiz.classroom_id;
    if (classroomId !== undefined) {
      if (classroomId) {
        const classroom = await Classroom.findOne({
          where: { id: classroomId, organization_id: organizationId }
        });
        validClassroomId = classroom ? classroom.id : null;
      } else {
        validClassroomId = null;
      }
    }

    await quiz.update({
      title: title ? title.trim() : quiz.title,
      description: description !== undefined ? description : quiz.description,
      time_limit: timeLimit !== undefined ? parseInt(timeLimit) : quiz.time_limit,
      classroom_id: validClassroomId,
      test_type: testType || quiz.test_type,
      shuffle_questions: shuffleQuestions !== undefined ? !!shuffleQuestions : quiz.shuffle_questions,
      shuffle_options: shuffleOptions !== undefined ? !!shuffleOptions : quiz.shuffle_options,
      show_result_immediately: showResultImmediately !== undefined ? !!showResultImmediately : quiz.show_result_immediately,
      start_window: startWindow !== undefined ? (startWindow ? new Date(startWindow) : null) : quiz.start_window,
      end_window: endWindow !== undefined ? (endWindow ? new Date(endWindow) : null) : quiz.end_window,
      activation_mode: activationMode !== undefined ? activationMode : quiz.activation_mode,
      score_release_mode: scoreReleaseMode !== undefined ? scoreReleaseMode : quiz.score_release_mode,
      security_force_fullscreen: securityForceFullscreen !== undefined ? !!securityForceFullscreen : quiz.security_force_fullscreen,
      security_tab_switch_behavior: securityTabSwitchBehavior !== undefined ? securityTabSwitchBehavior : quiz.security_tab_switch_behavior,
      security_max_warnings: securityMaxWarnings !== undefined ? parseInt(securityMaxWarnings) : quiz.security_max_warnings,
      proctor_extension_required: proctorExtensionRequired !== undefined ? !!proctorExtensionRequired : quiz.proctor_extension_required,
      assigned_student_ids: assignedStudentIds !== undefined ? assignedStudentIds : quiz.assigned_student_ids,
      total_questions: questions ? questions.length : quiz.total_questions
    });

    // Replace questions
    await McqQuestion.destroy({ where: { test_id: quiz.id } });

    let updatedQuestions = [];
    if (questions.length > 0) {
      updatedQuestions = await Promise.all(
        questions.map(q => {
          const type = (q.question_type || q.type || 'mcq').toLowerCase();
          const isSubjective = type === 'subjective';

          return McqQuestion.create({
            test_id: quiz.id,
            is_bank: false,
            question_type: isSubjective ? 'subjective' : 'mcq',
            question_text: q.question_text || q.questionText || '',
            option_a: isSubjective ? null : (q.option_a || q.optionA || null),
            option_b: isSubjective ? null : (q.option_b || q.optionB || null),
            option_c: isSubjective ? null : (q.option_c || q.optionC || null),
            option_d: isSubjective ? null : (q.option_d || q.optionD || null),
            correct_answer: isSubjective ? null : (q.correct_answer || q.correctAnswer || 'A'),
            explanation: q.explanation || q.rubric || null,
            difficulty: q.difficulty || 'Medium',
            marks: parseInt(q.marks) || 1
          });
        })
      );
    }

    return { ...quiz.toJSON(), questions: updatedQuestions };
  }

  /**
   * Delete quiz for an organization
   */
  static async deleteQuiz(quizId, organizationId) {
    const quiz = await McqTest.findOne({
      where: { id: quizId, organization_id: organizationId }
    });

    if (!quiz) {
      const error = new Error('Quiz not found or access denied for your organization.');
      error.statusCode = 404;
      throw error;
    }

    // McqQuestion records will be deleted automatically via CASCADE
    await quiz.destroy();
    return { message: 'Quiz deleted successfully.' };
  }

  /**
   * Assign a Quiz Template to a Classroom
   */
  static async assignQuizToClassroom(payload, organizationId) {
    const {
      templateQuizId,
      classroomId,
      title,
      description,
      timeLimit,
      startWindow,
      endWindow,
      activationMode,
      scoreReleaseMode,
      securityForceFullscreen,
      securityTabSwitchBehavior,
      securityMaxWarnings,
      proctorExtensionRequired,
      shuffleQuestions,
      shuffleOptions,
      assignedStudentIds = []
    } = payload;

    if (!classroomId) {
      const error = new Error('Classroom ID is required to assign quiz.');
      error.statusCode = 400;
      throw error;
    }

    // Verify classroom belongs to organization
    const classroom = await Classroom.findOne({
      where: { id: classroomId, organization_id: organizationId }
    });
    if (!classroom) {
      const error = new Error('Classroom not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    // Fetch template questions if templateQuizId provided
    let questionsToClone = [];
    let baseTitle = title;
    let baseDescription = description;

    if (templateQuizId) {
      const template = await McqTest.findOne({
        where: { id: templateQuizId, organization_id: organizationId },
        include: [{ model: McqQuestion, as: 'questions' }]
      });
      if (template) {
        questionsToClone = template.questions || [];
        if (!baseTitle) baseTitle = template.title;
        if (!baseDescription) baseDescription = template.description;
      }
    }

    // Determine initial status based on start window and activation mode
    let initialStatus = 'scheduled';
    const now = new Date();
    const start = startWindow ? new Date(startWindow) : null;
    const end = endWindow ? new Date(endWindow) : null;

    if (activationMode === 'auto' && start && now >= start) {
      initialStatus = 'active';
    }

    // Create assigned McqTest record for classroom
    const assignedQuiz = await McqTest.create({
      organization_id: organizationId,
      classroom_id: classroom.id,
      title: baseTitle || 'Assigned Quiz',
      description: baseDescription || null,
      total_questions: questionsToClone.length,
      time_limit: parseInt(timeLimit) || 30,
      test_type: 'session',
      start_window: start,
      end_window: end,
      activation_mode: activationMode || 'auto',
      status: initialStatus,
      score_release_mode: scoreReleaseMode || 'immediate',
      show_result_immediately: scoreReleaseMode === 'immediate',
      security_force_fullscreen: !!securityForceFullscreen,
      security_tab_switch_behavior: securityTabSwitchBehavior || 'warning',
      security_max_warnings: parseInt(securityMaxWarnings) || 3,
      proctor_extension_required: !!proctorExtensionRequired,
      shuffle_questions: !!shuffleQuestions,
      shuffle_options: !!shuffleOptions,
      assigned_student_ids: assignedStudentIds
    });

    // Clone questions for the assigned quiz
    if (questionsToClone.length > 0) {
      await Promise.all(
        questionsToClone.map(q => McqQuestion.create({
          test_id: assignedQuiz.id,
          is_bank: false,
          question_type: q.question_type || 'mcq',
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || 'Medium',
          marks: q.marks || 1
        }))
      );
    }

    return assignedQuiz;
  }

  /**
   * Get quizzes assigned to a specific classroom with pagination and search filter
   */
  static async getClassroomAssignedQuizzes(classroomId, organizationId, options = {}) {
    const classroom = await Classroom.findOne({
      where: { id: classroomId, organization_id: organizationId }
    });

    if (!classroom) {
      const error = new Error('Classroom not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, parseInt(options.limit, 10) || 5);
    const offset = (page - 1) * limit;
    const search = options.search ? options.search.trim() : '';

    const where = {
      classroom_id: classroomId,
      organization_id: organizationId
    };

    if (search) {
      const searchTerm = `%${search}%`;
      where[Op.or] = [
        { title: { [Op.iLike]: searchTerm } },
        { description: { [Op.iLike]: searchTerm } }
      ];
    }

    const { count, rows: quizzes } = await McqTest.findAndCountAll({
      where,
      include: [
        {
          model: McqQuestion,
          as: 'questions',
          attributes: ['id', 'question_type', 'marks']
        },
        {
          model: McqAttempt,
          as: 'attempts',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / limit) || 1;

    return {
      quizzes,
      total: count,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Manually start a quiz
   */
  static async manualStartQuiz(quizId, organizationId) {
    const quiz = await McqTest.findOne({
      where: { id: quizId, organization_id: organizationId }
    });
    if (!quiz) {
      const error = new Error('Quiz not found.');
      error.statusCode = 404;
      throw error;
    }
    await quiz.update({ status: 'active', start_window: new Date() });
    return quiz;
  }

  /**
   * Manually end/complete a quiz
   */
  static async manualEndQuiz(quizId, organizationId) {
    const quiz = await McqTest.findOne({
      where: { id: quizId, organization_id: organizationId }
    });
    if (!quiz) {
      const error = new Error('Quiz not found.');
      error.statusCode = 404;
      throw error;
    }
    await quiz.update({ status: 'completed', end_window: new Date() });
    return quiz;
  }

  /**
   * Publish / Release scores after teacher review
   */
  static async releaseQuizScores(quizId, organizationId) {
    const quiz = await McqTest.findOne({
      where: { id: quizId, organization_id: organizationId }
    });
    if (!quiz) {
      const error = new Error('Quiz not found.');
      error.statusCode = 404;
      throw error;
    }
    await quiz.update({ show_result_immediately: true, score_release_mode: 'immediate' });
    return quiz;
  }
}
