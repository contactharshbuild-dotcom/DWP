import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  // Add visibility and batch columns to classroom_folders if not existing
  await queryInterface.addColumn('classroom_folders', 'visibility', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'all_students'
  }).catch(() => {});

  await queryInterface.addColumn('classroom_folders', 'batch', {
    type: DataTypes.STRING,
    allowNull: true
  }).catch(() => {});

  await queryInterface.addColumn('classroom_folders', 'assigned_student_ids', {
    type: DataTypes.JSON,
    allowNull: true
  }).catch(() => {});

  await queryInterface.addColumn('classroom_folders', 'assigned_teacher_ids', {
    type: DataTypes.JSON,
    allowNull: true
  }).catch(() => {});

  await queryInterface.addColumn('classroom_folders', 'scheduled_at', {
    type: DataTypes.DATE,
    allowNull: true
  }).catch(() => {});

  await queryInterface.addColumn('classroom_folders', 'expiry_at', {
    type: DataTypes.DATE,
    allowNull: true
  }).catch(() => {});
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('classroom_folders', 'visibility').catch(() => {});
  await queryInterface.removeColumn('classroom_folders', 'batch').catch(() => {});
  await queryInterface.removeColumn('classroom_folders', 'assigned_student_ids').catch(() => {});
  await queryInterface.removeColumn('classroom_folders', 'assigned_teacher_ids').catch(() => {});
  await queryInterface.removeColumn('classroom_folders', 'scheduled_at').catch(() => {});
  await queryInterface.removeColumn('classroom_folders', 'expiry_at').catch(() => {});
}
