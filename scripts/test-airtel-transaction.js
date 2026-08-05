import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getAirtelCredentials,
  getAirtelBaseUrl,
  normalizeAirtelReference
} from '../utils/airtelCollect.js';
import { getAirtelTransactionSummary } from '../utils/airtelTransactions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const transactionId = process.argv[2] || process.env.AIRTEL_TEST_TRANSACTION_ID || null;

  console.log('Airtel transaction summary test\n');
  console.log('Base URL:', getAirtelBaseUrl());

  const { clientId, clientSecret } = getAirtelCredentials();
  if (!clientId || !clientSecret) {
    console.error('\nSet AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in .env');
    process.exit(1);
  }

  if (transactionId) {
    console.log('Transaction id:', normalizeAirtelReference(transactionId));
  } else {
    console.log('No transaction id — fetching merchant transaction list/summary');
  }

  const result = await getAirtelTransactionSummary(
    transactionId ? { transactionId } : {}
  );

  console.log('\nSuccess:', result.success ? 'yes' : 'no');
  console.log('Message:', result.message);
  console.log('\nBody:');
  console.log(JSON.stringify(result.data, null, 2));

  if (!result.success && !result.response?.ok) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
