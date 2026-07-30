require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : 'root',
    database: process.env.DB_NAME || 'DWP',
    host: (process.env.DB_HOST === 'postgres' || process.env.DB_HOST === 'host.docker.internal') ? 'localhost' : (process.env.DB_HOST || 'localhost'),
    dialect: 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : 'root',
    database: process.env.DB_NAME || 'DWP',
    host: (process.env.DB_HOST === 'postgres' || process.env.DB_HOST === 'host.docker.internal') ? 'localhost' : (process.env.DB_HOST || 'localhost'),
    dialect: 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432
  },
  production: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : 'root',
    database: process.env.DB_NAME || 'DWP',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432
  }
};
