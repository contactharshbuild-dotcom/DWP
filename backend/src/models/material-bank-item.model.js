import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MaterialBankItem = sequelize.define('MaterialBankItem', {
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
  folder_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'material_bank_folders',
      key: 'id'
    }
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // 'file' or 'youtube'
    allowNull: false
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  drive_file_id: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'material_bank_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default MaterialBankItem;
