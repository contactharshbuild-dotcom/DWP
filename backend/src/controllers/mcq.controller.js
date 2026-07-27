import { McqTest, McqQuestion, McqAttempt, Classroom, ClassroomTeacher, User } from '../models/index.js';
import { Op } from 'sequelize';

// Shuffle helper
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 1. Create MCQ Test (Teacher/Admin)
export const createMcqTest = async (req, res) => {
  try {
    const { 
      classroomId, title, description, timeLimit, shuffleQuestions, 
      shuffleOptions, showResultImmediately, testType, startWindow, 
      endWindow, batches, assignedStudentIds, securityTabSwitchBehavior, securityMaxWarnings, 
      securityForceFullscreen, questions 
    } = req.body;

    if (!classroomId || !title || !startWindow || !endWindow || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Missing required test configurations or questions.' });
    }

    const test = await McqTest.create({
      classroom_id: classroomId,
      title,
      description,
      total_questions: questions.length,
      time_limit: parseInt(timeLimit) || 30,
      shuffle_questions: !!shuffleQuestions,
      shuffle_options: !!shuffleOptions,
      show_result_immediately: showResultImmediately !== false,
      test_type: testType || 'session',
      start_window: new Date(startWindow),
      end_window: new Date(endWindow),
      batches: batches || [],
      assigned_student_ids: assignedStudentIds || [],
      security_tab_switch_behavior: securityTabSwitchBehavior || 'warning',
      security_max_warnings: parseInt(securityMaxWarnings) || 3,
      security_force_fullscreen: !!securityForceFullscreen
    });

    // Save questions associated with this test
    const createdQuestions = await Promise.all(
      questions.map(q => McqQuestion.create({
        test_id: test.id,
        is_bank: false,
        course: q.course || null,
        module: q.module || null,
        session: q.session || null,
        topic: q.topic || null,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        difficulty: q.difficulty || 'Medium',
        marks: parseInt(q.marks) || 1
      }))
    );

    return res.status(201).json({
      message: 'MCQ Test created successfully.',
      test: { ...test.toJSON(), questions: createdQuestions }
    });
  } catch (error) {
    console.error('Error in createMcqTest:', error);
    return res.status(500).json({ message: 'Internal server error while creating test.', error: error.message });
  }
};

// 2. Clone MCQ Test (Teacher/Admin)
export const cloneMcqTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const existingTest = await McqTest.findByPk(testId, {
      include: [{ model: McqQuestion, as: 'questions' }]
    });

    if (!existingTest) {
      return res.status(404).json({ message: 'Test not found.' });
    }

    const clonedTest = await McqTest.create({
      classroom_id: existingTest.classroom_id,
      title: `${existingTest.title} (Clone)`,
      description: existingTest.description,
      total_questions: existingTest.total_questions,
      time_limit: existingTest.time_limit,
      shuffle_questions: existingTest.shuffle_questions,
      shuffle_options: existingTest.shuffle_options,
      show_result_immediately: existingTest.show_result_immediately,
      test_type: existingTest.test_type,
      start_window: existingTest.start_window,
      end_window: existingTest.end_window,
      batches: existingTest.batches,
      security_tab_switch_behavior: existingTest.security_tab_switch_behavior,
      security_max_warnings: existingTest.security_max_warnings,
      security_force_fullscreen: existingTest.security_force_fullscreen
    });

    const clonedQuestions = await Promise.all(
      existingTest.questions.map(q => McqQuestion.create({
        test_id: clonedTest.id,
        is_bank: false,
        course: q.course,
        module: q.module,
        session: q.session,
        topic: q.topic,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        marks: q.marks
      }))
    );

    return res.status(201).json({
      message: 'Test cloned successfully.',
      test: { ...clonedTest.toJSON(), questions: clonedQuestions }
    });
  } catch (error) {
    console.error('Error in cloneMcqTest:', error);
    return res.status(500).json({ message: 'Internal server error while cloning test.', error: error.message });
  }
};

// 3. Get Classroom MCQ Tests
export const getClassroomMcqTests = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userRole = req.user.role;

    const queryOptions = {
      where: { classroom_id: classroomId },
      include: [{
        model: McqAttempt,
        as: 'attempts',
        where: userRole === 'student' ? { user_id: req.user.id } : {},
        required: false
      }],
      order: [['created_at', 'DESC']]
    };

    const tests = await McqTest.findAll(queryOptions);

    if (userRole === 'student') {
      const student = await User.findByPk(req.user.id);
      const studentBatch = student ? student.batch : null;

      // Filter tests visible to student's batch, all students, or assigned individually
      const filteredTests = tests.filter(test => {
        const assignedIds = test.assigned_student_ids || [];
        if (assignedIds.length > 0) {
          return assignedIds.includes(req.user.id);
        }

        const testBatches = test.batches || [];
        return testBatches.length === 0 || testBatches.includes(studentBatch);
      });

      return res.json({ tests: filteredTests });
    }

    return res.json({ tests });
  } catch (error) {
    console.error('Error in getClassroomMcqTests:', error);
    return res.status(500).json({ message: 'Internal server error while fetching tests.', error: error.message });
  }
};

// 4. Get MCQ Test Details (Students get filtered/shuffled questions)
export const getMcqTestDetails = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await McqTest.findByPk(testId, {
      include: [{ model: McqQuestion, as: 'questions' }]
    });

    if (!test) {
      return res.status(404).json({ message: 'MCQ Test not found.' });
    }

    // Convert to JSON to manipulate
    const testJson = test.toJSON();

    if (req.user.role === 'student') {
      // Students should not see correct answers or explanations before submitting/deadline
      const now = new Date();
      const afterDeadline = now > new Date(test.end_window);
      const hideAnswers = !test.show_result_immediately || !afterDeadline;

      let processedQuestions = testJson.questions.map(q => {
        const isSubjective = q.question_type === 'subjective';
        const options = isSubjective ? [] : [
          { key: 'A', text: q.option_a },
          { key: 'B', text: q.option_b },
          { key: 'C', text: q.option_c },
          { key: 'D', text: q.option_d }
        ];

        // Shuffle options if configured for MCQ
        const finalOptions = (!isSubjective && test.shuffle_options) ? shuffleArray(options) : options;

        return {
          id: q.id,
          question_type: q.question_type || 'mcq',
          question_text: q.question_text,
          options: finalOptions,
          marks: q.marks,
          correct_answer: hideAnswers ? undefined : q.correct_answer,
          explanation: hideAnswers ? undefined : q.explanation
        };
      });

      // Shuffle questions if configured
      if (test.shuffle_questions) {
        processedQuestions = shuffleArray(processedQuestions);
      }

      testJson.questions = processedQuestions;
    }

    return res.json({ test: testJson });
  } catch (error) {
    console.error('Error in getMcqTestDetails:', error);
    return res.status(500).json({ message: 'Internal server error while retrieving test details.', error: error.message });
  }
};

// 5. Start MCQ Attempt (Student)
export const startMcqAttempt = async (req, res) => {
  try {
    const { testId } = req.body;
    const userId = req.user.id;

    const test = await McqTest.findByPk(testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found.' });
    }

    // Check if within window
    const now = new Date();
    if (now < new Date(test.start_window) || now > new Date(test.end_window)) {
      return res.status(400).json({ message: 'Exam window is currently closed.' });
    }

    // Check if already attempted
    const existingAttempt = await McqAttempt.findOne({
      where: { test_id: testId, user_id: userId }
    });
    if (existingAttempt) {
      return res.status(400).json({ message: 'You have already attempted this test.' });
    }

    const attempt = await McqAttempt.create({
      test_id: testId,
      user_id: userId,
      score: 0.0,
      percentage: 0.0,
      time_taken: 0,
      responses: {},
      tab_switch_count: 0,
      tab_switch_log: [],
      fullscreen_exit_count: 0,
      fullscreen_exit_log: [],
      start_time: now,
      status: 'started'
    });

    return res.status(201).json({ message: 'Attempt started.', attempt });
  } catch (error) {
    console.error('Error in startMcqAttempt:', error);
    return res.status(500).json({ message: 'Internal server error while starting attempt.', error: error.message });
  }
};

// 6. Log Proctoring Event (Tab Switch / Fullscreen exit)
export const logProctorEvent = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { eventType, timestamp, duration } = req.body; // eventType: 'tab_switch' or 'fullscreen_exit'

    const attempt = await McqAttempt.findByPk(attemptId, {
      include: [{ model: McqTest, as: 'test' }]
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    if (attempt.status !== 'started') {
      return res.status(400).json({ message: 'Attempt is already finished.' });
    }

    const test = attempt.test;
    const now = new Date();

    if (eventType === 'tab_switch') {
      const logs = attempt.tab_switch_log || [];
      logs.push({ timestamp: timestamp || now.toISOString(), duration: duration || 0 });
      attempt.tab_switch_log = logs;
      attempt.tab_switch_count += 1;

      // Handle auto-submit behavior based on security configurations
      const behavior = test.security_tab_switch_behavior;
      if (
        (behavior === 'immediate_auto_submit') ||
        (behavior === 'auto_submit_n_warnings' && attempt.tab_switch_count >= test.security_max_warnings)
      ) {
        attempt.status = 'submitted';
        attempt.submit_type = 'auto';
        attempt.end_time = now;
        attempt.time_taken = Math.floor((now.getTime() - new Date(attempt.start_time).getTime()) / 1000);
        await attempt.save();

        return res.json({ 
          message: 'Attempt automatically submitted due to security violation.',
          attempt,
          triggeredAutoSubmit: true
        });
      }
    } else if (eventType === 'fullscreen_exit') {
      const logs = attempt.fullscreen_exit_log || [];
      logs.push({ timestamp: timestamp || now.toISOString() });
      attempt.fullscreen_exit_log = logs;
      attempt.fullscreen_exit_count += 1;
    }

    await attempt.save();
    return res.json({ attempt, triggeredAutoSubmit: false });
  } catch (error) {
    console.error('Error in logProctorEvent:', error);
    return res.status(500).json({ message: 'Internal server error while logging security event.', error: error.message });
  }
};

// 7. Submit MCQ Attempt
export const submitMcqAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses, submitType } = req.body; // responses: { [questionId]: 'A'/'B'/'C'/'D' }

    const attempt = await McqAttempt.findByPk(attemptId, {
      include: [{ model: McqTest, as: 'test', include: [{ model: McqQuestion, as: 'questions' }] }]
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    if (attempt.status !== 'started') {
      return res.status(400).json({ message: 'Attempt already submitted.' });
    }

    const test = attempt.test;
    const questions = test.questions;
    const now = new Date();

    // Grade attempt
    let totalMarksEarned = 0;
    let maxPossibleMarks = 0;

    questions.forEach(q => {
      maxPossibleMarks += q.marks;
      const studentAnswer = responses ? responses[q.id] : null;

      // Grade MCQ questions with non-null correct_answer
      if (q.question_type !== 'subjective' && q.correct_answer && studentAnswer) {
        if (typeof studentAnswer === 'string' && studentAnswer.toUpperCase() === q.correct_answer.toUpperCase()) {
          totalMarksEarned += q.marks;
        }
      }
    });

    const percentage = maxPossibleMarks > 0 ? (totalMarksEarned / maxPossibleMarks) * 100 : 0;

    attempt.score = totalMarksEarned;
    attempt.percentage = parseFloat(percentage.toFixed(2));
    attempt.responses = responses;
    attempt.end_time = now;
    attempt.time_taken = Math.floor((now.getTime() - new Date(attempt.start_time).getTime()) / 1000);
    attempt.submit_type = submitType || 'manual';
    attempt.status = 'submitted';

    await attempt.save();

    return res.json({
      message: 'Attempt submitted successfully.',
      attempt: {
        id: attempt.id,
        score: attempt.score,
        percentage: attempt.percentage,
        time_taken: attempt.time_taken,
        status: attempt.status,
        submit_type: attempt.submit_type
      }
    });
  } catch (error) {
    console.error('Error in submitMcqAttempt:', error);
    return res.status(500).json({ message: 'Internal server error while submitting attempt.', error: error.message });
  }
};

// 8. Get Attempt Details (For Results screen)
export const getMcqAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await McqAttempt.findByPk(attemptId, {
      include: [{ model: McqTest, as: 'test', include: [{ model: McqQuestion, as: 'questions' }] }, { model: User, as: 'user' }]
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    const test = attempt.test;
    const now = new Date();
    const afterDeadline = now > new Date(test.end_window);

    // Security check: students can only see details if result immediately or after deadline
    if (req.user.role === 'student' && req.user.id !== attempt.user_id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const showAnswers = req.user.role === 'teacher' || req.user.role === 'admin' || test.show_result_immediately || afterDeadline;

    const attemptJson = attempt.toJSON();
    if (!showAnswers) {
      // Hide correct answers and explanations
      attemptJson.test.questions = attemptJson.test.questions.map(q => ({
        ...q,
        correct_answer: undefined,
        explanation: undefined
      }));
    }

    return res.json({ attempt: attemptJson });
  } catch (error) {
    console.error('Error in getMcqAttemptDetails:', error);
    return res.status(500).json({ message: 'Internal server error while retrieving attempt details.', error: error.message });
  }
};

// 9. Get Test Attempt Analytics (Teacher/Admin)
export const getMcqTestAnalytics = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await McqTest.findByPk(testId, {
      include: [
        { model: McqQuestion, as: 'questions' },
        { model: McqAttempt, as: 'attempts', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'batch'] }] }
      ]
    });

    if (!test) {
      return res.status(404).json({ message: 'Test not found.' });
    }

    const attempts = test.attempts || [];
    const questions = test.questions || [];

    // 1. General Metrics
    const totalAttempts = attempts.length;
    const sumScores = attempts.reduce((acc, curr) => acc + curr.score, 0);
    const averageScore = totalAttempts > 0 ? parseFloat((sumScores / totalAttempts).toFixed(2)) : 0;

    // 2. Question-wise analytics
    const questionPerformance = questions.map(q => {
      let correctAttempts = 0;
      attempts.forEach(att => {
        const studentAns = att.responses ? att.responses[q.id] : null;
        if (studentAns && studentAns.toUpperCase() === q.correct_answer.toUpperCase()) {
          correctAttempts += 1;
        }
      });

      const successRate = totalAttempts > 0 ? parseFloat(((correctAttempts / totalAttempts) * 100).toFixed(2)) : 0;
      return {
        id: q.id,
        question_text: q.question_text,
        success_rate: successRate,
        correct_attempts: correctAttempts
      };
    });

    // 3. Students not attempted
    // Find all students in the classroom
    const classroomUsers = await ClassroomTeacher.findAll({
      where: { classroom_id: test.classroom_id, role: 'student', status: 'approved' },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'batch'] }]
    });

    const attemptedUserIds = attempts.map(att => att.user_id);
    const notAttempted = classroomUsers
      .filter(cu => cu.user && !attemptedUserIds.includes(cu.user_id))
      .map(cu => cu.user);

    return res.json({
      analytics: {
        averageScore,
        totalAttempts,
        questionPerformance,
        notAttempted,
        attempts: attempts.map(att => ({
          id: att.id,
          score: att.score,
          percentage: att.percentage,
          time_taken: att.time_taken,
          tab_switch_count: att.tab_switch_count,
          fullscreen_exit_count: att.fullscreen_exit_count,
          status: att.status,
          start_time: att.start_time,
          created_at: att.created_at,
          user: att.user
        }))
      }
    });
  } catch (error) {
    console.error('Error in getMcqTestAnalytics:', error);
    return res.status(500).json({ message: 'Internal server error while loading analytics.', error: error.message });
  }
};

// 10. Reusable Question Bank GET & POST
export const getQuestionBank = async (req, res) => {
  try {
    const { course, module, session, topic } = req.query;
    const filter = { is_bank: true };

    if (course) filter.course = course;
    if (module) filter.module = module;
    if (session) filter.session = session;
    if (topic) filter.topic = topic;

    const questions = await McqQuestion.findAll({ where: filter });
    return res.json({ questions });
  } catch (error) {
    console.error('Error in getQuestionBank:', error);
    return res.status(500).json({ message: 'Internal server error while loading bank.', error: error.message });
  }
};

export const addQuestionToBank = async (req, res) => {
  try {
    const { course, module, session, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, marks } = req.body;

    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
      return res.status(400).json({ message: 'Required question details are missing.' });
    }

    const question = await McqQuestion.create({
      test_id: null,
      is_bank: true,
      course: course || null,
      module: module || null,
      session: session || null,
      topic: topic || null,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      explanation: explanation || null,
      difficulty: difficulty || 'Medium',
      marks: parseInt(marks) || 1
    });

    return res.status(201).json({ message: 'Question added to Question Bank.', question });
  } catch (error) {
    console.error('Error in addQuestionToBank:', error);
    return res.status(500).json({ message: 'Internal server error while saving to bank.', error: error.message });
  }
};

export const assignMcqTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { batches, assignedStudentIds } = req.body;

    const test = await McqTest.findByPk(testId);
    if (!test) {
      return res.status(404).json({ message: 'MCQ Test not found.' });
    }

    test.batches = batches || [];
    test.assigned_student_ids = assignedStudentIds || [];
    await test.save();

    return res.json({ message: 'MCQ Test assignments updated successfully.', test });
  } catch (error) {
    console.error('Error in assignMcqTest:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

