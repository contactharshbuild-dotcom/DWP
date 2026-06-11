export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('organizations', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    slug: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true
    },
    logo_url: {
      type: Sequelize.STRING,
      allowNull: true
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'active',
      allowNull: false
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
  await queryInterface.dropTable('organizations');
}
