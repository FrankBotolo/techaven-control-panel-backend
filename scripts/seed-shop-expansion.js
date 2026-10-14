import '../utils/loadEnv.js';
import db from '../models/index.js';
import { shops } from './data/shop-expansion.js';
import { canonicalVariantKey } from '../services/catalogue/normalization.js';
import { enqueueDevice, enqueueShop } from '../services/catalogue/promotionSync.js';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const apply=process.argv.includes('--apply');
const report={applied:apply,shops:[],created:{shops:0,devices:0,variants:0,listings:0,images:0},errors:[]};
const url=(key,file)=>`http://localhost:8000/uploads/${key}/${file}`;
async function protectedState(){
 const existing=(await db.Shop.findAll({raw:true,order:[['id','ASC']]})).filter(s=>!shops.some(n=>n.name===s.name));
 const listings=await db.SellerListing.findAll({where:{shop_id:existing.map(s=>s.id)},raw:true,order:[['id','ASC']]});
 return createHash('sha256').update(JSON.stringify({shops:existing,listings})).digest('hex');
}
try{
 await db.sequelize.authenticate(); const before=await protectedState();
 for(const config of shops) for(const file of new Set([...(config.logo_file?[config.logo_file]:[]),...config.offers.flatMap(o=>o.images??[])])) await readFile(`/app/uploads/${config.key}/${file}`);
 const run=async transaction=>{
  const [paygo]=await db.Category.findOrCreate({where:{name:'Pay as you go (PAYGO)',shop_id:null},defaults:{status:'approved'},transaction});
  for(const config of shops){
   const {key,offers,logo_file,...values}=config;
   const matches=await db.Shop.findAll({where:{name:config.name},transaction}); assert.ok(matches.length<=1,'Ambiguous shop identity');
   let shop=matches[0]; if(!shop){shop=await db.Shop.create({...values,logo:logo_file?url(key,logo_file):null,status:'active',application_status:'approved',is_verified:false},{transaction});report.created.shops++;}
   else await shop.update({...values,...(logo_file?{logo:url(key,logo_file)}:{})},{transaction});
   for(const offer of offers){
    const [category]=await db.Category.findOrCreate({where:{name:offer.category,shop_id:null},defaults:{status:'approved'},transaction});
    const [brand]=await db.Brand.findOrCreate({where:{slug:offer.brand},defaults:{name:offer.brand,slug:offer.brand},transaction});
    const source={provider:'user-supplied-shop-expansion',shop:config.name,verified:false,note:offer.note??null};
    let device=await db.Device.findOne({where:{slug:offer.slug},transaction});
    if(!device){device=await db.Device.create({slug:offer.slug,name:offer.name,brand_id:brand.id,category_id:category.id,battery_mah:offer.battery_mah??null,os_family:offer.os_family??null,specs:offer.specs??{},source_metadata:source,verification_status:'unverified'},{transaction});report.created.devices++;}
    assert.equal(device.brand_id,brand.id,`Brand mismatch ${offer.slug}`);assert.equal(device.category_id,category.id,`Category mismatch ${offer.slug}`);
    if(device.source_metadata?.provider==='user-supplied-shop-expansion'&&device.verification_status==='unverified')await device.update({name:offer.name,...(offer.battery_mah?{battery_mah:offer.battery_mah}:{}),...(offer.os_family?{os_family:offer.os_family}:{}),...(offer.specs?{specs:offer.specs}:{})},{transaction});
    const fields={ram_gb:offer.ram_gb??null,storage_gb:offer.storage_gb??null,network_generation:offer.slug.endsWith('-5g')?'5G':offer.slug.endsWith('-4g')?'4G':null,region:'global',model_number:null};
    const canonical_key=canonicalVariantKey(offer.slug,fields);
    let variant=await db.DeviceVariant.findOne({where:{canonical_key,device_id:device.id},transaction});
    if(!variant){variant=await db.DeviceVariant.create({...fields,canonical_key,device_id:device.id,verification_status:'unverified',source_metadata:source,attributes:{configuration:offer.specs??{},extended_ram_gb:offer.extended_ram_gb??null,advertised_ram_gb:offer.advertised_ram_gb??null}},{transaction});report.created.variants++;}
    const sku=`${key}-${offer.slug}-${offer.ram_gb??'na'}-${offer.storage_gb??'na'}`;
    const existing=await db.SellerListing.findOne({where:{shop_id:shop.id,device_variant_id:variant.id,condition:offer.condition,device_variant_color_id:null},transaction});
    const details={tax_exclusive:key==='innovative-electronics',source_note:offer.note??null,extended_ram_gb:offer.extended_ram_gb??null,advertised_ram_gb:offer.advertised_ram_gb??null};
    const listing=existing?await existing.update({price:Math.max(Number(existing.price),offer.price),details,warranty_months:offer.warranty_months??null},{transaction}):await db.SellerListing.create({shop_id:shop.id,device_variant_id:variant.id,condition:offer.condition,currency:'MWK',price:offer.price,quantity:1,status:'active',merchant_sku:sku,warranty_months:offer.warranty_months??null,details},{transaction});
    if(!existing)report.created.listings++;
    for(const [index,file] of (offer.images??[]).entries()){const [,created]=await db.ListingImage.findOrCreate({where:{listing_id:listing.id,url:url(key,file)},defaults:{storage_key:`${key}/${file}`,alt_text:`${config.name}: ${offer.name} advertisement`,is_primary:index===0,sort_order:index},transaction});if(created)report.created.images++;}
    if(config.profile?.paygo&&offer.category==='Smartphones')await db.sequelize.query('INSERT IGNORE INTO seller_listing_categories (listing_id,category_id) VALUES (?,?)',{replacements:[listing.id,paygo.id],transaction});
    await enqueueDevice(device.id,{transaction,reason:'supplied-shop-expansion'});
   }
   const count=await db.SellerListing.count({where:{shop_id:shop.id,status:'active'},transaction});await shop.update({total_products:count},{transaction});await enqueueShop(shop.id,{transaction,reason:'supplied-shop-expansion'});report.shops.push({id:shop.id,name:shop.name,offers:count});
  }
 };
 if(apply)await db.sequelize.transaction(run);else report.shops=shops.map(s=>({name:s.name,offers:s.offers.length}));
 assert.equal(await protectedState(),before,'Unrelated shops/offers changed');report.protected_records_unchanged=true;
 console.log(JSON.stringify(report,null,2));
}catch(error){report.errors.push(error.message);console.error(error.message);process.exitCode=1;}
finally{await writeFile('/tmp/shop-expansion-report.json',JSON.stringify(report,null,2));await db.sequelize.close();}
