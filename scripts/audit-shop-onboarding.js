import '../utils/loadEnv.js';
import db from '../models/index.js';
import {shops,heldItems,excludedItems} from './data/shop-onboarding-20261022.js';
import {offerFingerprint} from '../services/marketplace/onboarding.js';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const report={shops:[],offers:0,held:heldItems.length,excluded:excludedItems.length,missing_photos:[]};
try{
 await db.sequelize.authenticate();
 for(const config of shops){
  const shop=await db.Shop.findOne({where:{name:config.name}});assert.ok(shop);assert.equal(shop.description,null);assert.equal(shop.phone,config.phone);assert.equal(shop.address,config.address);
  for(const offer of config.offers){
   const listing=await db.SellerListing.findOne({where:{shop_id:shop.id,merchant_sku:`onboard-${offerFingerprint(offer)}`},include:[{model:db.DeviceVariant,as:'variant',include:[{model:db.Device,as:'device'}]}]});assert.ok(listing);
   assert.equal(Number(listing.price),offer.price);assert.equal(listing.condition,offer.condition);assert.equal(listing.quantity,1);assert.equal(listing.warranty_months,offer.warranty_months??null);
   assert.equal(Number(listing.variant.ram_gb)||null,offer.ram_gb);assert.equal(Number(listing.variant.storage_gb)||null,offer.storage_gb);assert.equal(listing.variant.sim_type,offer.sim_type??null);
   assert.deepEqual(listing.details.condition_details,offer.condition_details??null);assert.equal(listing.details.extended_ram_gb,offer.extended_ram_gb??null);
   if(!listing.variant.device.primary_image_url)report.missing_photos.push({shop:config.name,slug:offer.slug});
   const response=await fetch(`http://localhost:8000/api/v2/marketplace/listings/${listing.id}`);assert.equal(response.status,200);const dto=await response.json();const serialized=JSON.stringify(dto);assert.ok(!/source_evidence|source_note|source_metadata|supplied-shop-onboarding/.test(serialized));
   report.offers++;
  }
  report.shops.push({name:config.name,offers:config.offers.length});
 }
 report.missing_photo_families=[...new Set(report.missing_photos.map(x=>x.slug))];
 await writeFile('/tmp/onboarding-audit.json',JSON.stringify(report,null,2));await writeFile('/tmp/onboarding-held-items.json',JSON.stringify({held:heldItems,excluded:excludedItems},null,2));
 console.log(JSON.stringify({offers:report.offers,shops:report.shops.length,held:report.held,missing_photo_offers:report.missing_photos.length,missing_photo_families:report.missing_photo_families.length}));
}finally{await db.sequelize.close();}
