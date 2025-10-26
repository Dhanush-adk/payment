const { connectDB, sequelize } = require('./src/config/database');

const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing MySQL database...');
    
    // Connect to databases first
    await connectDB();
    
    // Import models after connection is established
    const Payment = require('./src/models/PaymentMySQL');
    const Order = require('./src/models/OrderMySQL');
    
    // Sync the database (create tables if they don't exist)
    await sequelize.sync({ force: false });
    
    console.log('✅ MySQL database initialized successfully');
    console.log('📊 Payment table created/verified');
    console.log('📦 Order table created/verified');
    
    // Close the connection
    await sequelize.close();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
