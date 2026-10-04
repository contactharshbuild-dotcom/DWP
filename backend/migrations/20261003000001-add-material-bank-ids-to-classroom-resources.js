import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  const resourceTableInfo = await queryInterface.describeTable('classroom_resources');
  if (!resourceTableInfo.material_bank_item_id) {
    await queryInterface.addColumn('classroom_resources', 'material_bank_item_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'material_bank_items',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  }

  const folderTableInfo = await queryInterface.describeTable('classroom_folders');
  if (!folderTableInfo.material_bank_folder_id) {
    await queryInterface.addColumn('classroom_folders', 'material_bank_folder_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'material_bank_folders',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  }

  // Backfill existing classroom resources by matching drive_file_id or drive_link
  try {
    await queryInterface.sequelize.query(`
      UPDATE classroom_resources cr
      SET material_bank_item_id = mbi.id,
          order_index = mbi.order_index
      FROM material_bank_items mbi
      WHERE cr.material_bank_item_id = mbi.id
         OR (
           cr.material_bank_item_id IS NULL AND (
             (cr.drive_file_id IS NOT NULL AND cr.drive_file_id = mbi.drive_file_id)
             OR (cr.drive_link IS NOT NULL AND cr.drive_link = mbi.file_url)
           )
         );
    `);
  } catch (e) {
    console.warn('Migration backfill for classroom_resources warning:', e.message);
  }

  // Backfill existing classroom folders by name
  try {
    await queryInterface.sequelize.query(`
      UPDATE classroom_folders cf
      SET material_bank_folder_id = mbf.id,
          order_index = mbf.order_index
      FROM material_bank_folders mbf
      WHERE cf.material_bank_folder_id = mbf.id
         OR (cf.material_bank_folder_id IS NULL AND cf.name = mbf.name);
    `);
  } catch (e) {
    console.warn('Migration backfill for classroom_folders warning:', e.message);
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('classroom_resources', 'material_bank_item_id').catch(() => {});
  await queryInterface.removeColumn('classroom_folders', 'material_bank_folder_id').catch(() => {});
}
