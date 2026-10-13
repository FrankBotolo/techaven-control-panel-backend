// Transcribed from user-supplied shop advertisements on 2026-10-13.
// The user confirmed 128 GB for both iPhone 15 Plus and HP ProBook, and used condition.
export const shops = {
  apple: { name: 'Apple Guy', logo_file: 'apple-guy-logo.png', phone: '0998288221', email: 'chikafutwar@gmail.com',
    location: 'Blantyre and Lilongwe', address: 'Gateway Mall, Lilongwe; Blantyre, Malawi',
    description: 'Apple Guy MW. Phone offers supplied by the user. Facebook: appleguymw.' },
  edgicate: { name: 'Edgicate Store', logo_file: 'edgicate-logo.jpg', phone: '0995986969',
    location: 'Lilongwe and Blantyre',
    address: 'Area 15, Chiwengo Road, Gate 6, opposite mHub, Lilongwe; 1st floor Priceworth Building, opposite old Metro Shop, Blantyre',
    description: 'Lilongwe: from M1 take Gogo Jenala Road, then first left into Chiwengo Road; Gate 6 on your left. Website: store.edgicate.com. Supplied posters advertise 60-day layby; contact the shop for terms.' }
};
const laptop = (sku, model, brand, ram, storage, price, cpu, size, images, extra = {}) => ({
  sku, shop: 'edgicate', model, brand, ram_gb: ram, storage_gb: storage, price,
  condition: 'used', category: 'Laptops', cpu_name: cpu,
  display: { size_inch: size }, images, ...extra
});
export const offers = [
  { sku: 'iphone-16-pro-max-256', shop: 'apple', model: 'iPhone 16 Pro Max', slug: 'iphone-16-pro-max',
    category: 'Smartphones', storage_gb: 256, price: 3600000, condition: 'used',
    images: ['iphone-16-pro-max-back.jpg', 'iphone-16-pro-max-battery.jpg'],
    image_notes: { 'iphone-16-pro-max-battery.jpg': 'Battery health 92%; 417 cycles; first use May 2025, as shown in the supplied photo.' } },
  { sku: 'iphone-15-plus-128', shop: 'apple', model: 'iPhone 15 Plus', slug: 'iphone-15-plus',
    category: 'Smartphones', storage_gb: 128, price: 2000000, condition: 'used',
    images: ['iphone-15-plus-back.jpg', 'iphone-15-plus-battery.jpg'],
    image_notes: { 'iphone-15-plus-battery.jpg': 'Battery health 83%; 949 cycles; first use July 2024, as shown in the supplied photo.' } },
  laptop('dell-precision-5550-16-512', 'Dell Precision 5550', 'dell', 16, 512, 2550000,
    'Intel Core i7-10875H', 15.6, ['dell-precision-5550-1.jpg', 'dell-precision-5550-2.jpg'],
    { gpu_name: 'NVIDIA Quadro T2000', gpu_type: 'Dedicated', claims: { cpu_cores: 8, cpu_threads: 16, cpu_clock_ghz: '2.3–5.1', gpu_memory_gb: 4 } }),
  laptop('hp-probook-x360-11-ee-g7-4-128', 'HP ProBook x360 11 EE G7', 'hp', 4, 128, 530000,
    'Intel Core m3', 11, ['hp-probook-11-1.jpg', 'hp-probook-11-2.jpg', 'hp-probook-11-3.jpg', 'hp-probook-11-4.jpg', 'hp-probook-11-5.jpg', 'hp-probook-11-6.jpg', 'hp-probook-11-poster.jpg'],
    { claims: { touchscreen: true, convertible: true, battery_life_hours: '4–6' }, wholesale_price: 490000,
      correction: 'User confirmed 128 GB, overriding the poster’s 200 GB. Retail price 530,000 confirmed from poster rather than the text typo k5300,000.' }),
  laptop('hp-elitebook-840-g8-8-256', 'HP EliteBook 840 G8', 'hp', 8, 256, 1450000,
    'Intel Core i5 11th Gen', 14.1, ['hp-elitebook-840-g8-1.jpg', 'hp-elitebook-840-g8-2.jpg', 'hp-elitebook-840-g8-3.jpg', 'hp-elitebook-840-g8-4.jpg'],
    { display: { size_inch: 14.1, panel: 'FHD' } }),
  laptop('dell-latitude-5420-8-256', 'Dell Latitude 5420', 'dell', 8, 256, 1230000,
    'Intel Core i5 11th Gen', 14, ['dell-latitude-5420-poster.jpg'],
    { display: { size_inch: 14, panel: 'FHD' }, claims: { battery_life_hours: '6–8' } }),
  laptop('dell-latitude-5410-8-256', 'Dell Latitude 5410', 'dell', 8, 256, 1050000,
    'Intel Core i5 10th Gen', 14, ['dell-latitude-5410-poster.jpg'],
    { display: { size_inch: 14, panel: 'FHD' }, claims: { battery_life_hours: '4–6' } }),
  laptop('surface-go-2-8-128', 'Microsoft Surface Go 2', 'microsoft', 8, 128, 660000,
    'Intel Core m3', 11, ['surface-go-2-poster.jpg'],
    { claims: { battery_life_hours: '4–6', touchscreen: true, convertible: true },
      note: 'Screen size and convertible wording are seller claims from the supplied poster; not independently verified.' }),
  laptop('surface-laptop-2-8-128', 'Microsoft Surface Laptop 2', 'microsoft', 8, 128, 1040000,
    'Intel Core i5 8th Gen', 13.5, ['surface-laptop-2-poster.jpg'],
    { claims: { battery_life_hours: '4–6', touchscreen: true }, note: 'Super slim, as advertised.' }),
  laptop('dell-latitude-3120-8-128', 'Dell Latitude 3120', 'dell', 8, 128, 600000,
    'Intel Pentium 10th Gen', 11, ['dell-latitude-3120-poster.jpg'],
    { storage_type: null, claims: { battery_life_hours: '4–6', touchscreen: true, convertible: true },
      note: 'Poster says storage; SSD type is unspecified.' }),
  laptop('lenovo-x1-yoga-g3-8-256', 'Lenovo ThinkPad X1 Yoga Gen 3', 'lenovo', 8, 256, 1220000,
    'Intel Core i5 8th Gen', 14, ['lenovo-x1-yoga-g3-poster.jpg'],
    { claims: { battery_life_hours: '4–6', touchscreen: true, convertible: true } })
];
