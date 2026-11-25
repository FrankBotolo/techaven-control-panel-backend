/**
 * Seeds starter seller subscription packages (plans). Idempotent by slug: existing packages are
 * never modified, so prices an admin has edited are preserved.
 *
 * Prices are SAMPLE values (anchored on the MK 150,000 "growth" example in docs/SUBSCRIPTION_PACKAGES.md).
 * Review them in the admin portal (Control Tower → Subscriptions) before going live.
 *
 *   node scripts/seed-subscription-packages.js           # dry run
 *   node scripts/seed-subscription-packages.js --apply   # write
 */
import '../utils/loadEnv.js';
import db from '../models/index.js';

const apply = process.argv.includes('--apply');

const packages = [
  {
    slug: 'starter', name: 'Starter', price_mwk: 50000, billing_period: 'monthly', duration_days: 30, trial_days: 0, sort_order: 1,
    description: 'For new shops getting their first devices online.',
    features: ['Up to 25 live listings', 'Verified catalogue listings', 'Escrow-protected payouts', 'Standard support'],
    limits: { max_listings: 25, max_staff: 1 }
  },
  {
    slug: 'growth', name: 'Growth', price_mwk: 150000, billing_period: 'monthly', duration_days: 30, trial_days: 0, sort_order: 2, is_featured: true,
    description: 'For established shops selling every week.',
    features: ['Up to 500 live listings', 'Featured placement in shop directory', 'Priority rider dispatch', 'Up to 3 staff accounts'],
    limits: { max_listings: 500, max_staff: 3 }
  },
  {
    slug: 'pro-quarterly', name: 'Pro (quarterly)', price_mwk: 400000, billing_period: 'quarterly', duration_days: 90, trial_days: 0, sort_order: 3,
    description: 'Everything in Growth, billed every three months at a lower monthly rate.',
    features: ['Unlimited live listings', 'Homepage promotion slots', 'Dedicated account manager', 'Up to 10 staff accounts'],
    limits: { max_listings: null, max_staff: 10 }
  }
];

try {
  await db.sequelize.authenticate();
  const created = [];
  const skipped = [];
  for (const pkg of packages) {
    const existing = await db.SubscriptionPackage.findOne({ where: { slug: pkg.slug } });
    if (existing) { skipped.push(pkg.slug); continue; }
    if (apply) await db.SubscriptionPackage.create({ currency: 'MWK', is_active: true, is_featured: false, ...pkg });
    created.push(pkg.slug);
  }
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run (pass --apply to write)', [apply ? 'created' : 'would_create']: created, already_present: skipped }, null, 2));
} catch (error) {
  console.error('Package seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.sequelize.close();
}
