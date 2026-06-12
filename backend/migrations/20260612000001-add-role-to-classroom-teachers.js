export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('classroom_teachers', 'role', {
    type: Sequelize.STRING,
    defaultValue: 'co-teacher',
    allowNull: false
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('classroom_teachers', 'role');
}
