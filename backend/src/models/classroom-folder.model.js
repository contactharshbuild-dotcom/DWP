import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ClassroomFolder = sequelize.define('ClassroomFolder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  classroom_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'classrooms',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'classroom_folders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ClassroomFolder;
