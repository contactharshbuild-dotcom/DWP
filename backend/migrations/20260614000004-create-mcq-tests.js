export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('mcq_tests', {
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
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    total_questions: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    time_limit: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    shuffle_questions: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    shuffle_options: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    show_result_immediately: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    test_type: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'session'
    },
    start_window: {
      type: Sequelize.DATE,
      allowNull: false
    },
    end_window: {
      type: Sequelize.DATE,
      allowNull: false
    },
    batches: {
      type: Sequelize.JSON,
      allowNull: true
    },
    security_tab_switch_behavior: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'warning'
    },
    security_max_warnings: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 3
    },
    security_force_fullscreen: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
  await queryInterface.dropTable('mcq_tests');
}
