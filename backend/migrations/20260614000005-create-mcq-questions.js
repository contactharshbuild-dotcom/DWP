export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('mcq_questions', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    test_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'mcq_tests', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    is_bank: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    course: {
      type: Sequelize.STRING,
      allowNull: true
    },
    module: {
      type: Sequelize.STRING,
      allowNull: true
    },
    session: {
      type: Sequelize.STRING,
      allowNull: true
    },
    topic: {
      type: Sequelize.STRING,
      allowNull: true
    },
    question_text: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    option_a: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    option_b: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    option_c: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    option_d: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    correct_answer: {
      type: Sequelize.STRING(1),
      allowNull: false
    },
    explanation: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    difficulty: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Medium'
    },
    marks: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('mcq_questions');
}
