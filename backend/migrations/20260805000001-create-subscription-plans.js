import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  // Create subscription_plans table
  await queryInterface.createTable('subscription_plans', {
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
      defaultValue: 'USD'
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
      defaultValue: -1
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
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Add subscription columns to organizations table safely
  const tableInfo = await queryInterface.describeTable('organizations');
  
  if (!tableInfo.subscription_plan_id) {
    await queryInterface.addColumn('organizations', 'subscription_plan_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'subscription_plans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }

  if (!tableInfo.billing_cycle) {
    await queryInterface.addColumn('organizations', 'billing_cycle', {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'monthly'
    });
  }

  if (!tableInfo.subscription_status) {
    await queryInterface.addColumn('organizations', 'subscription_status', {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'active'
    });
  }

  if (!tableInfo.subscription_expires_at) {
    await queryInterface.addColumn('organizations', 'subscription_expires_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  }

  // Seed initial standard subscription plans
  const now = new Date();
  await queryInterface.bulkInsert('subscription_plans', [
    {
      name: 'Starter Tier',
      slug: 'starter-tier',
      description: 'Ideal for small tutoring centers or single classroom setups.',
      currency: 'USD',
      monthly_price: 29.00,
      yearly_price: 290.00,
      max_teachers: 5,
      max_students: 100,
      max_quizzes: 20,
      max_documents: 50,
      max_practical_exams: 10,
      is_active: true,
      is_featured: false,
      created_at: now,
      updated_at: now
    },
    {
      name: 'Pro Educator',
      slug: 'pro-educator',
      description: 'Designed for growing schools and institutes needing higher limits.',
      currency: 'INR',
      monthly_price: 3999.00,
      yearly_price: 39999.00,
      max_teachers: 25,
      max_students: 1000,
      max_quizzes: 200,
      max_documents: 500,
      max_practical_exams: 50,
      is_active: true,
      is_featured: true,
      created_at: now,
      updated_at: now
    },
    {
      name: 'Enterprise Unlimited',
      slug: 'enterprise-unlimited',
      description: 'Unlimited access for large universities and educational organizations.',
      currency: 'USD',
      monthly_price: 199.00,
      yearly_price: 1990.00,
      max_teachers: -1,
      max_students: -1,
      max_quizzes: -1,
      max_documents: -1,
      max_practical_exams: -1,
      is_active: true,
      is_featured: false,
      created_at: now,
      updated_at: now
    }
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('organizations', 'subscription_expires_at');
  await queryInterface.removeColumn('organizations', 'subscription_status');
  await queryInterface.removeColumn('organizations', 'billing_cycle');
  await queryInterface.removeColumn('organizations', 'subscription_plan_id');
  await queryInterface.dropTable('subscription_plans');
}
