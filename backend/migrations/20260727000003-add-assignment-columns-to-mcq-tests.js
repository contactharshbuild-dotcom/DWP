export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('mcq_tests', 'activation_mode', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'auto'
  });

  await queryInterface.addColumn('mcq_tests', 'status', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'scheduled'
  });

  await queryInterface.addColumn('mcq_tests', 'score_release_mode', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'immediate'
  });

  await queryInterface.addColumn('mcq_tests', 'proctor_extension_required', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('mcq_tests', 'activation_mode');
  await queryInterface.removeColumn('mcq_tests', 'status');
  await queryInterface.removeColumn('mcq_tests', 'score_release_mode');
  await queryInterface.removeColumn('mcq_tests', 'proctor_extension_required');
}
