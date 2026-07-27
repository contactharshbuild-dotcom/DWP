import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassroomModule = sequelize.define('ClassroomModule', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'classroom_modules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ClassroomModule;
