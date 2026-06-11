import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Classroom = sequelize.define('Classroom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  classroom_id: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id'
    }
  }
}, {
  tableName: 'classrooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Classroom;
