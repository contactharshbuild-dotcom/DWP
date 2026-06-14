export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('mcq_attempts', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    test_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'mcq_tests', key: 'id' },
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
    score: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    },
    percentage: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0.0
    },
    time_taken: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    responses: {
      type: Sequelize.JSON,
      allowNull: true
    },
    tab_switch_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    tab_switch_log: {
      type: Sequelize.JSON,
      allowNull: true
    },
    fullscreen_exit_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    fullscreen_exit_log: {
      type: Sequelize.JSON,
      allowNull: true
    },
    start_time: {
      type: Sequelize.DATE,
      allowNull: false
    },
    end_time: {
      type: Sequelize.DATE,
      allowNull: true
    },
    submit_type: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'manual'
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'started'
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
  await queryInterface.dropTable('mcq_attempts');
}
