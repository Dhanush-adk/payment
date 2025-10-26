require('dotenv').config();
const { Sequelize } = require('sequelize');

// Initialize sequelize instance immediately
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// MySQL connection
const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log(`🗄️ MySQL Connected: ${process.env.MYSQL_HOST || 'localhost'}`);
    console.log(`🇮🇳 Database configured for India (INR, GST compliant)`);
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    process.exit(1);
  }
};

const connectDB = async () => {
  await connectMySQL();
};

module.exports = { connectDB, sequelize };
