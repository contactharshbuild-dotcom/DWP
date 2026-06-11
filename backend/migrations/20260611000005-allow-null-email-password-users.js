export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('users', 'email', {
    type: Sequelize.STRING,
    allowNull: true
  });
  
  await queryInterface.changeColumn('users', 'password', {
    type: Sequelize.STRING,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  // To revert, we'd make them non-null, but caution: if there are null values in the database, this down migration will fail.
  await queryInterface.changeColumn('users', 'email', {
    type: Sequelize.STRING,
    allowNull: false
  });
  
  await queryInterface.changeColumn('users', 'password', {
    type: Sequelize.STRING,
    allowNull: false
  });
}
