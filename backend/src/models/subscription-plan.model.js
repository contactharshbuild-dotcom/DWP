import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'USD' // 'USD' or 'INR'
  },
  monthly_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  yearly_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  max_teachers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: -1 // -1 means unlimited
  },
  max_students: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: -1
  },
  max_quizzes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: -1
  },
  max_documents: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: -1
  },
  max_practical_exams: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: -1
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'subscription_plans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default SubscriptionPlan;
