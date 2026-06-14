import { PracticalExam, PracticalSubmission, Classroom, ClassroomTeacher, User } from '../models/index.js';
import { uploadFile } from '../services/storage.service.js';

// 1. Create Practical Exam (Teacher/Admin only)
export const createPracticalExam = async (req, res) => {
  try {
    const { classroomId, title, instructions, dueDate, totalMarks } = req.body;

    if (!classroomId || !title || !instructions || !dueDate) {
      return res.status(400).json({ message: 'Missing required practical exam details.' });
    }

    // Verify classroom
    const classroom = await Classroom.findOne({
      where: { id: classroomId, organization_id: req.user.organizationId }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    const practical = await PracticalExam.create({
      classroom_id: classroomId,
      title,
      instructions,
      due_date: new Date(dueDate),
      total_marks: parseInt(totalMarks) || 100
    });

    return res.status(201).json({ message: 'Practical exam created successfully.', practical });
  } catch (error) {
    console.error('Error in createPracticalExam:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 2. Get Classroom Practical Exams
export const getClassroomPracticalExams = async (req, res) => {
  try {
    const { classroomId } = req.params;

    // Verify classroom
    const classroom = await Classroom.findOne({
      where: { id: classroomId, organization_id: req.user.organizationId }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    const practicals = await PracticalExam.findAll({
      where: { classroom_id: classroomId },
      include: [{
        model: PracticalSubmission,
        as: 'submissions',
        where: req.user.role === 'student' ? { user_id: req.user.id } : {},
        required: false
      }],
      order: [['due_date', 'ASC']]
    });

    return res.json({ practicals });
  } catch (error) {
    console.error('Error in getClassroomPracticalExams:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 3. Submit Practical Exam (Supports files upload + texts/links)
export const submitPracticalExam = async (req, res) => {
  try {
    const { practicalId } = req.params;
    const { textAnswer, githubLink, driveLink } = req.body;
    const files = req.files; // Multer array upload

    const practical = await PracticalExam.findByPk(practicalId);
    if (!practical) {
      return res.status(404).json({ message: 'Practical exam not found.' });
    }

    // Check if student is enrolled in classroom
    const isEnrolled = await ClassroomTeacher.findOne({
      where: { classroom_id: practical.classroom_id, user_id: req.user.id, status: 'approved' }
    });
    if (!isEnrolled) {
      return res.status(403).json({ message: 'You are not enrolled in this classroom.' });
    }

    // Process file uploads if any files are attached
    let uploadedFiles = [];
    if (files && files.length > 0) {
      uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { fileId, webViewLink } = await uploadFile(file.buffer, file.originalname, file.mimetype);
          return {
            name: file.originalname,
            url: webViewLink,
            file_type: file.mimetype
          };
        })
      );
    }

    // Upsert submission
    let submission = await PracticalSubmission.findOne({
      where: { practical_id: practicalId, user_id: req.user.id }
    });

    if (submission) {
      // Append files if resubmitting, or replace
      const existingFiles = submission.submitted_files || [];
      const updatedFiles = [...existingFiles, ...uploadedFiles];

      await submission.update({
        text_answer: textAnswer !== undefined ? textAnswer : submission.text_answer,
        github_link: githubLink !== undefined ? githubLink : submission.github_link,
        drive_link: driveLink !== undefined ? driveLink : submission.drive_link,
        submitted_files: updatedFiles,
        submitted_at: new Date()
      });
    } else {
      submission = await PracticalSubmission.create({
        practical_id: practicalId,
        user_id: req.user.id,
        text_answer: textAnswer || null,
        github_link: githubLink || null,
        drive_link: driveLink || null,
        submitted_files: uploadedFiles,
        graded: false,
        grade_components: {},
        total_grade: 0.0,
        feedback: null,
        submitted_at: new Date()
      });
    }

    return res.status(201).json({ message: 'Submission uploaded successfully.', submission });
  } catch (error) {
    console.error('Error in submitPracticalExam:', error);
    return res.status(500).json({ message: 'Internal server error while saving submission.', error: error.message });
  }
};

// 4. Get Practical Submissions (Teacher grading list)
export const getPracticalSubmissions = async (req, res) => {
  try {
    const { practicalId } = req.params;

    const practical = await PracticalExam.findByPk(practicalId);
    if (!practical) {
      return res.status(404).json({ message: 'Practical exam not found.' });
    }

    // Verify classroom admin/teacher access
    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: { classroom_id: practical.classroom_id, user_id: req.user.id, status: 'approved' }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const submissions = await PracticalSubmission.findAll({
      where: { practical_id: practicalId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'batch'] }],
      order: [['submitted_at', 'DESC']]
    });

    return res.json({ submissions });
  } catch (error) {
    console.error('Error in getPracticalSubmissions:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// 5. Grade Practical Submission (Teacher/Admin only)
export const gradePracticalSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { gradeComponents, totalGrade, feedback } = req.body;

    const submission = await PracticalSubmission.findByPk(submissionId, {
      include: [{ model: PracticalExam, as: 'practicalExam' }]
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const practical = submission.practicalExam;

    // Verify teacher/admin access
    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: { classroom_id: practical.classroom_id, user_id: req.user.id, status: 'approved' }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await submission.update({
      grade_components: gradeComponents || {},
      total_grade: parseFloat(totalGrade) || 0.0,
      feedback: feedback || null,
      graded: true
    });

    return res.json({ message: 'Submission graded successfully.', submission });
  } catch (error) {
    console.error('Error in gradePracticalSubmission:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
