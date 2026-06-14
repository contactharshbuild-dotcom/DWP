export async function up(queryInterface, Sequelize) {
  // 1. Alter drive_file_id to be nullable
  await queryInterface.changeColumn('classroom_resources', 'drive_file_id', {
    type: Sequelize.STRING,
    allowNull: true
  });

  // 2. Add folder_id referencing classroom_folders(id)
  await queryInterface.addColumn('classroom_resources', 'folder_id', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: 'classroom_folders',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });

  // 3. Add module_session
  await queryInterface.addColumn('classroom_resources', 'module_session', {
    type: Sequelize.STRING,
    allowNull: true
  });

  // 4. Add visibility
  await queryInterface.addColumn('classroom_resources', 'visibility', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'all_students'
  });

  // 5. Add batch
  await queryInterface.addColumn('classroom_resources', 'batch', {
    type: Sequelize.STRING,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('classroom_resources', 'batch');
  await queryInterface.removeColumn('classroom_resources', 'visibility');
  await queryInterface.removeColumn('classroom_resources', 'module_session');
  await queryInterface.removeColumn('classroom_resources', 'folder_id');
  await queryInterface.changeColumn('classroom_resources', 'drive_file_id', {
    type: Sequelize.STRING,
    allowNull: false
  });
}
