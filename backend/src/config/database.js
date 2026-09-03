import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

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

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions,
    logging: false
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'postgres',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      dialect: "postgres",
      dialectOptions,
      logging: false
    }
  );
}

export default sequelize;