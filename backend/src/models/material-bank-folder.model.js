import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MaterialBankFolder = sequelize.define('MaterialBankFolder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'material_bank_folders',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'material_bank_folders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default MaterialBankFolder;
