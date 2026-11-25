import test from 'node:test';
import assert from 'node:assert/strict';

process.env.FDI_SMS_API_URL = 'https://sms.invalid/send';
process.env.FDI_SMS_AUTH_URL = 'https://sms.invalid/auth';
process.env.FDI_SMS_API_USERNAME = 'u';
process.env.FDI_SMS_API_PASSWORD = 'p';
const realFetch = globalThis.fetch;
const calls = [];
let sendReply = { status: 200, body: { success: true } };
globalThis.fetch = async (url, options) => {
  const auth = String(url).includes('/auth');
  const body = JSON.parse(options.body);
  calls.push({ auth, body });
  const reply = auth ? { status: 200, body: { access_token: 't', expires_at: new Date(Date.now() + 3600000).toISOString() } } : sendReply;
  return new Response(JSON.stringify(reply.body), { status: reply.status });
};
const { formatPhoneNumber, sendInvitationSms, sendOtpSms, sendSms } = await import('../../services/smsService.js');
test.after(() => { globalThis.fetch = realFetch; });
const lastSend = () => calls.filter((call) => !call.auth).at(-1).body;

test('Malawi numbers normalise; other numbers are refused', () => {
  for (const value of ['0991234567', '991234567', '265991234567', '+265 991 234 567', '+265 (0)991 234 567', '00265991234567']) assert.equal(formatPhoneNumber(value), '265991234567');
  for (const value of ['', null, '12345', '+27821234567890', '+14155550123']) assert.equal(formatPhoneNumber(value), null);
});

test('OTP text carries the code and the real expiry', async () => {
  assert.equal((await sendOtpSms('0991234567', '123456', '10 minutes')).success, true);
  assert.equal(lastSend().msisdn, '+265991234567');
  assert.match(lastSend().message, /123456.*10 minutes/);
});

test('invitation links are not cut at 160 characters', async () => {
  const link = 'https://example.test/register?invite_token=' + 'a'.repeat(128);
  await sendInvitationSms('0991234567', 'My Shop', link);
  assert.ok(lastSend().message.endsWith(link));
});

test('a rejection is reported even with HTTP 200, and 401 forces a new login', async () => {
  sendReply = { status: 200, body: { success: false, message: 'Insufficient balance' } };
  assert.deepEqual((({ success, message }) => ({ success, message }))(await sendSms('0991234567', 'x')), { success: false, message: 'Insufficient balance' });
  sendReply = { status: 401, body: {} };
  await sendSms('0991234567', 'x');
  const logins = calls.filter((call) => call.auth).length;
  sendReply = { status: 200, body: {} };
  assert.equal((await sendSms('0991234567', 'x')).success, true);
  assert.equal(calls.filter((call) => call.auth).length, logins + 1);
});
