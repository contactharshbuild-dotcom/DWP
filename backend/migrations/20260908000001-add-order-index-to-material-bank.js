import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  const itemTableInfo = await queryInterface.describeTable('material_bank_items');
  if (!itemTableInfo.order_index) {
    await queryInterface.addColumn('material_bank_items', 'order_index', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }

  const folderTableInfo = await queryInterface.describeTable('material_bank_folders');
  if (!folderTableInfo.order_index) {
    await queryInterface.addColumn('material_bank_folders', 'order_index', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('material_bank_items', 'order_index').catch(() => {});
  await queryInterface.removeColumn('material_bank_folders', 'order_index').catch(() => {});
}
