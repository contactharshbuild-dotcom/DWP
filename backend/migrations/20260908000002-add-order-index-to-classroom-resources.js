import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  const resourceTableInfo = await queryInterface.describeTable('classroom_resources');
  if (!resourceTableInfo.order_index) {
    await queryInterface.addColumn('classroom_resources', 'order_index', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }

  const folderTableInfo = await queryInterface.describeTable('classroom_folders');
  if (!folderTableInfo.order_index) {
    await queryInterface.addColumn('classroom_folders', 'order_index', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('classroom_resources', 'order_index').catch(() => {});
  await queryInterface.removeColumn('classroom_folders', 'order_index').catch(() => {});
}
