import sequelize from '../config/database.js';
import Organization from './organization.model.js';
import User from './user.model.js';
import Classroom from './classroom.model.js';
import ClassroomTeacher from './classroom-teacher.model.js';

const db = {
  sequelize,
  Organization,
  User,
  Classroom,
  ClassroomTeacher
};

// Establish relationships
Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

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

// Run model associations if defined
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export { sequelize, Organization, User, Classroom, ClassroomTeacher };
export default db;
