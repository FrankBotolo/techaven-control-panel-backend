import '../utils/loadEnv.js';
import {pathToFileURL} from 'node:url';
export function replaceOrigin(value, from, to) {
  if(typeof value==='string')return value===from?to:value.startsWith(from+'/')?to+value.slice(from.length):value;
  if(Array.isArray(value))return value.map(item=>replaceOrigin(item,from,to));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceOrigin(v,from,to)]));
  return value;
}
async function main(){
 const args=process.argv.slice(2);const option=name=>args[args.indexOf(name)+1];
 if(!args.includes('--from')||!args.includes('--to'))throw Error('Usage: --from http://localhost:8000 --to https://api.example.com [--apply]');
 const from=new URL(option('--from')).origin,to=new URL(option('--to')).origin;
 if(!/^https?:/.test(from)||!/^https?:/.test(to)||from==='null'||to==='null'||from===to)throw Error('Two distinct HTTP(S) origins are required');
 const {default:db}=await import('../models/index.js');const apply=args.includes('--apply');const counts={};
 try{await db.sequelize.authenticate();await db.sequelize.transaction(async transaction=>{
  for(const [model,fields]of [[db.Shop,['logo','profile']],[db.Device,['primary_image_url']],[db.DeviceMedia,['url']],[db.ListingImage,['url']],[db.Product,['image','images','thumbnail']]]){
   if(!model)continue;const columns=fields.filter(f=>model.rawAttributes[f]);if(!columns.length)continue;counts[model.name]=0;
   const rows=await model.findAll({attributes:['id',...columns],transaction});
   for(const row of rows){const changes={};for(const field of columns){const original=row.get(field),updated=replaceOrigin(original,from,to);if(JSON.stringify(original)!==JSON.stringify(updated))changes[field]=updated;}
    if(Object.keys(changes).length){counts[model.name]++;if(apply)await row.update(changes,{transaction});}
   }
  }
 });console.log(JSON.stringify({applied:apply,changed_rows:counts}));}finally{await db.sequelize.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
