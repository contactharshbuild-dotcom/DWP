export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('session_attendance', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    session_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'module_sessions',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    student_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'present'
    },
    remarks: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    marked_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  await queryInterface.addIndex('session_attendance', ['session_id', 'student_id'], {
    unique: true,
    name: 'unique_session_student_attendance'
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('session_attendance');
}
