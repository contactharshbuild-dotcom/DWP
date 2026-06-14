import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PracticalExam = sequelize.define('PracticalExam', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  total_marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  }
}, {
  tableName: 'practical_exams',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default PracticalExam;
