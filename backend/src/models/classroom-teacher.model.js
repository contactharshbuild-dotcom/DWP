import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassroomTeacher = sequelize.define('ClassroomTeacher', {
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    allowNull: false
  }
}, {
  tableName: 'classroom_teachers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ClassroomTeacher;
