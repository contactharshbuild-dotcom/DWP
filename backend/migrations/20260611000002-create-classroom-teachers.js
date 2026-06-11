export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('classroom_teachers', {
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
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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

  await queryInterface.addConstraint('classroom_teachers', {
    fields: ['classroom_id', 'user_id'],
    type: 'unique',
    name: 'unique_classroom_teacher'
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('classroom_teachers');
}
