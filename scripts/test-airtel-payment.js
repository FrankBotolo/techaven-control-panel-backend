import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from '../models/index.js';
import {
  getAirtelCredentials,
  getAirtelBaseUrl,
  postAirtelCollect,
  normalizeAirtelMsisdn,
  normalizeAirtelReference,
  getAirtelCollectReference
} from '../utils/airtelCollect.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function usage() {
  console.log(`Airtel Money payment push test

Usage:
  npm run test-airtel-payment -- <msisdn> [amount] [transactionId]
  npm run test-airtel-payment -- --order <orderId> [--msisdn <phone>]

Examples:
  npm run test-airtel-payment -- 0998256737
  npm run test-airtel-payment -- 0998256737 100 ORD202608041234
  npm run test-airtel-payment -- --order 42 --msisdn 0998256737

Reference sent to Airtel is always: "${getAirtelCollectReference()}" (from "Testing transaction")
transaction.id = order_number (or manual transactionId arg)

Env (optional): AIRTEL_TEST_MSISDN, AIRTEL_TEST_AMOUNT

Warning: sends a real USSD payment prompt to the phone number.`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exit(0);
  }

  const orderFlagIdx = argv.indexOf('--order');
  if (orderFlagIdx !== -1) {
    const orderId = argv[orderFlagIdx + 1];
    const msisdnIdx = argv.indexOf('--msisdn');
    const msisdn = msisdnIdx !== -1 ? argv[msisdnIdx + 1] : null;
    return { mode: 'db', orderId, msisdn };
  }

  const [msisdn, amount, transactionId] = argv;
  return {
    mode: 'manual',
    msisdn: msisdn || process.env.AIRTEL_TEST_MSISDN || null,
    amount: amount || process.env.AIRTEL_TEST_AMOUNT || '100',
    transactionId: transactionId || 'ORD202608049999'
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { clientId, clientSecret } = getAirtelCredentials();

  console.log('Airtel Money payment test\n');
  console.log('Base URL:', getAirtelBaseUrl());

  if (!clientId || !clientSecret) {
    console.error('\nSet AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in .env');
    process.exit(1);
  }

  let msisdn;
  let amount;
  let transactionId;
  let dbOrderId = null;

  if (args.mode === 'db') {
    if (!args.orderId) {
      console.error('\nMissing --order <id>');
      usage();
      process.exit(1);
    }

    await db.sequelize.authenticate();
    const order = await db.Order.findByPk(args.orderId);
    if (!order) {
      console.error(`\nOrder not found: ${args.orderId}`);
      process.exit(1);
    }

    msisdn = args.msisdn || process.env.AIRTEL_TEST_MSISDN;
    if (!msisdn) {
      console.error('\nProvide --msisdn or set AIRTEL_TEST_MSISDN in .env');
      process.exit(1);
    }

    dbOrderId = order.id;
    amount = Math.round(parseFloat(order.total_amount) || 0);
    transactionId = normalizeAirtelReference(order.order_number);
    console.log('Loaded order:', order.order_number, `(id ${order.id}), amount MWK ${amount}`);
  } else {
    if (!args.msisdn) {
      console.error('\nPhone number required.');
      usage();
      process.exit(1);
    }

    msisdn = args.msisdn;
    amount = Math.round(Number(args.amount) || 0);
    transactionId = normalizeAirtelReference(args.transactionId);
  }

  console.log('MSISDN (normalized):', normalizeAirtelMsisdn(msisdn));
  console.log('Airtel reference (fixed):', getAirtelCollectReference());
  console.log('transaction.id (order number):', transactionId);
  console.log('Amount (MWK):', amount);
  console.log('\nSending payment push…\n');

  const result = await postAirtelCollect({
    transactionId,
    msisdn,
    amount
  });

  console.log('Transaction id sent:', result.transactionId);

  console.log('HTTP status:', result.response?.status ?? '(no response)');
  console.log('Success:', result.success ? 'yes' : 'no');
  console.log('Message:', result.message);
  console.log('\nResponse body:');
  console.log(JSON.stringify(result.data, null, 2));

  if (args.mode === 'db' && result.success && dbOrderId != null) {
    await db.AirtelTransaction.create({
      transaction_id: result.transactionId,
      reference: getAirtelCollectReference(),
      order_id: dbOrderId,
      msisdn,
      amount,
      currency: 'MWK',
      status: result.data?.data?.transaction?.status || null,
      status_code: result.data?.status?.response_code || result.data?.status?.result_code || null,
      message: result.message,
      processing_state: 'push_initiated',
      raw_payload: result.data
    });
    console.log('\nSaved airtel_transactions row for order id', dbOrderId);
  }

  if (args.mode === 'db') {
    await db.sequelize.close();
  }

  if (!result.success) {
    process.exit(1);
  }

  console.log('\nDone. Customer should receive a USSD prompt on their phone.');
}

main().catch(async (e) => {
  console.error(e.message || e);
  try {
    await db.sequelize.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
