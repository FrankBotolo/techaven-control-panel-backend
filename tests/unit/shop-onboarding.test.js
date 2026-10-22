import test from 'node:test';
import assert from 'node:assert/strict';
import { consolidateOffers,offerKey } from '../../services/marketplace/onboarding.js';
import { shops,heldItems,excludedItems } from '../../scripts/data/shop-onboarding-20261022.js';

test('highest-price duplicates retain sources without merging condition or SIM differences',()=>{
 const base={slug:'phone',price:100,ram_gb:4,storage_gb:128,condition:'new',sources:['one']};
 const rows=consolidateOffers([base,{...base,price:200,sources:['two']},{...base,condition:'used'},{...base,sim_type:'Dual SIM'}]);
 assert.equal(rows.length,3);assert.equal(rows[0].price,200);assert.deepEqual(rows[0].sources,['one','two']);
 assert.throws(()=>consolidateOffers([{...base,price:NaN}]),/Invalid price/);
});
test('manifest ownership, held products and physical RAM remain distinct',()=>{
 assert.equal(shops.length,8);
 const wuden=shops.find(s=>s.key==='wuden-electronics');assert.equal(wuden.offers.length,3);
 assert.ok(wuden.offers.every(o=>o.category!=='Laptops'));
 for(const shop of shops) assert.equal(new Set(shop.offers.map(offerKey)).size,shop.offers.length);
 const sunstone=shops.find(s=>s.key==='sunstone-electronics');
 const extended=sunstone.offers.find(o=>o.slug==='redmi-13c');assert.equal(extended.ram_gb,4);assert.equal(extended.extended_ram_gb,2);
 for(const key of ['redmi-nyasa','omega-technologies-hub']) assert.equal(shops.find(s=>s.key===key).address,null);
 assert.ok(heldItems.some(o=>o.product.includes('M1 Core i5')));assert.equal(excludedItems.length,1);
 const pinnacle=shops.find(s=>s.key==='pinnacle-electronics-solutions');
 assert.equal(pinnacle.offers.filter(o=>o.brand==='unbranded').length,3);
 assert.equal(pinnacle.offers.find(o=>o.condition_details?.fingerprint_reader).condition_details.fingerprint_reader,'not_working');
 assert.equal(shops.find(s=>s.key==='chi-investment').offers.filter(o=>o.slug==='iphone-12-pro-max').length,2);
});
