export async function up(queryInterface, Sequelize) {
  // 1. Create classroom_modules table
  await queryInterface.createTable('classroom_modules', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    classroom_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'classrooms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
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

  // 2. Create module_sessions table
  await queryInterface.createTable('module_sessions', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    module_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'classroom_modules',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    session_number: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true
    },
    part_extension: {
      type: Sequelize.STRING,
      allowNull: true
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    start_time: {
      type: Sequelize.STRING,
      allowNull: false
    },
    end_time: {
      type: Sequelize.STRING,
      allowNull: false
    },
    mode: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'offline'
    },
    venue: {
      type: Sequelize.STRING,
      allowNull: true
    },
    meet_link: {
      type: Sequelize.STRING,
      allowNull: true
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Scheduled'
    },
    batches: {
      type: Sequelize.JSON,
      allowNull: true
    },
    assigned_student_ids: {
      type: Sequelize.JSON,
      allowNull: true
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
  await queryInterface.dropTable('module_sessions');
  await queryInterface.dropTable('classroom_modules');
}
