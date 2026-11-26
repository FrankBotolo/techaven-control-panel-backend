import '../utils/loadEnv.js';
import db from '../models/index.js';
import { shops, heldItems, excludedItems } from './data/shop-onboarding-20261022.js';
import { offerFingerprint } from '../services/marketplace/onboarding.js';
import { enqueueDevice, enqueueShop } from '../services/catalogue/promotionSync.js';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { reviewedCanonicalSlug } from '../services/catalogue/reviewedIdentity.js';
import { resolveDeviceIdentity } from '../services/catalogue/deviceIdentity.js';

const apply = process.argv.includes('--apply');
const report = { applied:apply,created:{shops:0,devices:0,variants:0,listings:0},shops:[],held:heldItems,excluded:excludedItems };
const hash = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const title = slug => slug.split('-').map(w=>/^(hp|ssd|usb|sim|eu)$/.test(w)?w.toUpperCase():/^([astxy]\d|\d+[ag]|\d+g)/.test(w)?w.toUpperCase():w[0].toUpperCase()+w.slice(1)).join(' ');
async function protectedState() {
  const all = await db.Shop.findAll({raw:true,order:[['id','ASC']]});
  const ids = all.filter(s=>!shops.some(n=>n.name===s.name)).map(s=>s.id);
  return hash(await db.SellerListing.findAll({where:{shop_id:ids},raw:true,order:[['id','ASC']]}));
}
try {
  await db.sequelize.authenticate();
  const before = await protectedState();
  for (const shop of shops) await readFile(`/app/uploads/onboarding-20261022/${shop.logo_file}`);
  if (apply) await db.sequelize.transaction(async transaction => {
    for (const config of shops) {
      const values={name:config.name,phone:config.phone,location:config.location,address:config.address,
        description:null,profile:config.profile,logo:`http://localhost:8000/uploads/onboarding-20261022/${config.logo_file}`};
      const [shop,created] = await db.Shop.findOrCreate({where:{name:config.name},defaults:{...values,status:'active',application_status:'approved',is_verified:false},transaction});
      if(created) report.created.shops++;
      else await shop.update(values,{transaction});
      for (const offer of config.offers) {
        const source={...config.source,shop:config.name,sources:offer.sources};
        const [category]=await db.Category.findOrCreate({where:{name:offer.category,shop_id:null},defaults:{status:'approved'},transaction});
        const [brand]=await db.Brand.findOrCreate({where:{slug:offer.brand},defaults:{name:title(offer.brand)},transaction});
        const canonicalSlug = reviewedCanonicalSlug(offer.brand, offer.slug);
        const [matched,newDevice]=await db.Device.findOrCreate({where:{slug:canonicalSlug},defaults:{name:title(canonicalSlug),brand_id:brand.id,category_id:category.id,
          verification_status:'unverified',source_metadata:source},transaction});
        const device = matched.canonical_device_id ? await resolveDeviceIdentity(matched.id, transaction) : matched;
        assert.equal(device.brand_id,brand.id,`Brand mismatch: ${offer.slug}`);
        assert.equal(device.category_id,category.id,`Category mismatch: ${offer.slug}`);
        if(newDevice) report.created.devices++;
        // A seed-owned variant key avoids altering imported configurations and
        // includes SIM, processor/storage technology and individual unit facts.
        const fingerprint=offerFingerprint(offer);
        const canonical_key=`${offer.slug}|supplied-20261022|${fingerprint}`;
        const [variant,newVariant]=await db.DeviceVariant.findOrCreate({where:{canonical_key},defaults:{device_id:device.id,
          ram_gb:offer.ram_gb,storage_gb:offer.storage_gb,sim_type:offer.sim_type??null,region:offer.region??null,
          network_generation:offer.network_generation??(offer.slug.includes('5g')?'5G':null),
          attributes:{configuration:offer.configuration??{},extended_ram_gb:offer.extended_ram_gb??null},source_metadata:source,verification_status:'unverified'},transaction});
        if(newVariant) report.created.variants++;
        const details={source_evidence:source,extended_ram_gb:offer.extended_ram_gb??null,condition_details:offer.condition_details??null,
          warranty_available:offer.warranty_available??false,swap_plus_cash:offer.swap_plus_cash??false};
        const [listing,newListing]=await db.SellerListing.findOrCreate({where:{shop_id:shop.id,merchant_sku:`onboard-${fingerprint}`},
          defaults:{device_variant_id:variant.id,condition:offer.condition,currency:'MWK',price:offer.price,quantity:1,status:'active',
            warranty_months:offer.warranty_months??null,details},transaction});
        if(newListing) report.created.listings++;
        // Reruns do not replenish stock or overwrite subsequent merchant edits.
        assert.equal(listing.device_variant_id,variant.id,'Seed identity changed');
        await enqueueDevice(device.id,{transaction,reason:'shop-onboarding-20261022'});
      }
      const count=await db.SellerListing.count({where:{shop_id:shop.id,status:'active'},transaction});
      await shop.update({total_products:count},{transaction});
      await enqueueShop(shop.id,{transaction,reason:'shop-onboarding-20261022'});
      report.shops.push({id:shop.id,name:shop.name,offers:count});
    }
  });
  else report.shops=shops.map(s=>({name:s.name,offers:s.offers.length}));
  assert.equal(await protectedState(),before,'Unrelated commercial records changed');
  report.protected_records_unchanged=true;
  console.log(JSON.stringify(report,null,2));
} catch(error) { report.error=error.message;console.error(error);process.exitCode=1; }
finally {await writeFile('/tmp/shop-onboarding-20261022-report.json',JSON.stringify(report,null,2));await db.sequelize.close();}
