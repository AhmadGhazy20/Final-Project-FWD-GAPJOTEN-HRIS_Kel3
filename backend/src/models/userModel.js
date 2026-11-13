/**
 * User Model / Schema
 * Tempat mendefinisikan struktur data User (Admin / HR / Employee).
 * Dapat dihubungkan ke ORM (Prisma, Sequelize, Mongoose) atau raw SQL query.
 */

export const UserModel = {
  tableName: 'users',
  fields: {
    id: 'INT PRIMARY KEY AUTO_INCREMENT',
    username: 'VARCHAR(100) UNIQUE NOT NULL',
    email: 'VARCHAR(150) UNIQUE NOT NULL',
    password: 'VARCHAR(255) NOT NULL',
    role: 'ENUM("admin", "hr", "employee") DEFAULT "employee"',
    createdAt: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updatedAt: 'DATETIME ON UPDATE CURRENT_TIMESTAMP',
  },
};

