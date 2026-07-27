export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.query('ALTER TABLE "mcq_tests" ALTER COLUMN "classroom_id" DROP NOT NULL;');
  await queryInterface.sequelize.query('ALTER TABLE "mcq_tests" ALTER COLUMN "start_window" DROP NOT NULL;');
  await queryInterface.sequelize.query('ALTER TABLE "mcq_tests" ALTER COLUMN "end_window" DROP NOT NULL;');
}

export async function down(queryInterface, Sequelize) {
  // Allow null reversibility
}
