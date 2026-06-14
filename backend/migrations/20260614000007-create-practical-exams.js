export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('practical_exams', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    classroom_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'classrooms', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    instructions: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    due_date: {
      type: Sequelize.DATE,
      allowNull: false
    },
    total_marks: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100
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
  await queryInterface.dropTable('practical_exams');
}
