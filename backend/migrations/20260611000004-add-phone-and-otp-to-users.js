export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'phone', {
    type: Sequelize.STRING,
    unique: true,
    allowNull: true
  });
  
  await queryInterface.addColumn('users', 'otp_code', {
    type: Sequelize.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('users', 'otp_expires', {
    type: Sequelize.DATE,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('users', 'phone');
  await queryInterface.removeColumn('users', 'otp_code');
  await queryInterface.removeColumn('users', 'otp_expires');
}
