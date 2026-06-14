import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PracticalSubmission = sequelize.define('PracticalSubmission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  practical_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'practical_exams',
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
  text_answer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  github_link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  drive_link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  submitted_files: {
    type: DataTypes.JSON,
    allowNull: true
  },
  graded: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  grade_components: {
    type: DataTypes.JSON,
    allowNull: true
  },
  total_grade: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'practical_submissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default PracticalSubmission;
