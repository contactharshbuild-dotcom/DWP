import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassroomResource = sequelize.define('ClassroomResource', {
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
  drive_file_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  drive_link: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  folder_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'classroom_folders',
      key: 'id'
    }
  },
  module_session: {
    type: DataTypes.STRING,
    allowNull: true
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
  }
}, {
  tableName: 'classroom_resources',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ClassroomResource;
