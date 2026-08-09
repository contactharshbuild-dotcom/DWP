export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('module_sessions', 'assigned_teacher_ids', {
    type: Sequelize.JSON,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('module_sessions', 'assigned_teacher_ids');
}
