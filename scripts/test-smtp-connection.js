import { verifySMTPConnection } from '../services/emailService.js';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();

const lookup = promisify(dns.lookup);

const testSMTPConnection = async () => {
  console.log('🔍 Testing SMTP Connection...\n');
  
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = process.env.SMTP_PORT || 587;
  
  console.log(`SMTP Configuration:`);
  console.log(`  Host: ${host}`);
  console.log(`  Port: ${port}`);
  console.log(`  User: ${process.env.SMTP_USER || 'a2310c001@smtp-brevo.com'}`);
  console.log(`  Secure: ${port === '465' ? 'Yes (SSL)' : 'No (STARTTLS)'}\n`);

  try {
    // Test DNS resolution
    console.log('1. Testing DNS resolution...');
    try {
      const addresses = await lookup(host);
      console.log(`   ✅ DNS resolved: ${host} -> ${addresses.address}`);
    } catch (dnsError) {
      console.error(`   ❌ DNS resolution failed: ${dnsError.message}`);
      console.error('   Check your internet connection and DNS settings');
      process.exit(1);
    }

    // Test SMTP connection
    console.log('\n2. Testing SMTP connection...');
    const connected = await verifySMTPConnection();
    
    if (connected) {
      console.log('\n✅ SMTP connection test passed!');
      console.log('   You can now send emails.');
    } else {
      console.log('\n❌ SMTP connection test failed!');
      console.log('\nTroubleshooting steps:');
      console.log('1. Check if port', port, 'is blocked by firewall');
      console.log('2. Try port 465 with SSL: Set SMTP_PORT=465 in .env');
      console.log('3. Verify SMTP credentials in .env file');
      console.log('4. Check Brevo account status at https://app.brevo.com');
      console.log('5. Ensure your IP is not blocked by Brevo');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    process.exit(1);
  }
};

testSMTPConnection();
