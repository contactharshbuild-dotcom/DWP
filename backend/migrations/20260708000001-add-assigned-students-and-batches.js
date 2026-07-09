export async function up(queryInterface, Sequelize) {
  // Add columns to practical_exams
  await queryInterface.addColumn('practical_exams', 'batches', {
    type: Sequelize.JSON,
    allowNull: true
  });
  await queryInterface.addColumn('practical_exams', 'assigned_student_ids', {
    type: Sequelize.JSON,
    allowNull: true
  });

  // Add column to mcq_tests
  await queryInterface.addColumn('mcq_tests', 'assigned_student_ids', {
    type: Sequelize.JSON,
    allowNull: true
  });

  // Add column to classroom_resources
  await queryInterface.addColumn('classroom_resources', 'assigned_student_ids', {
    type: Sequelize.JSON,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  // Remove column from classroom_resources
  await queryInterface.removeColumn('classroom_resources', 'assigned_student_ids');

  // Remove column from mcq_tests
  await queryInterface.removeColumn('mcq_tests', 'assigned_student_ids');

  // Remove columns from practical_exams
  await queryInterface.removeColumn('practical_exams', 'assigned_student_ids');
  await queryInterface.removeColumn('practical_exams', 'batches');
}
