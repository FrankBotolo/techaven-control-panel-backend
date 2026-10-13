const phone = (slug, storage, price, image, condition = 'new', extra = {}) => ({
  slug, name: slug.replace(/-/g, ' ').replace('iphone', 'iPhone'), category: 'Smartphones', brand: 'apple',
  storage_gb: storage, price, condition, images: [image], ...extra
});
const laptop = (slug, name, brand, cpu, ram, storage, price, images, extra = {}) => ({
  slug, name, category: 'Laptops', brand, cpu, ram_gb: ram, storage_gb: storage,
  price, condition: 'new', images, ...extra
});
export const appleAllShop = { name: 'Apple & All', location: 'Lilongwe',
  address: 'Lilongwe City Centre, Gravity Mall, Room 22', phone: '0880005500',
  description: 'Discover Digital Elegance. Additional contact: 0887007700. Offers transcribed from supplied shop advertisements.', logo_file: 'logo.png' };
export const appleAllOffers = [
  laptop('laptop-hp-omnibook-x-flip-ultra-5', 'HP OmniBook X Flip (Core Ultra 5)', 'hp', 'Intel Core Ultra 5', 16, 512, 4250000, ['hp-omnibook-boxes.png'], { specs: { display: { size_inch: 14 }, storage_type: 'SSD' } }),
  laptop('laptop-macbook-pro-16-m5-seller', 'MacBook Pro 16-inch (M5, seller-advertised)', 'apple', 'Apple M5 (seller-advertised)', 24, 1024, 15500000, ['macbook-boxes.png'],
    { specs: { display: { size_inch: 16 }, storage_type: 'SSD', description: 'Seller-advertised M5 configuration. Exact chip/model verification is outstanding; specifications and price retained as supplied.' }, unresolved: 'Apple lists 16-inch M5 Pro/M5 Max, not base M5; user confirmed the advertisement as supplied.' }),
  laptop('laptop-macbook-pro-16-m5-max-seller', 'MacBook Pro 16-inch (M5 Max, seller-advertised)', 'apple', 'Apple M5 Max (seller-advertised)', 32, 2048, 22500000, ['macbook-boxes.png'],
    { specs: { display: { size_inch: 16 }, storage_type: 'SSD', description: 'Seller-advertised 32 GB M5 Max configuration. Memory/model verification is outstanding; specifications and price retained as supplied.' }, unresolved: 'Manufacturer lists M5 Max memory starting at 36 GB; user confirmed supplied 32 GB. Not corrected silently.' }),
  laptop('laptop-lenovo-thinkpad-x250', 'Lenovo ThinkPad X250', 'lenovo', 'Intel Core i5 5th Gen', 8, 500, 700000, [], { specs: { description: '500 GB storage, type unspecified in supplied advertisement.' } }),
  phone('iphone-13-pro-max', 256, 1700000, 'iphone-13-pro-max-back.png', 'used', { battery_health_percent: 77 }),
  phone('iphone-14-pro', 256, 2950000, 'iphone-14-pro-poster.jpg'),
  phone('iphone-15', 128, 3500000, 'iphone-15-poster.jpg'),
  phone('iphone-15-pro-max', 256, 4200000, 'iphone-15-pro-max-poster.jpg'),
  phone('iphone-16-pro-max', 256, 5300000, 'iphone-16-pro-max-poster.jpg', 'new', { correction: 'User confirmed MWK 5,300,000 for malformed poster price 5,300,00.' }),
  phone('iphone-17', 256, 4850000, 'iphone-17-poster.jpg'),
  phone('iphone-17-pro', 256, 5800000, 'iphone-17-pro-poster.jpg'),
  { slug: 'apple-watch-se-2', name: 'Apple Watch SE (2nd generation)', brand: 'apple', category: 'Wearables', price: 1580000, condition: 'new', images: ['watch-boxes.png'],
    specs: { description: 'Case size and connectivity are not confirmed. Contact the shop for the exact configuration.' }, unresolved: 'Supplied 46 mm conflicts with manufacturer 40/44 mm; user does not know the size, so it remains unspecified.' },
  { slug: 'apple-watch-series-10-46mm', name: 'Apple Watch Series 10 (46 mm)', brand: 'apple', category: 'Wearables', price: 1950000, condition: 'new', images: ['watch-boxes.png'], specs: { case_size_mm: 46 } },
  { slug: 'apple-watch-series-11-46mm', name: 'Apple Watch Series 11 (46 mm)', brand: 'apple', category: 'Wearables', price: 2250000, condition: 'new', images: ['watch-boxes.png'], specs: { case_size_mm: 46 } },
  { slug: 'airpods-4', name: 'AirPods 4', brand: 'apple', category: 'Audio', price: 1150000, condition: 'new', images: ['airpods-boxes.png'], specs: { active_noise_cancellation: false } },
  { slug: 'airpods-4-anc', name: 'AirPods 4 with Active Noise Cancellation', brand: 'apple', category: 'Audio', price: 1250000, condition: 'new', images: ['airpods-boxes.png'], specs: { active_noise_cancellation: true } },
  { slug: 'airpods-pro-3', name: 'AirPods Pro 3', brand: 'apple', category: 'Audio', price: 1400000, condition: 'new', images: ['airpods-boxes.png'], specs: { active_noise_cancellation: true } }
];
