/**
 * Test Click Mobile SMS integration.
 * Usage: node scripts/test-sms.js [phone_number]
 * Example: node scripts/test-sms.js 0990411173
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sendSms, sendOtpSms, sendPasswordResetOtpSms, isSmsConfigured } from '../services/smsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const testPhone = process.argv[2] || process.env.SMS_TEST_PHONE || '265980256737';

async function main() {
  console.log('SMS Gateway Test\n');
  console.log('Configured:', isSmsConfigured());
  if (!isSmsConfigured()) {
    console.log('SMS is not configured. Add these to your .env file (in the server folder):');
    console.log('  FDI_SMS_API_URL=https://messaging.fdibiz.com/api/v1/mt/single');
    console.log('  FDI_SMS_AUTH_URL=https://messaging.efashe.com/mw/api/v1/auth');
    console.log('  FDI_SMS_API_USERNAME=your-api-username');
    console.log('  FDI_SMS_API_PASSWORD=your-api-password');
    console.log('  FDI_SMS_SENDER_ID=TECHAVEN');
    console.log('  FDI_SMS_DLR_URL=https://yourdomain.com/sms/dlr');
    console.log('\nSee .env for the full list.');
    process.exit(1);
  }

  console.log('Test phone:', testPhone);
  console.log('');

  console.log('Balance check is not implemented for FDI gateway. Skipping.');

  console.log('\n1. Send OTP SMS...');
  const otpResult = await sendOtpSms(testPhone, '123456');
  console.log(otpResult.success ? 'OK' : 'Failed:', otpResult.message);

  console.log('\n2. Send password reset OTP SMS...');
  const resetResult = await sendPasswordResetOtpSms(testPhone, '654321');
  console.log(resetResult.success ? 'OK' : 'Failed:', resetResult.message);

  console.log('\n3. Send generic notification SMS...');
  const notifResult = await sendSms(testPhone, 'Techaven: Order #ORD-001 placed. Check the app for details.');
  console.log(notifResult.success ? 'OK' : 'Failed:', notifResult.message);

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
