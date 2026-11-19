import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCartListing} from '../../controllers/V2CartController.js';
test('basket uses catalogue cover and structured facts without raw seller evidence',()=>{
 const dto=publicCartListing({id:1,price:100,quantity:1,condition:'used',currency:'MWK',shop:{id:2,name:'Shop'},details:{source_note:'private',tax_exclusive:true,condition_details:{fingerprint_reader:'not_working'}},images:[{url:'/pricelist.jpg'}],variant:{id:3,ram_gb:8,storage_gb:128,sim_type:'Dual SIM',source_metadata:{private:true},device:{id:4,name:'Phone',slug:'phone',primary_image_url:'/stock.jpg',source_metadata:{private:true}}}});
 assert.equal(dto.variant.device.primary_image_url,'/stock.jpg');assert.deepEqual(dto.images,[]);assert.equal(dto.details.condition_details.fingerprint_reader,'not_working');assert.ok(!JSON.stringify(dto).includes('private'));
});
