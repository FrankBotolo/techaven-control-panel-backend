import { consolidateOffers } from '../../services/marketplace/onboarding.js';

const p = (slug, brand, ram, storage, price, extra = {}) => ({ slug, brand,
  ram_gb: ram, storage_gb: storage, price, category: 'Smartphones', condition: 'new', ...extra });
const laptop = (slug, ram, storage, price, configuration, extra = {}) => p(slug,
  slug.startsWith('hp-') ? 'hp' : slug.startsWith('dell-') ? 'dell' : slug.startsWith('surface-') ? 'microsoft' : 'lenovo',
  ram, storage, price, { category: 'Laptops', configuration, ...extra });
const logo = file => `${file}_n.jpg`;
export const shops = [
  { key: 'xisal-electronics', name: 'Xisal Electronics', phone: '+265897849431',
    location: 'Blantyre', address: 'Phekani House, Glyn Jones Road, opposite Chibisa House',
    logo_file: logo('410128596_122172319298003048_4055144228150143565'),
    profile: { secondary_phone: '+265995898656', warranty: '12-month warranty on the supplied phone offers' },
    offers: [p('redmi-note-15-4g','xiaomi',8,256,995000,{extended_ram_gb:8,warranty_months:12}),
      p('redmi-note-14-4g','xiaomi',8,256,875000,{warranty_months:12})] },
  { key:'redmi-nyasa',name:'Redmi Nyasa',phone:'+265980097538',location:null,address:null,
    logo_file:logo('468146702_122151048050284479_4726141322737522870'),profile:{},offers:[
      p('infinix-smart-10','infinix',4,256,495000),p('itel-a90','itel',4,128,395000),
      p('redmi-9t','xiaomi',4,128,295000,{condition:'refurbished'}),
      p('redmi-9a','xiaomi',4,64,235000,{condition:'refurbished'}),p('itel-p65','itel',4,128,435000)] },
  {key:'pinnacle-electronics-solutions',name:'Pinnacle Electronics Solutions',phone:'+265992335933',
    location:'Lilongwe',address:'Area 2',logo_file:logo('456989743_1027477286049485_7180321160088555023'),profile:{},offers:[
      p('galaxy-s21-ultra','samsung',12,128,1399000),
      p('galaxy-s21-plus','samsung',8,256,1399000),
      p('galaxy-s22-plus','samsung',8,256,1599000),p('galaxy-s22-plus','samsung',8,256,1549000),
      p('galaxy-s25-ultra','samsung',12,256,3100000),p('galaxy-s24-ultra','samsung',12,1024,3599000),
      p('galaxy-s24-ultra','samsung',12,512,2999000),
      ...[['unbranded-power-bank-20000mah-two-usb',99500],['unbranded-power-bank-10000mah-four-cables',55500],
        ['unbranded-power-bank-10000mah-two-usb',47500]].map(([slug,price])=>p(slug,'unbranded',null,null,price,{category:'Accessories'})),
      p('galaxy-s22-ultra','samsung',8,128,1999000),
      p('galaxy-s22-ultra','samsung',8,128,1799000,{sim_type:'Dual SIM',warranty_months:12}),
      p('galaxy-s22-ultra','samsung',12,256,1699000),p('galaxy-s22-ultra','samsung',12,256,1899000),
      p('pixel-4-xl','google',6,64,499000),
      p('pixel-6-pro','google',12,128,1099000,{condition:'used'}),
      p('oppo-a56-5g','oppo',8,256,375000,{condition:'used',warranty_available:true}),
      p('redmi-7a','xiaomi',2,16,148000,{condition:'used',warranty_available:true}),
      p('galaxy-s26-ultra','samsung',12,256,4899000),
      p('pixel-7-pro','google',12,128,999000,{condition:'used',condition_details:{fingerprint_reader:'not_working'}}),
      p('iphone-17-pro-max','apple',null,256,5599000,{condition:'used',condition_details:{battery_health_above_percent:90}}),
      p('iphone-12-pro-max','apple',null,256,1480000,{condition:'used',sim_type:'Dual SIM',condition_details:{battery_health_percent:88}}),
      p('iphone-12-pro-max','apple',null,256,1580000,{condition:'used',region:'USA',sim_type:'Dual SIM',condition_details:{battery_health_percent:88}}),
      p('galaxy-s26-ultra','samsung',12,256,4550000,{region:'EU',sim_type:'Dual SIM',warranty_months:12}),
      p('pixel-8-pro','google',12,128,1850000),p('pixel-8','google',null,128,1450000),
      p('pixel-7-pro','google',12,128,1550000),p('pixel-7','google',8,128,1190000,{sim_type:'Physical SIM + eSIM'}),
      p('pixel-7','google',8,128,1150000,{sim_type:'Physical SIM + eSIM'}),
      p('pixel-6-pro','google',12,128,1399000),p('pixel-6','google',8,128,999000,{sim_type:'Physical SIM + eSIM'}),
      laptop('dell-latitude-e7450',4,500,750000,{cpu:'Intel Core i5, 5th generation',storage_type:'HDD'}),
      laptop('dell-latitude-e7270',8,256,890000,{cpu:'Intel Core i5, 6th generation',storage_type:'SSD',touchscreen:true}),
      laptop('dell-latitude-3310',4,256,780000,{storage_type:'SSD'}),
      laptop('dell-latitude-3189',4,128,690000,{storage_type:'SSD',touchscreen:true,convertible:true}),
      laptop('lenovo-thinkpad-x390',16,256,1199000,{cpu:'Intel Core i5, 8th generation',storage_type:'SSD',touchscreen:true}),
      ...[['t440',4,780000],['t450',5,790000],['t460',6,880000],['t470',7,890000]].map(([model,gen,price])=>
        laptop(`lenovo-thinkpad-${model}`,8,model==='t460'?256:500,price,{cpu:`Intel Core i5, ${gen}th generation`,storage_type:model==='t460'?'SSD':'HDD'})),
      laptop('hp-probook-440-g5',8,256,1500000,{cpu:'Intel Core i5',storage_type:'SSD'}),
      laptop('hp-pavilion-x360-13th-gen',16,1024,4000000,{cpu:'Intel Core i7, 13th generation',storage_type:'SSD',touchscreen:true,convertible:true}),
      laptop('hp-envy-x360-ultra-7',16,1024,4400000,{cpu:'Intel Core Ultra 7',storage_type:'SSD',touchscreen:true,convertible:true}),
      laptop('hp-envy-x360-core-5',8,512,3500000,{cpu:'Intel Core 5',storage_type:'SSD',touchscreen:true,convertible:true}),
      p('galaxy-s24','samsung',8,256,1499000,{sim_type:'Dual SIM'}),p('galaxy-a55','samsung',8,256,850000),
      p('redmi-9t','xiaomi',6,128,375000),
      laptop('dell-vostro-15',8,256,850000,{cpu:'Intel Core i5-1135G7',storage_type:'M.2 SSD',display_inches:15.6})] },
  {key:'omega-technologies-hub',name:'Omega Technologies Hub',phone:'+265987702985',location:null,address:null,
    logo_file:logo('495642915_122233895108231507_8520151352158012999'),profile:{},offers:[]},
  {key:'chi-investment',name:'CHI Investment',phone:'+265996534666',location:'Lilongwe',address:'Area 47, Sector 1',
    logo_file:logo('460730986_495268026738186_985821505704162853'),profile:{},offers:[
      p('iphone-17','apple',null,256,4690000,{sim_type:'Physical SIM'}),p('iphone-17','apple',null,256,4590000),
      ...[['iphone-15',128,3430000],['iphone-15',128,3550000],['iphone-14',256,2850000],['iphone-14',256,2830000],
        ['iphone-13',128,2080000],['iphone-13',128,2200000],['iphone-14-pro-max',256,3450000],['iphone-14-pro-max',256,3650000],
        ['iphone-13-pro-max',256,3050000],['iphone-13-pro-max',256,3250000],['iphone-16-pro-max',256,5550000],
        ['iphone-15-pro-max',256,4250000],['iphone-12-pro-max',256,2550000],['iphone-11-pro-max',256,1950000]].map(([s,st,pr])=>p(s,'apple',null,st,pr)),
      p('iphone-12-pro-max','apple',null,256,2250000,{condition:'open_box'}),
      p('pixel-11-pro-xl','google',null,256,6150000),
      ...[['galaxy-s26-ultra',4850000],['galaxy-s25-ultra',4250000],['galaxy-s24-ultra',3750000],['galaxy-s23-ultra',3150000],
        ['galaxy-s22-ultra',2550000]].map(([s,pr])=>p(s,'samsung',null,256,pr)),
      laptop('dell-latitude-5320',16,256,1950000,{cpu:'Intel Core i5, 11th generation',storage_type:'SSD',touchscreen:true}),
      laptop('surface-laptop-4',8,256,1950000,{cpu:'Intel Core i5, 11th generation',storage_type:'SSD'}),
      laptop('surface-laptop-3',8,256,1850000,{cpu:'Intel Core i5, 10th generation',storage_type:'SSD'}),
      laptop('hp-elitebook-840-g7',8,256,1700000,{cpu:'Intel Core i5, 10th generation',storage_type:'SSD'}),
      laptop('hp-elitebook-840-g7',8,512,1850000,{cpu:'Intel Core i5, 10th generation',storage_type:'SSD',touchscreen:true}),
      laptop('hp-elitebook-840-g6',8,256,1350000,{cpu:'Intel Core i5, 8th generation',storage_type:'SSD',dedicated_graphics:'Radeon 550X 2 GB'}),
      laptop('hp-elitebook-840-g8',8,256,1950000,{cpu:'Intel Core i5, 11th generation',storage_type:'SSD',touchscreen:true}),
      laptop('dell-latitude-5490',8,256,1300000,{cpu:'Intel Core i5, 8th generation',storage_type:'SSD'}),
      laptop('dell-latitude-5480',8,256,950000,{cpu:'Intel Core i5, 7th generation',storage_type:'SSD'}),
      laptop('dell-latitude-5480',8,256,780000,{cpu:'Intel Core i5, 6th generation',storage_type:'SSD'}),
      laptop('lenovo-thinkpad-x1-carbon-gen-7',16,256,1750000,{cpu:'Intel Core i5, 10th generation',storage_type:'SSD'}),
      laptop('lenovo-thinkpad-l13-yoga',16,512,1950000,{cpu:'Intel Core i5, 11th generation',storage_type:'SSD',touchscreen:true,convertible:true}),
      laptop('dell-inspiron-15-5000-series-2-in-1',8,256,1150000,{cpu:'Intel Core i5, 8th generation',storage_type:'SSD',touchscreen:true,convertible:true})] },
  {key:'wuden-electronics',name:'Wuden Electronics',phone:'+265981788464',location:'Lilongwe',address:'Area 23',
    logo_file:logo('692184446_122110925672776772_1164636452630859251'),profile:{delivery:'Delivery available'},offers:[
      p('galaxy-s23-fe','samsung',8,128,1450000,{sim_type:'Single SIM',swap_plus_cash:true}),
      p('galaxy-tab-a9','samsung',4,64,490000,{category:'Tablets',sim_type:'Single SIM'}),p('redmi-8a','xiaomi',4,64,235000)]},
  {key:'audiovisio',name:'Audiovisio',phone:'+265993222669',location:'Lilongwe',address:'Biwi Triangle and Area 24',
    logo_file:logo('432423385_122133397766140954_5514057576180754415'),
    profile:{secondary_phone:'+265884226353',delivery:'Countrywide delivery',warranty:'1-month warranty'},offers:[
      p('galaxy-s21-fe','samsung',6,128,765000,{condition:'used',region:'USA',warranty_months:1})]},
  {key:'sunstone-electronics',name:'Sunstone Electronics',phone:'+265888332360',location:'Lilongwe',
    address:'Bwaila Street (Devil Street), opposite Mugasa Building',logo_file:logo('408788384_122098954406144497_6413893081245059393'),
    profile:{delivery:'Countrywide delivery',payment:'Lay-by available'},offers:[
      p('redmi-9t','xiaomi',4,128,295000),p('redmi-9t','xiaomi',6,128,295000),p('redmi-9','xiaomi',6,128,315000),
      p('redmi-13c','xiaomi',4,128,410000,{condition:'used',extended_ram_gb:2,warranty_available:true}),
      p('redmi-a7','xiaomi',3,64,450000,{extended_ram_gb:3,warranty_months:12}),
      p('redmi-note-17','xiaomi',6,256,975000,{extended_ram_gb:6,warranty_months:12}),
      p('redmi-12r','xiaomi',6,128,395000,{condition:'used',warranty_available:true})]}
];

const omega = shops.find(s=>s.key==='omega-technologies-hub');
const rows = (brand, condition, entries) => entries.forEach(([slug,ram,storage,price,extra={}])=>omega.offers.push(p(slug,brand,ram,storage,price,{condition,...extra})));
rows('xiaomi','new',[
 ['redmi-a3x',4,128,438000],['redmi-a5',4,64,395000],['redmi-a5',4,128,468000],['redmi-15c',4,128,594000],['redmi-15c',8,256,647000],
 ['redmi-13x',6,128,566000],['redmi-13x',8,256,654000],['redmi-15',6,128,670000],['redmi-15',8,256,768000],
 ['redmi-note-14-4g',6,128,698000],['redmi-note-14-4g',8,256,784000],['redmi-note-15-4g',6,256,860000],
 ['redmi-note-15-5g',8,128,1248000],['redmi-note-15-pro',8,256,1198000]]);
rows('xiaomi','refurbished',[
 ['redmi-6a',3,32,126000],['redmi-6',4,64,168000],['redmi-8a',3,32,208000],['redmi-8a',4,64,238000],
 ['redmi-8',4,32,218000],['redmi-8',4,64,248000],['redmi-9',6,64,316000],['redmi-9',4,128,330000],['redmi-9',6,128,338000],
 ['redmi-9t',4,128,365000],['redmi-9t',6,128,384000],['poco-m3',4,128,388000],['poco-m3',6,128,394000]]);
rows('vivo','refurbished',[
 ['vivo-y53',2,32,116000],['vivo-y55',3,32,118000],['vivo-y66',4,64,138000],['vivo-y67',4,64,148000],
 ['vivo-y17',6,128,268000],['vivo-y19',6,128,308000]]);
rows('oppo','refurbished',[
 ['oppo-a3s',4,64,198000],['oppo-f9',6,128,236000],['oppo-a56-5g',8,128,368000,{extended_ram_gb:3}]]);
rows('huawei','refurbished',[
 ['honor-8',4,64,158000],['honor-9',4,64,208000],['honor-9i',4,128,224000],['huawei-mate-10-lite',4,128,224000],
 ['honor-7x',4,64,203000],['honor-7x',4,128,218000],['honor-20i',6,64,216000],['honor-20i',4,128,226000],['honor-20i',4,256,238000],
 ['huawei-mate-20-lite',6,128,248000],['huawei-nova-3i',4,128,258000],['huawei-nova-3i',6,128,263000],
 ['huawei-p20-lite',4,128,228000],['huawei-p30-lite',4,128,276000],['huawei-p30-lite',6,128,286000],
 ['huawei-p-smart-plus-2019',4,128,258000],['huawei-p-smart-2021',8,128,348000],['huawei-y7-pro',4,128,228000],['huawei-y9-prime',6,128,284000]]);
rows('samsung','new',[
 ['galaxy-a05',4,64,394000],['galaxy-a05',4,128,498000],['galaxy-a06',4,64,438000],['galaxy-a06',4,128,488000],
 ['galaxy-a07',4,64,488000],['galaxy-a07',4,128,568000],['galaxy-a16',4,128,680000],['galaxy-a16',8,256,794000],
 ['galaxy-a17',4,128,734000],['galaxy-a17',6,128,780000],['galaxy-a26',6,128,895000],['galaxy-a36',8,256,1395000],['galaxy-a56',8,256,1595000]]);
rows('samsung','refurbished',[
 ['galaxy-a03',4,32,296000],['galaxy-a11',4,32,306000],['galaxy-a04e',4,128,455000],
 ['galaxy-s20-fe-5g',6,128,638000,{sim_type:'Single SIM'}],['galaxy-s20-fe-5g',6,128,658000,{sim_type:'Dual SIM'}]]);

// Evidence pointers are private source metadata. Never render them as descriptions.
for (const shop of shops) {
  shop.source = { provider:'supplied-shop-onboarding-20261022', text_attachment:shop.key==='pinnacle-electronics-solutions'?'Pasted text.txt':null,
    supplied_by_user:true };
  shop.offers = consolidateOffers(shop.offers.map(o=>({...o,sources:[`${shop.key}: supplied text/poster`]})));
}

export const heldItems = [
 ['xisal-electronics','Redmi 17 8/128',785000,'Manufacturer lists 4/128 or 6/128; advertised 8 GB physical/extended split unresolved'],
 ['xisal-electronics','Redmi Note 17 8/128',995000,'Manufacturer lists 8 GB with 256 GB; advertised 8/128 unresolved'],
 ['xisal-electronics','Redmi Note 17 5G 12/256',1295000,'Manufacturer lists 6/256 or 8/256; advertised 12 GB physical/extended split unresolved'],
 ['redmi-nyasa','Infinix GT 30 4/128',635000,'Advertised RAM/configuration and display claims conflict'],
 ['redmi-nyasa','Redmi 13R 4/64',420000,'Poster processor/battery/camera conflict with named model'],
 ['redmi-nyasa','Redmi Note 8 4/64',256000,'Poster processor conflicts with original and 2021 model identities'],
 ['pinnacle-electronics-solutions','AirPods Pro 2',59500,'Manufacturer/authentic model not established'],
 ['pinnacle-electronics-solutions','Redmi Note 11E 4/128 4G',455000,'Network conflicts with named model'],
 ['pinnacle-electronics-solutions','Infinix Smart 10 8/256',595000,'Physical/extended RAM split unspecified'],
 ['pinnacle-electronics-solutions','Dell Latitude 7280 i5 6th generation',890000,'Model/CPU generation conflict'],
 ['pinnacle-electronics-solutions','HP Omni xFlip 15th Gen Ultra 256V 16/1TB',4200000,'Mixed model/CPU identity'],
 ['pinnacle-electronics-solutions','Jewellery/watch bundle',55000,'Mixed bundle has no identifiable individual products'],
 ['omega-technologies-hub','Redmi Note 14 Pro+ 5G 16/256',1480000,'Physical/extended RAM split unresolved'],
 ['omega-technologies-hub','Vivo Y51A 4/32',108000,'Model year/configuration identity unresolved'],
 ['omega-technologies-hub','Vivo Y11 6/128',248000,'Model year/physical RAM identity unresolved'],
 ['chi-investment','AirTab S11 Ultra 24GB/1TB',565000,'Manufacturer/model and RAM identity unresolved'],
 ['chi-investment','MacBook Air M1 Core i5 8/256',1950000,'Mutually exclusive processors'],
 ['audiovisio','Samsung Galaxy A16 5G',null,'No price supplied'],
 ['audiovisio','Samsung Galaxy A53 5G',null,'No price supplied'],
 ['sunstone-electronics','Redmi 13R 4+2/128',410000,'Combined advertisement requires distinct model confirmation'],
].map(([shop,product,price,reason])=>({shop,product,price,reason,status:'held'}));
export const excludedItems = [{shop:'pinnacle-electronics-solutions',product:'Mercedes-Benz car',reason:'Outside catalogue scope'}];
