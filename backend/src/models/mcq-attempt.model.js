import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const McqAttempt = sequelize.define('McqAttempt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  test_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'mcq_tests',
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
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  percentage: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  time_taken: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  responses: {
    type: DataTypes.JSON,
    allowNull: true
  },
  tab_switch_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  tab_switch_log: {
    type: DataTypes.JSON,
    allowNull: true
  },
  fullscreen_exit_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  fullscreen_exit_log: {
    type: DataTypes.JSON,
    allowNull: true
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  submit_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'manual'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'started'
  }
}, {
  tableName: 'mcq_attempts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default McqAttempt;
