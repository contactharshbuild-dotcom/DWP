export async function up(queryInterface, Sequelize) {
  // 1. Add organization_id to mcq_tests
  await queryInterface.addColumn('mcq_tests', 'organization_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });

  // 2. Change classroom_id, start_window, end_window in mcq_tests to allow null
  await queryInterface.changeColumn('mcq_tests', 'classroom_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: 'classrooms',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });

  await queryInterface.changeColumn('mcq_tests', 'start_window', {
    type: Sequelize.DATE,
    allowNull: true
  });

  await queryInterface.changeColumn('mcq_tests', 'end_window', {
    type: Sequelize.DATE,
    allowNull: true
  });

  // 3. Add question_type to mcq_questions
  await queryInterface.addColumn('mcq_questions', 'question_type', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'mcq'
  });

  // 4. Change option columns and correct_answer in mcq_questions to allow null for subjective questions
  await queryInterface.changeColumn('mcq_questions', 'option_a', {
    type: Sequelize.TEXT,
    allowNull: true
  });

  await queryInterface.changeColumn('mcq_questions', 'option_b', {
    type: Sequelize.TEXT,
    allowNull: true
  });

  await queryInterface.changeColumn('mcq_questions', 'option_c', {
    type: Sequelize.TEXT,
    allowNull: true
  });

  await queryInterface.changeColumn('mcq_questions', 'option_d', {
    type: Sequelize.TEXT,
    allowNull: true
  });

  await queryInterface.changeColumn('mcq_questions', 'correct_answer', {
    type: Sequelize.STRING,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('mcq_tests', 'organization_id');
  await queryInterface.removeColumn('mcq_questions', 'question_type');

  await queryInterface.changeColumn('mcq_tests', 'classroom_id', {
    type: Sequelize.INTEGER,
    allowNull: false
  });

  await queryInterface.changeColumn('mcq_tests', 'start_window', {
    type: Sequelize.DATE,
    allowNull: false
  });

  await queryInterface.changeColumn('mcq_tests', 'end_window', {
    type: Sequelize.DATE,
    allowNull: false
  });

  await queryInterface.changeColumn('mcq_questions', 'option_a', {
    type: Sequelize.TEXT,
    allowNull: false
  });

  await queryInterface.changeColumn('mcq_questions', 'option_b', {
    type: Sequelize.TEXT,
    allowNull: false
  });

  await queryInterface.changeColumn('mcq_questions', 'option_c', {
    type: Sequelize.TEXT,
    allowNull: false
  });

  await queryInterface.changeColumn('mcq_questions', 'option_d', {
    type: Sequelize.TEXT,
    allowNull: false
  });

  await queryInterface.changeColumn('mcq_questions', 'correct_answer', {
    type: Sequelize.STRING,
    allowNull: false
  });
}
