require('dotenv').config();

const dbHost = process.env.DB_HOST || 'localhost';

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : 'postgres',
    database: process.env.DB_NAME || 'lms',
    host: dbHost,
    dialect: 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : 'postgres',
    database: process.env.DB_NAME || 'lms',
    host: dbHost,
    dialect: 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432
  },
  production: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : 'postgres',
    database: process.env.DB_NAME || 'lms',
    host: dbHost,
    dialect: 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432
  }
};
