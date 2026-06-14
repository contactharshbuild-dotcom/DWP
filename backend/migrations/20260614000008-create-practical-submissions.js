export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('practical_submissions', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    practical_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'practical_exams', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    text_answer: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    github_link: {
      type: Sequelize.STRING,
      allowNull: true
    },
    drive_link: {
      type: Sequelize.STRING,
      allowNull: true
    },
    submitted_files: {
      type: Sequelize.JSON,
      allowNull: true
    },
    graded: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    grade_components: {
      type: Sequelize.JSON,
      allowNull: true
    },
    total_grade: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    },
    feedback: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    submitted_at: {
      type: Sequelize.DATE,
      allowNull: false
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
  await queryInterface.dropTable('practical_submissions');
}
