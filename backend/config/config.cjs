require('dotenv').config();

const isRemote =
  (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) ||
  Boolean(process.env.DATABASE_URL) ||
  process.env.DB_SSL === 'true';

const dialectOptions = isRemote
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  : {};

const baseConfig = process.env.DATABASE_URL
  ? {
      use_env_variable: 'DATABASE_URL',
      url: process.env.DATABASE_URL,
      dialect: 'postgres',
      dialectOptions
    }
  : {
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : 'postgres',
      database: process.env.DB_NAME || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      dialectOptions
    };

module.exports = {
  development: baseConfig,
  test: baseConfig,
  production: baseConfig
};
