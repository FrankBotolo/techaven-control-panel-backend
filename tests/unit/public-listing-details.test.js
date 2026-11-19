import test from 'node:test';
import assert from 'node:assert/strict';
import { publicListingDetails,publicSpecifications } from '../../services/catalogue/dto.js';
test('public details retain material facts but never source evidence or import commentary',()=>{
 assert.deepEqual(publicListingDetails({source_note:'internal review',source_evidence:{attachment:'private'},
   tax_exclusive:true,extended_ram_gb:4,condition_details:{fingerprint_reader:'not_working'}}),
 {tax_exclusive:true,extended_ram_gb:4,condition_details:{fingerprint_reader:'not_working'}});
 assert.deepEqual(publicListingDetails(null),{});
});
test('nested source and import commentary never become specifications',()=>{
 assert.deepEqual(publicSpecifications({description:'Duplicate adverts quote...',display:{size_inch:14,note:'unverified'},configuration:{cpu:'Core i5'},source_variant:{raw:'private'}}),
 {display:{size_inch:14},configuration:{cpu:'Core i5'}});
});
