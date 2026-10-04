export async function up(queryInterface, Sequelize) {
  // 1. Create batches table if it does not already exist
  const tables = await queryInterface.showAllTables();
  if (!tables.includes('batches')) {
    await queryInterface.createTable('batches', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique index on organization_id + name
    await queryInterface.addIndex('batches', ['organization_id', 'name'], {
      unique: true,
      name: 'unique_org_batch_name'
    });
  }

  // 2. Backfill existing distinct batch names from users into batches table
  try {
    const [existingUserBatches] = await queryInterface.sequelize.query(`
      SELECT DISTINCT organization_id, TRIM(batch) AS batch_name
      FROM users
      WHERE batch IS NOT NULL 
        AND TRIM(batch) != '' 
        AND organization_id IS NOT NULL
    `);

    for (const record of existingUserBatches) {
      if (!record.organization_id || !record.batch_name) continue;
      await queryInterface.sequelize.query(`
        INSERT INTO batches (organization_id, name, created_at, updated_at)
        SELECT :orgId, :bName, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM batches WHERE organization_id = :orgId AND name = :bName
        )
      `, {
        replacements: { orgId: record.organization_id, bName: record.batch_name }
      });
    }
  } catch (err) {
    console.warn('Note: Batch backfill skipped or non-critical warning:', err.message);
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('batches');
}
