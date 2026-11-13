import dotenv from 'dotenv';
dotenv.config();

/**
 * Database configuration placeholder.
 * Sesuaikan dengan database yang digunakan (MySQL/Sequelize/Prisma/Mongoose/pg).
 */
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hris_gapjoten',
};

export const connectDB = async () => {
  try {
    // Implementasi koneksi database di sini (contoh: mysql2, Prisma, Sequelize, atau Mongoose)
    console.log(`📦 Database configured for host: ${dbConfig.host}:${dbConfig.port}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

