import db from '../models/index.js';
import { Sequelize } from 'sequelize';

const fixInvitationsTimestamps = async () => {
  try {
    console.log('🔧 Fixing shop_invitations table timestamps...');
    
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');

    const queryInterface = db.sequelize.getQueryInterface();
    
    // Check if created_at column exists
    const tableDescription = await queryInterface.describeTable('shop_invitations');
    
    if (!tableDescription.created_at) {
      console.log('➕ Adding created_at column...');
      await queryInterface.addColumn('shop_invitations', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
      console.log('✅ created_at column added.');
    } else {
      console.log('✓ created_at column already exists.');
    }

    if (!tableDescription.updated_at) {
      console.log('➕ Adding updated_at column...');
      await queryInterface.addColumn('shop_invitations', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
      // Set ON UPDATE separately as Sequelize doesn't support it in addColumn
      await db.sequelize.query(
        'ALTER TABLE shop_invitations MODIFY updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      );
      console.log('✅ updated_at column added.');
    } else {
      console.log('✓ updated_at column already exists.');
      // Ensure ON UPDATE is set even if column exists
      try {
        await db.sequelize.query(
          'ALTER TABLE shop_invitations MODIFY updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        );
        console.log('✓ updated_at column updated with ON UPDATE.');
      } catch (error) {
        // Column might already have ON UPDATE, ignore error
        if (!error.message.includes('Duplicate column name')) {
          console.warn('⚠️  Could not update updated_at:', error.message);
        }
      }
    }

    console.log('✅ shop_invitations table fixed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix shop_invitations table:', error);
    process.exit(1);
  }
};

fixInvitationsTimestamps();

