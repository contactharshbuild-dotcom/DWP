import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassroomFolder = sequelize.define('ClassroomFolder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  classroom_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'classrooms',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  visibility: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'all_students'
  },
  batch: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assigned_student_ids: {
    type: DataTypes.JSON,
    allowNull: true
  },
  assigned_teacher_ids: {
    type: DataTypes.JSON,
    allowNull: true
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiry_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'classroom_folders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ClassroomFolder;
