import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ModuleSession = sequelize.define('ModuleSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'classroom_modules',
      key: 'id'
    }
  },
  session_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  part_extension: {
    type: DataTypes.STRING,
    allowNull: true // e.g. 'Part 1', 'Part 2', etc.
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  start_time: {
    type: DataTypes.STRING, // e.g. '10:00'
    allowNull: false
  },
  end_time: {
    type: DataTypes.STRING, // e.g. '11:30'
    allowNull: false
  },
  mode: {
    type: DataTypes.STRING, // 'online' or 'offline'
    allowNull: false,
    defaultValue: 'offline'
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: true
  },
  meet_link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING, // 'Scheduled', 'Live', 'Completed', 'Cancelled'
    allowNull: false,
    defaultValue: 'Scheduled'
  },
  batches: {
    type: DataTypes.JSON, // JSON array of batches: ['Batch A', 'Batch B']
    allowNull: true
  },
  assigned_student_ids: {
    type: DataTypes.JSON, // JSON array of student user IDs: [1, 2, 3]
    allowNull: true
  },
  assigned_teacher_ids: {
    type: DataTypes.JSON, // JSON array of teacher user IDs: [1, 2, 3]
    allowNull: true
  }
}, {
  tableName: 'module_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ModuleSession;
