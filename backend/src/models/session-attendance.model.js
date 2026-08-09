import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SessionAttendance = sequelize.define('SessionAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'module_sessions',
      key: 'id'
    }
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING, // 'present', 'absent', 'late', 'excused'
    allowNull: false,
    defaultValue: 'present'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  marked_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'session_attendance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default SessionAttendance;
