export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'username', {
    type: Sequelize.STRING,
    unique: true,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('users', 'username');
}
