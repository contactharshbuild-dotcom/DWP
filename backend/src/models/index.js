import sequelize from '../config/database.js';
import Organization from './organization.model.js';
import User from './user.model.js';
import Classroom from './classroom.model.js';
import ClassroomTeacher from './classroom-teacher.model.js';
import ClassroomResource from './classroom-resource.model.js';
import ClassroomFolder from './classroom-folder.model.js';
import McqTest from './mcq-test.model.js';
import McqQuestion from './mcq-question.model.js';
import McqAttempt from './mcq-attempt.model.js';
import PracticalExam from './practical-exam.model.js';
import PracticalSubmission from './practical-submission.model.js';
import ClassroomModule from './classroom-module.model.js';
import ModuleSession from './module-session.model.js';
import SessionAttendance from './session-attendance.model.js';
import MaterialBankFolder from './material-bank-folder.model.js';
import MaterialBankItem from './material-bank-item.model.js';
import SubscriptionPlan from './subscription-plan.model.js';

const db = {
  sequelize,
  Organization,
  User,
  Classroom,
  ClassroomTeacher,
  ClassroomResource,
  ClassroomFolder,
  McqTest,
  McqQuestion,
  McqAttempt,
  PracticalExam,
  PracticalSubmission,
  ClassroomModule,
  ModuleSession,
  SessionAttendance,
  MaterialBankFolder,
  MaterialBankItem,
  SubscriptionPlan
};

// Establish relationships
Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// SubscriptionPlan relationships
Organization.belongsTo(SubscriptionPlan, { foreignKey: 'subscription_plan_id', as: 'subscriptionPlan' });
SubscriptionPlan.hasMany(Organization, { foreignKey: 'subscription_plan_id', as: 'organizations' });

Classroom.hasMany(ClassroomModule, { foreignKey: 'classroom_id', as: 'modules', onDelete: 'CASCADE' });
ClassroomModule.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });

ClassroomModule.hasMany(ModuleSession, { foreignKey: 'module_id', as: 'sessions', onDelete: 'CASCADE' });
ModuleSession.belongsTo(ClassroomModule, { foreignKey: 'module_id', as: 'module' });

Organization.hasMany(Classroom, { foreignKey: 'organization_id', as: 'classrooms' });
Classroom.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Many-to-many relationship between Classrooms and Users (acting as Teachers)
Classroom.belongsToMany(User, { 
  through: ClassroomTeacher, 
  foreignKey: 'classroom_id', 
  otherKey: 'user_id',
  as: 'teachers' 
});
User.belongsToMany(Classroom, { 
  through: ClassroomTeacher, 
  foreignKey: 'user_id', 
  otherKey: 'classroom_id',
  as: 'classrooms' 
});

ClassroomTeacher.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ClassroomTeacher.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });

// Resources relationships
Classroom.hasMany(ClassroomResource, { foreignKey: 'classroom_id', as: 'resources', onDelete: 'CASCADE' });
ClassroomResource.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });
User.hasMany(ClassroomResource, { foreignKey: 'uploaded_by', as: 'resources', onDelete: 'SET NULL' });
ClassroomResource.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Folders relationships
Classroom.hasMany(ClassroomFolder, { foreignKey: 'classroom_id', as: 'folders', onDelete: 'CASCADE' });
ClassroomFolder.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });

ClassroomFolder.hasMany(ClassroomResource, { foreignKey: 'folder_id', as: 'resources', onDelete: 'CASCADE' });
ClassroomResource.belongsTo(ClassroomFolder, { foreignKey: 'folder_id', as: 'folder' });

// MCQ relationships
Organization.hasMany(McqTest, { foreignKey: 'organization_id', as: 'organizationQuizzes', onDelete: 'CASCADE' });
McqTest.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Classroom.hasMany(McqTest, { foreignKey: 'classroom_id', as: 'mcqTests', onDelete: 'CASCADE' });
McqTest.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });

McqTest.hasMany(McqQuestion, { foreignKey: 'test_id', as: 'questions', onDelete: 'CASCADE' });
McqQuestion.belongsTo(McqTest, { foreignKey: 'test_id', as: 'test' });

McqTest.hasMany(McqAttempt, { foreignKey: 'test_id', as: 'attempts', onDelete: 'CASCADE' });
McqAttempt.belongsTo(McqTest, { foreignKey: 'test_id', as: 'test' });

User.hasMany(McqAttempt, { foreignKey: 'user_id', as: 'mcqAttempts', onDelete: 'CASCADE' });
McqAttempt.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Practical relationships
Classroom.hasMany(PracticalExam, { foreignKey: 'classroom_id', as: 'practicalExams', onDelete: 'CASCADE' });
PracticalExam.belongsTo(Classroom, { foreignKey: 'classroom_id', as: 'classroom' });

PracticalExam.hasMany(PracticalSubmission, { foreignKey: 'practical_id', as: 'submissions', onDelete: 'CASCADE' });
PracticalSubmission.belongsTo(PracticalExam, { foreignKey: 'practical_id', as: 'practicalExam' });

User.hasMany(PracticalSubmission, { foreignKey: 'user_id', as: 'practicalSubmissions', onDelete: 'CASCADE' });
PracticalSubmission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Session Attendance relationships
ModuleSession.hasMany(SessionAttendance, { foreignKey: 'session_id', as: 'attendances', onDelete: 'CASCADE' });
SessionAttendance.belongsTo(ModuleSession, { foreignKey: 'session_id', as: 'session' });

User.hasMany(SessionAttendance, { foreignKey: 'student_id', as: 'sessionAttendances', onDelete: 'CASCADE' });
SessionAttendance.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
SessionAttendance.belongsTo(User, { foreignKey: 'marked_by', as: 'marker' });

// Material Bank relationships
Organization.hasMany(MaterialBankFolder, { foreignKey: 'organization_id', as: 'materialBankFolders', onDelete: 'CASCADE' });
MaterialBankFolder.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
User.hasMany(MaterialBankFolder, { foreignKey: 'created_by', as: 'materialBankFolders', onDelete: 'CASCADE' });
MaterialBankFolder.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

MaterialBankFolder.hasMany(MaterialBankFolder, { foreignKey: 'parent_id', as: 'subfolders', onDelete: 'CASCADE' });
MaterialBankFolder.belongsTo(MaterialBankFolder, { foreignKey: 'parent_id', as: 'parent' });

Organization.hasMany(MaterialBankItem, { foreignKey: 'organization_id', as: 'materialBankItems', onDelete: 'CASCADE' });
MaterialBankItem.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

MaterialBankFolder.hasMany(MaterialBankItem, { foreignKey: 'folder_id', as: 'items', onDelete: 'CASCADE' });
MaterialBankItem.belongsTo(MaterialBankFolder, { foreignKey: 'folder_id', as: 'folder' });

User.hasMany(MaterialBankItem, { foreignKey: 'uploaded_by', as: 'materialBankItems', onDelete: 'CASCADE' });
MaterialBankItem.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Run model associations if defined
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export { 
  sequelize, 
  Organization, 
  User, 
  Classroom, 
  ClassroomTeacher, 
  ClassroomResource, 
  ClassroomFolder,
  McqTest,
  McqQuestion,
  McqAttempt,
  PracticalExam,
  PracticalSubmission,
  ClassroomModule,
  ModuleSession,
  SessionAttendance,
  MaterialBankFolder,
  MaterialBankItem,
  SubscriptionPlan
};
export default db;

