import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const McqQuestion = sequelize.define('McqQuestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  test_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'mcq_tests',
      key: 'id'
    }
  },
  is_bank: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  course: {
    type: DataTypes.STRING,
    allowNull: true
  },
  module: {
    type: DataTypes.STRING,
    allowNull: true
  },
  session: {
    type: DataTypes.STRING,
    allowNull: true
  },
  topic: {
    type: DataTypes.STRING,
    allowNull: true
  },
  question_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'mcq'
  },
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  option_a: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  option_b: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  option_c: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  option_d: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  correct_answer: {
    type: DataTypes.STRING,
    allowNull: true
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  difficulty: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Medium'
  },
  marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'mcq_questions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default McqQuestion;
