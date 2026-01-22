import db from '../models/index.js';
import { Sequelize } from 'sequelize';

const fixInvitationsTimestamps = async (queryInterface, sequelize) => {
  try {
    const tableDescription = await queryInterface.describeTable('shop_invitations');
    
    if (!tableDescription.created_at) {
      console.log('➕ Adding created_at column to shop_invitations...');
      await queryInterface.addColumn('shop_invitations', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
    }

    if (!tableDescription.updated_at) {
      console.log('➕ Adding updated_at column to shop_invitations...');
      await queryInterface.addColumn('shop_invitations', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
      // Set ON UPDATE separately as Sequelize doesn't support it in addColumn
      await sequelize.query(
        'ALTER TABLE shop_invitations MODIFY updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      );
    } else {
      // Ensure ON UPDATE is set even if column exists
      try {
        await sequelize.query(
          'ALTER TABLE shop_invitations MODIFY updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        );
      } catch (error) {
        // Column might already have ON UPDATE, ignore error
        if (!error.message.includes('Duplicate') && !error.message.includes('already')) {
          console.warn('⚠️  Could not update updated_at:', error.message);
        }
      }
    }
  } catch (error) {
    // Table might not exist yet, that's okay
    if (!error.message.includes("doesn't exist")) {
      console.warn('⚠️  Warning: Could not fix shop_invitations timestamps:', error.message);
    }
  }
};

const syncDatabase = async () => {
  try {
    console.log('🔄 Starting database synchronization...');
    
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Sync all models
    await db.sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully.');

    // Ensure shop_invitations has timestamp columns
    const queryInterface = db.sequelize.getQueryInterface();
    await fixInvitationsTimestamps(queryInterface, db.sequelize);

    console.log('✅ Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    process.exit(1);
  }
};

syncDatabase();

