import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const McqTest = sequelize.define('McqTest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    }
  },
  classroom_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'classrooms',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  total_questions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  time_limit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30
  },
  shuffle_questions: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  shuffle_options: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  show_result_immediately: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  test_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'session'
  },
  start_window: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_window: {
    type: DataTypes.DATE,
    allowNull: true
  },
  batches: {
    type: DataTypes.JSON,
    allowNull: true
  },
  assigned_student_ids: {
    type: DataTypes.JSON,
    allowNull: true
  },
  security_tab_switch_behavior: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'warning'
  },
  security_max_warnings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3
  },
  security_force_fullscreen: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  activation_mode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'auto'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'scheduled'
  },
  score_release_mode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'immediate'
  },
  proctor_extension_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'mcq_tests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default McqTest;
