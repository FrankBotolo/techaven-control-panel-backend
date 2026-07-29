import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getAirtelCredentials,
  getAirtelBaseUrl,
  getAirtelAccessToken,
  getAirtelTokenCacheStatus,
  refreshAirtelAccessToken
} from '../utils/airtelToken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const { clientId, clientSecret } = getAirtelCredentials();
  console.log('Airtel OAuth token test\n');
  console.log('Base URL:', getAirtelBaseUrl());
  console.log('Client ID:', clientId ? `${clientId.slice(0, 8)}…` : '(not set)');

  if (!clientId || !clientSecret) {
    console.error('\nSet AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in .env');
    process.exit(1);
  }

  console.log('\n1. Fetch access token…');
  const token = await getAirtelAccessToken();
  console.log('OK — token length:', token.length);

  const status = getAirtelTokenCacheStatus();
  console.log('Cache expires in (sec):', status.expiresInSec);

  console.log('\n2. Re-use cached token…');
  const token2 = await getAirtelAccessToken();
  console.log('Same cached token:', token2 === token ? 'yes' : 'no');

  console.log('\n3. Force refresh…');
  const token3 = await refreshAirtelAccessToken();
  console.log('New token issued:', token3 !== token ? 'yes' : 'no (same if refresh was instant)');

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
