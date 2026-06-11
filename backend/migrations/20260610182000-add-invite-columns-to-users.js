export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'invite_token', {
    type: Sequelize.STRING,
    unique: true,
    allowNull: true
  });
  
  await queryInterface.addColumn('users', 'invite_expires', {
    type: Sequelize.DATE,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('users', 'invite_token');
  await queryInterface.removeColumn('users', 'invite_expires');
}
