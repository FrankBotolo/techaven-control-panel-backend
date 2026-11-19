const phone = (slug, name, brand, ram, storage, price, extra = {}) => ({ slug, name, brand, ram_gb: ram, storage_gb: storage, price, category: 'Smartphones', condition: 'new', ...extra });
export const shops = [
  { key: 'innovative-electronics', name: 'Innovative Electronics', location: 'Lilongwe', address: 'Area 3, Olympic Mall, Shop 25, behind Chipiku, near Akulenje Inn and next to LiDi Home Goods', phone: '+265990251090', logo_file: 'logo.png', description: 'Smartphones and children’s tablets in Area 3. Visit Shop 25 at Olympic Mall or arrange courier delivery across Malawi.', profile: { delivery: 'Courier delivery across Malawi', tax_note: 'Quoted product prices exclude VAT. Confirm the final VAT-inclusive amount with the shop.', paygo: true }, offers: [
    phone('redmi-13','Redmi 13','xiaomi',6,128,580000),
    phone('redmi-15c','Redmi 15C','xiaomi',4,128,580000,{extended_ram_gb:4,images:['redmi-15c.jpg']}),
    phone('redmi-a7','Redmi A7','xiaomi',3,64,500000,{extended_ram_gb:3,images:['redmi-a7.jpg','redmi-a7-unboxed.jpg']}),
    phone('redmi-a7-pro','Redmi A7 Pro','xiaomi',4,128,560000,{extended_ram_gb:4,images:['redmi-a7-pro.jpg']}),
    phone('galaxy-a07','Samsung Galaxy A07','samsung',4,64,560000),
    phone('tecno-pop-20','Tecno POP 20','tecno',4,64,550000,{extended_ram_gb:4,images:['tecno-pop-20.jpg']}),
    phone('tecno-spark-50','Tecno Spark 50','tecno',null,128,780000,{advertised_ram_gb:12,images:['tecno-spark-50.jpg'],note:'Advertised 12 GB includes unspecified memory extension; physical RAM not confirmed. Shop advertises 6700 mAh; existing catalogue battery preserved pending regional-model confirmation.'}),
    phone('itel-a200','itel A200','itel',null,128,560000,{advertised_ram_gb:8,note:'Advertised 8 GB RAM; physical/extended split not confirmed.'}),
    {slug:'oscal-kido-2',name:'OSCAL Kido 2 Kids Tablet',brand:'oscal',ram_gb:4,storage_gb:64,price:450000,category:'Tablets',condition:'new',note:'Wi-Fi tablet; 10.1-inch display, 6600 mAh battery and anti-shock silicone case. Advertised for children aged 2–12.'}
  ]},
  { key:'tech-central',name:'Tech Central',location:'Lilongwe',address:'Olympic Mall, upstairs Shop 50',phone:'+265888228315',logo_file:'logo.png',description:'New and pre-owned phones at Olympic Mall. Visit upstairs Shop 50 or contact the team for availability and battery-health details.',profile:{secondary_phone:'+265984797321',enquiries:[{name:'iPhone 13 Pro Max',storage_gb:128,battery_health_percent:87,condition:'used',price_label:'Price on enquiry'}]},offers:[
    phone('iphone-12','iPhone 12','apple',null,64,990000,{condition:'used',note:'Seller advertises battery health of 100% or 87%; confirm the individual unit.'}),
    phone('iphone-7-plus','iPhone 7 Plus','apple',null,128,430000,{condition:'used',note:'Seller advertises 100% battery health; confirm the individual unit.'}),
    phone('galaxy-j3-2016','Samsung Galaxy J3 (2016)','samsung',null,8,75000,{note:'Seller advertises USA 4G version, Android 5.1.1 and 4 GB RAM; exact model/RAM unresolved. Colours advertised: black, white and gold. Confirm app compatibility before buying.'})
  ]},
  {key:'mn-electronics-mw',name:'M&N Electronics MW',location:'Zomba / Limbe, Blantyre',address:'3 Miles, opposite Premier Bet, Zomba; Limbe, Blantyre',phone:'0881032504',description:'Televisions and home appliances in Zomba and Limbe. The supplied television range includes a 12-month warranty; contact the shop for model details and availability.',profile:{secondary_phone:'0993904590',website:'https://m-nelectronic.lovable.app/',warranty:'12-month warranty on the supplied television listings',specialties:'Televisions, fans, kettles, hotplates and mini cookers'},offers:[]},
  {key:'top-level-store',name:'Top Level Store',location:'Lilongwe',phone:'+265995661489',logo_file:'logo.jpg',description:'Samsung and Redmi smartphones with free delivery within Lilongwe. Contact the team to confirm your preferred model and configuration.',profile:{secondary_phone:'+265885010308',delivery:'Free delivery within Lilongwe',tagline:'Quality first. Quality always.'},offers:[]}
];
const tvRows = [
 ['solarmax',32,false,495000,'FHD'],['solarmax',32,true,585000,'QLED FHD'],['solarmax',43,false,750000,'2K'],['solarmax',43,true,975000,'2K'],['solarmax',50,true,1680000,'4K'],['solarmax',65,true,2750000,'QLED 4K'],['supersonic',50,null,1650000,'FHD'],
 ...[[32,830000],[43,1650000],[50,2250000],[55,2670000],[75,4650000]].map(([size,price])=>['hisense',size,null,price,null]),
 ['ecco',32,false,495000,null],['ecco',32,true,600000,null],['ecco',43,true,1350000,null],['ecco',50,true,1780000,null],
 ...[[32,830000],[43,1780000],[55,2400000],[60,3680000]].map(([size,price])=>['samsung',size,true,price,null])
];
shops[2].offers = tvRows.map(([brand,size,smart,price,resolution])=>({slug:`tv-${brand}-${size}-${smart===true?'smart':smart===false?'standard':'seller'}`,name:`${brand==='samsung'?'Samsung':brand.charAt(0).toUpperCase()+brand.slice(1)} ${size}-inch ${smart===true?'Smart ':''}TV`,brand,category:'Televisions',price,condition:'new',warranty_months:12,specs:{display:{size_inch:size,resolution},smart_tv:smart},note:'Exact model number unspecified; specifications are seller-advertised.'}));
const topRedmi = [
 ['redmi-a5',4,128,549000],['redmi-a5',3,64,469000],['redmi-a7-pro',4,64,510000],['redmi-a7-pro',4,128,580000],['redmi-a7',3,64,485000],['redmi-15c',4,128,590000],['redmi-15c',8,256,675000],['redmi-17',6,128,879000],
 ['redmi-note-14-4g',8,256,845000],['redmi-note-14-4g',6,128,835000],['redmi-note-14-5g',8,128,850000],['redmi-note-14-pro-plus',8,256,1380000],['redmi-note-14-pro-5g',8,256,1010000],['redmi-note-15-5g',8,256,1110000],['redmi-note-15-4g',6,128,869000],['redmi-note-15-4g',8,256,980000],['redmi-note-15-pro-5g',8,256,1389000],['redmi-note-15-pro-plus',8,256,1589000],['redmi-note-15-pro-plus',12,512,1890000]
];
const topSamsung = [
 ['galaxy-a06',4,64,479000],['galaxy-a06',4,128,569000],['galaxy-a07',4,64,549000],['galaxy-a07',4,128,625000],['galaxy-a16',4,128,650000],['galaxy-a17',4,128,749000],['galaxy-a17-4g',8,256,1049000],['galaxy-a17-5g',8,256,1139000],['galaxy-a26-5g',6,128,925000],['galaxy-a26-5g',8,256,1130000],['galaxy-a36-5g',8,128,1159000],['galaxy-a36-5g',8,256,1299000],['galaxy-a37-5g',8,128,1319000],['galaxy-a37-5g',8,256,1415000],['galaxy-a57-5g',8,256,1715000],['galaxy-s25-ultra',null,256,3599000],['galaxy-s26-ultra',null,256,4199000]
];
const displayName = slug => slug.split('-').map(word => word === 'galaxy' ? 'Samsung Galaxy' : word === 'plus' ? '+' : /^(a|s)\d+$/.test(word) ? word.toUpperCase() : /[45]g/.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase()+word.slice(1)).join(' ').replace(' +','+');
shops[3].offers=[...topRedmi.map(([slug,ram,storage,price])=>phone(slug,displayName(slug),'xiaomi',ram,storage,price,{images:['redmi-pricelist.jpg']})),...topSamsung.map(([slug,ram,storage,price])=>phone(slug,displayName(slug),'samsung',ram,storage,price,{images:['samsung-pricelist.jpg']}))];
shops[2].profile.gallery=[{url:'http://localhost:8000/uploads/mn-electronics-mw/samsung-boxes.jpg',alt:'M&N Electronics MW supplied photo of boxed Samsung televisions'}];
const innovativeSpecs = {
 'redmi-13':{battery_mah:5030}, 'redmi-15c':{battery_mah:6000,specs:{display:{size_inch:6.9}}},
 'redmi-a7':{battery_mah:5200,specs:{display:{size_inch:6.88}}}, 'redmi-a7-pro':{battery_mah:6000,specs:{display:{size_inch:6.9}}},
 'galaxy-a07':{battery_mah:5000}, 'tecno-pop-20':{battery_mah:5000,specs:{display:{size_inch:6.75}}},
 'tecno-spark-50':{battery_mah:6700,specs:{rear_camera_mp:50}}, 'itel-a200':{battery_mah:5000,os_family:'Android 15',specs:{display:{size_inch:6.75}}},
 'oscal-kido-2':{battery_mah:6600,specs:{display:{size_inch:10.1},network:'Wi-Fi',protective_case:'Anti-shock silicone'}}
};
for(const offer of shops[0].offers)Object.assign(offer,innovativeSpecs[offer.slug]??{});
