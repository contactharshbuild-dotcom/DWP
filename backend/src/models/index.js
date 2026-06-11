import sequelize from '../config/database.js';
import Organization from './organization.model.js';
import User from './user.model.js';

const db = {
  sequelize,
  Organization,
  User
};

// Establish relationships
Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Run model associations if defined
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export { sequelize, Organization, User };
export default db;
