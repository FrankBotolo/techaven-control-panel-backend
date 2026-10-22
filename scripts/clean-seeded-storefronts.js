import '../utils/loadEnv.js';
import db from '../models/index.js';
import {writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const names=['Mnex Electronics','Pixie Electronics','B24 Electronics','Apple Guy','Edgicate Store','Apple & All',
 'Saeed Enterprise','Innovative Electronics','Tech Central','M&N Electronics MW','Top Level Store'];
const apply=process.argv.includes('--apply');
const commercial=async()=>createHash('sha256').update(JSON.stringify(await db.SellerListing.findAll({
 attributes:['id','shop_id','device_variant_id','device_variant_color_id','merchant_sku','condition','currency','price','quantity','status','warranty_months'],
 raw:true,order:[['id','ASC']]}))).digest('hex');
try{
 await db.sequelize.authenticate();const before=await commercial();
 const shops=await db.Shop.findAll({where:{name:names}});
 const listings=await db.SellerListing.findAll({where:{shop_id:shops.map(s=>s.id)}});
 const snapshot='/tmp/seeded-storefront-source-evidence.json';
 if(apply){let exists=false;try{await access(snapshot);exists=true;}catch{}
  if(!exists)await writeFile(snapshot,JSON.stringify({shops:shops.map(s=>s.toJSON()),listings:listings.map(l=>({id:l.id,details:l.details}))},null,2));
  await db.sequelize.transaction(async transaction=>{
   for(const shop of shops){
    const profile={...(shop.profile??{})};delete profile.tagline;delete profile.specialties;
    if(shop.name==='Mnex Electronics')profile.secondary_phone='+8618573134965';
    if(shop.name==='Apple & All')profile.secondary_phone='+265887007700';
    if(shop.name==='Edgicate Store'){profile.website='https://store.edgicate.com';profile.payment='60-day lay-by available';}
    if(JSON.stringify(profile)!==JSON.stringify(shop.profile)||shop.description!==null)
      await shop.update({description:null,profile},{transaction});
   }
   for(const listing of listings){
    const details={...(listing.details??{})};
    const note=details.source_note??'';
    if(/battery health of 100% or 87%/.test(note))details.condition_details={battery_health_options_percent:[87,100]};
    else if(/100% battery health/.test(note))details.condition_details={battery_health_percent:100};
    if(JSON.stringify(details)!==JSON.stringify(listing.details??{}))await listing.update({details},{transaction});
   }
  });
 }
 assert.equal(await commercial(),before,'Commercial records changed during copy cleanup');
 console.log(JSON.stringify({applied:apply,shops:shops.length,commercial_records_unchanged:true}));
}finally{await db.sequelize.close();}
