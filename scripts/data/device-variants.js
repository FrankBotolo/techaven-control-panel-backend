/**
 * Manufacturer variant matrix for the v2 catalogue (brands → devices → variants → colours).
 *
 * How variants are modelled (mirrors how retail sites such as apple.com, samsung.com and
 * GSMArena present them): one Device per marketed model, one DeviceVariant per sellable
 * memory/storage/network configuration, and colours attached per variant with the
 * manufacturer's own colour name mapped onto a shared colour family (for filtering).
 *
 * Only configurations confirmed by manufacturer or spec-database pages are `verified`.
 * Anything regional or less certain is seeded as `unverified` so admins can review it in
 * the portal before sellers rely on it. Sources were checked on 2026-11-18.
 */

/** Shared colour families used for storefront filtering. */
export const colorFamilies = {
  black: { name: 'Black', hex: '#1F1F22' },
  white: { name: 'White', hex: '#F4F4F2' },
  silver: { name: 'Silver', hex: '#D7D8DA' },
  gray: { name: 'Gray', hex: '#8A8D91' },
  blue: { name: 'Blue', hex: '#4A6FA5' },
  navy: { name: 'Navy', hex: '#1F2A44' },
  green: { name: 'Green', hex: '#7FA37A' },
  purple: { name: 'Purple', hex: '#A99AD6' },
  pink: { name: 'Pink', hex: '#F2C4CE' },
  orange: { name: 'Orange', hex: '#E5793B' },
  gold: { name: 'Gold', hex: '#E3CBA0' },
  teal: { name: 'Teal', hex: '#7FB7B2' }
};

const c = (manufacturer_name, family, hex) => ({ manufacturer_name, family, hex });

const iphone17ProColors = [c('Silver', 'silver', '#E3E4E5'), c('Cosmic Orange', 'orange', '#F07A30'), c('Deep Blue', 'navy', '#2E3A55')];
const macAirColors = [c('Sky Blue', 'blue', '#C9D8E4'), c('Silver', 'silver', '#E3E4E5'), c('Starlight', 'gold', '#F0E4D3'), c('Midnight', 'navy', '#2E3642')];

/**
 * Each device lists its configurations as [ram_gb, storage_gb] pairs plus shared
 * network/region and the colours available on every configuration.
 * `unverified` lists [ram, storage] pairs that should be reviewed before use.
 */
export const catalogue = [
  {
    brand: 'Apple', category: 'Smartphones', name: 'iPhone 17', slug: 'iphone-17', release_date: '2025-09-19',
    soc: 'Apple A19', os_family: 'iOS', network_generation: '5G', sim_type: 'Nano-SIM + eSIM',
    configs: [[8, 256], [8, 512]],
    colors: [c('Black', 'black', '#2B2B2D'), c('White', 'white', '#F5F5F0'), c('Mist Blue', 'blue', '#AFC3D6'), c('Sage', 'green', '#B7C3A5'), c('Lavender', 'purple', '#D6CDE6')],
    sources: ['https://www.apple.com/iphone-17/specs/', 'https://www.macrumors.com/2025/09/09/iphone-17-lineup-starts-256gb-storage/']
  },
  {
    brand: 'Apple', category: 'Smartphones', name: 'iPhone Air', slug: 'iphone-air', release_date: '2025-09-19',
    soc: 'Apple A19 Pro', os_family: 'iOS', network_generation: '5G', sim_type: 'eSIM only',
    configs: [[12, 256], [12, 512], [12, 1024]],
    colors: [c('Space Black', 'black', '#1E1E20'), c('Cloud White', 'white', '#F3F3EF'), c('Light Gold', 'gold', '#EAD9B8'), c('Sky Blue', 'blue', '#C6D9EA')],
    sources: ['https://www.apple.com/iphone-air/specs/']
  },
  {
    brand: 'Apple', category: 'Smartphones', name: 'iPhone 17 Pro', slug: 'iphone-17-pro', release_date: '2025-09-19',
    soc: 'Apple A19 Pro', os_family: 'iOS', network_generation: '5G', sim_type: 'Nano-SIM + eSIM',
    configs: [[12, 256], [12, 512], [12, 1024]], colors: iphone17ProColors,
    sources: ['https://www.apple.com/iphone-17-pro/specs/']
  },
  {
    brand: 'Apple', category: 'Smartphones', name: 'iPhone 17 Pro Max', slug: 'iphone-17-pro-max', release_date: '2025-09-19',
    soc: 'Apple A19 Pro', os_family: 'iOS', network_generation: '5G', sim_type: 'Nano-SIM + eSIM',
    configs: [[12, 256], [12, 512], [12, 1024], [12, 2048]], colors: iphone17ProColors,
    sources: ['https://everymac.com/systems/apple/iphone/specs/apple-iphone-17-pro-max-global-a3526-specs.html', 'https://m.gsmarena.com/apple_iphone_17_pro_max-13964.php']
  },
  {
    brand: 'Apple', category: 'Smartphones', name: 'iPhone 16', slug: 'iphone-16', release_date: '2024-09-20',
    soc: 'Apple A18', os_family: 'iOS', network_generation: '5G', sim_type: 'Nano-SIM + eSIM',
    configs: [[8, 128], [8, 256], [8, 512]],
    colors: [c('Black', 'black', '#2B2B2D'), c('White', 'white', '#F5F5F0'), c('Pink', 'pink', '#F3C6D4'), c('Teal', 'teal', '#A6CFC9'), c('Ultramarine', 'blue', '#7C8CF0')],
    sources: ['https://support.apple.com/en-us/121029']
  },
  {
    brand: 'Samsung', category: 'Smartphones', name: 'Galaxy S25', slug: 'samsung-galaxy-s25', release_date: '2025-02-07',
    soc: 'Snapdragon 8 Elite for Galaxy', os_family: 'Android', network_generation: '5G', sim_type: 'Nano-SIM + eSIM',
    configs: [[12, 128], [12, 256], [12, 512]],
    colors: [c('Icyblue', 'blue', '#BFD3E6'), c('Navy', 'navy', '#28324A'), c('Mint', 'green', '#CFE5D6'), c('Silver Shadow', 'silver', '#C9CACC')],
    sources: ['https://www.engadget.com/mobile/smartphones/heres-how-samsungs-new-galaxy-s25-phones-compare-to-each-other-180032319.html']
  },
  {
    brand: 'Samsung', category: 'Smartphones', name: 'Galaxy S25 Ultra', slug: 'samsung-galaxy-s25-ultra', release_date: '2025-02-07',
    soc: 'Snapdragon 8 Elite for Galaxy', os_family: 'Android', network_generation: '5G', sim_type: 'Nano-SIM + eSIM',
    configs: [[12, 256], [12, 512], [12, 1024]],
    colors: [c('Titanium Silverblue', 'blue', '#AEB9C7'), c('Titanium Whitesilver', 'silver', '#E2E2E0'), c('Titanium Gray', 'gray', '#8C8F93'), c('Titanium Black', 'black', '#2A2A2C')],
    sources: ['https://www.notebookcheck.net/Galaxy-S25-Ultra-official-with-marginally-better-cameras-Titanium-chassis-and-a-downgraded-S-Pen.950869.0.html', 'https://www.droid-life.com/2025/01/22/official-galaxy-s25-ultra-specs/']
  },
  {
    brand: 'Samsung', category: 'Smartphones', name: 'Galaxy A56 5G', slug: 'samsung-galaxy-a56-5g', release_date: '2025-03-02',
    soc: 'Exynos 1580', os_family: 'Android', network_generation: '5G', sim_type: 'Dual Nano-SIM',
    configs: [[8, 128], [8, 256], [12, 256]], unverified: [[12, 256]],
    colors: [c('Awesome Graphite', 'black', '#3A3B3D'), c('Awesome Lightgray', 'silver', '#D5D6D8'), c('Awesome Olive', 'green', '#9DA88A'), c('Awesome Pink', 'pink', '#EBC7CF')],
    sources: ['https://www.samsung.com/global/galaxy/galaxy-a56-5g/specs/']
  },
  {
    brand: 'Google', category: 'Smartphones', name: 'Pixel 10', slug: 'google-pixel-10', release_date: '2025-08-28',
    soc: 'Google Tensor G5', os_family: 'Android', network_generation: '5G', sim_type: 'Nano-SIM + eSIM',
    configs: [[12, 128], [12, 256]],
    colors: [c('Obsidian', 'black', '#232427'), c('Frost', 'blue', '#D7E3EE'), c('Indigo', 'purple', '#5B5FA8'), c('Lemongrass', 'green', '#DDE59A')],
    sources: ['https://store.google.com/product/pixel_10_specs']
  },
  {
    brand: 'Google', category: 'Smartphones', name: 'Pixel 10 Pro', slug: 'google-pixel-10-pro', release_date: '2025-08-28',
    soc: 'Google Tensor G5', os_family: 'Android', network_generation: '5G', sim_type: 'Nano-SIM + eSIM',
    configs: [[16, 128], [16, 256], [16, 512], [16, 1024]],
    colors: [c('Obsidian', 'black', '#232427'), c('Porcelain', 'white', '#EFEAE2'), c('Moonstone', 'gray', '#8E98A3'), c('Jade', 'green', '#BFD8C4')],
    sources: ['https://store.google.com/product/pixel_10_pro_specs']
  },
  {
    brand: 'Xiaomi', category: 'Smartphones', name: 'Redmi Note 14 Pro 5G', slug: 'xiaomi-redmi-note-14-pro-5g', release_date: '2025-01-10',
    soc: 'MediaTek Dimensity 7300-Ultra', os_family: 'Android', network_generation: '5G', sim_type: 'Dual Nano-SIM',
    configs: [[8, 256], [12, 512]], unverified: [[12, 512]],
    colors: [c('Midnight Black', 'black', '#232325'), c('Coral Green', 'green', '#9FC7B4'), c('Lavender Purple', 'purple', '#C4B6E0')],
    sources: ['https://www.mi.com/sa-en/product/redmi-note-14-pro-5g/specs/', 'https://www.yugatech.com/news/redmi-note-14-pro-5g-pro-5g-4g-variants-go-global/']
  },
  {
    brand: 'Tecno', category: 'Smartphones', name: 'Spark 40 Pro', slug: 'tecno-spark-40-pro', release_date: '2025-07-01',
    soc: 'MediaTek Helio G100 Ultimate', os_family: 'Android', network_generation: '4G', sim_type: 'Dual Nano-SIM',
    configs: [[8, 128], [8, 256]],
    colors: [c('Ink Black', 'black', '#1E2024'), c('Moon Titanium', 'silver', '#C8C6C1'), c('Lake Blue', 'blue', '#6E9FC4'), c('Bamboo Green', 'green', '#8FAE8B')],
    sources: ['https://m.gsmarena.com/tecno_spark_40_pro-13985.php']
  },
  {
    brand: 'Apple', category: 'Laptops', name: 'MacBook Air 13-inch (M4)', slug: 'macbook-air-13-m4', release_date: '2025-03-12',
    soc: 'Apple M4', os_family: 'macOS', network_generation: null, sim_type: null,
    configs: [[16, 256], [16, 512], [24, 512]], colors: macAirColors,
    sources: ['https://www.apple.com/macbook-air/specs/']
  },
  {
    brand: 'Apple', category: 'Laptops', name: 'MacBook Pro 14-inch (M5)', slug: 'macbook-pro-14-m5', release_date: '2025-10-22',
    soc: 'Apple M5', os_family: 'macOS', network_generation: null, sim_type: null,
    configs: [[16, 512], [16, 1024], [24, 1024]],
    colors: [c('Space Black', 'black', '#2C2C2E'), c('Silver', 'silver', '#E3E4E5')],
    sources: ['https://www.apple.com/macbook-pro/specs/']
  }
];
