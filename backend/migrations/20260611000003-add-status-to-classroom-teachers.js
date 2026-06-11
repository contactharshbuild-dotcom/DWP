export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('classroom_teachers', 'status', {
    type: Sequelize.STRING,
    defaultValue: 'pending',
    allowNull: false
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('classroom_teachers', 'status');
}
