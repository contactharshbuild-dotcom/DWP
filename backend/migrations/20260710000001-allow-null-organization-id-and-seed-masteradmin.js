import bcrypt from 'bcryptjs';

export async function up(queryInterface, Sequelize) {
  // 1. Drop NOT NULL constraint on organization_id using raw SQL for postgres reliability
  await queryInterface.sequelize.query(
    'ALTER TABLE users ALTER COLUMN organization_id DROP NOT NULL;'
  );

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Hprk@1983', salt);

  // 2. Check if harshkumbhare75@gmail.com exists
  const [existingUsers] = await queryInterface.sequelize.query(
    `SELECT id FROM users WHERE email = 'harshkumbhare75@gmail.com' LIMIT 1;`
  );

  if (existingUsers.length > 0) {
    // Update existing user
    await queryInterface.sequelize.query(
      `UPDATE users 
       SET role = 'masteradmin', 
           organization_id = NULL, 
           password = :password, 
           status = 'active',
           updated_at = NOW()
       WHERE email = 'harshkumbhare75@gmail.com';`,
      {
        replacements: { password: hashedPassword }
      }
    );
    console.log('Seeded Master Admin: Updated existing user.');
  } else {
    // Insert new user
    await queryInterface.sequelize.query(
      `INSERT INTO users (name, email, password, role, status, created_at, updated_at) 
       VALUES ('Harsh Kumbhare', 'harshkumbhare75@gmail.com', :password, 'masteradmin', 'active', NOW(), NOW());`,
      {
        replacements: { password: hashedPassword }
      }
    );
    console.log('Seeded Master Admin: Inserted new user.');
  }
}

export async function down(queryInterface, Sequelize) {
  // Clean up master admin user
  await queryInterface.sequelize.query(
    `DELETE FROM users WHERE email = 'harshkumbhare75@gmail.com' AND role = 'masteradmin';`
  );

  // Re-add NOT NULL constraint on organization_id (only if no null values exist)
  await queryInterface.sequelize.query(
    'ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;'
  );
}
