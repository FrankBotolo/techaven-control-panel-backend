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
      await sequelize.query(
        'ALTER TABLE shop_invitations MODIFY updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      );
    } else {
      try {
        await sequelize.query(
          'ALTER TABLE shop_invitations MODIFY updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        );
      } catch (error) {
        if (!error.message.includes('Duplicate') && !error.message.includes('already')) {
          console.warn('⚠️  Could not update updated_at:', error.message);
        }
      }
    }
  } catch (error) {
    if (!error.message.includes("doesn't exist")) {
      console.warn('⚠️  Warning: Could not fix shop_invitations timestamps:', error.message);
    }
  }
};

const migrateFresh = async () => {
  try {
    console.log('🔄 Migrate fresh: dropping all tables and re-syncing...');

    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');

    await db.sequelize.sync({ force: true });
    console.log('✅ All tables dropped and recreated.');

    const queryInterface = db.sequelize.getQueryInterface();
    await fixInvitationsTimestamps(queryInterface, db.sequelize);

    console.log('✅ Migrate fresh completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migrate fresh failed:', error);
    process.exit(1);
  }
};

migrateFresh();
