/**
 * Tech Haven shop smartphone catalog for DB seeding.
 * Prices are illustrative Malawi retail (MWK); adjust to match your stock.
 *
 * Primary images: phonesdata.com/files/models/… (same host linked from catalog PDFs).
 * Xiaomi Redmi 13: PhonesData has no product photo yet — Cloudinary fallback.
 */
const REDMI_13_IMAGE_FALLBACK =
  'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773906889/techaven/products/laa7p73dfobk2zsduwn0.jpg';

function pts(price) {
  return Math.max(1, Math.floor(Number(price) / 10000));
}

/** Smartphone rows for Product seeding (prices in MWK). */
export function buildTechavenSmartphoneRows({ vendorName = 'Tech Haven Electronics' } = {}) {
  const rows = [
    {
      name: 'Samsung Galaxy A05',
      description: '6.5" PLS LCD entry smartphone — dual SIM, large battery for everyday use.',
      price: 168500,
      original_price: 185000,
      discount: 9,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A05-825.jpg',
      stock: 18,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.5" PLS LCD, HD+',
        chipset: 'MediaTek Helio G85',
        ram_storage: '4GB / 64GB',
        main_camera: '50 MP + 2 MP depth',
        battery: '5000 mAh',
        os: 'Android 14 (One UI Core)'
      }
    },
    {
      name: 'Samsung Galaxy A05s',
      description: '6.7" display with 90 Hz refresh — smooth scrolling and solid battery life.',
      price: 198900,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A05s-167.jpg',
      stock: 14,
      is_featured: false,
      is_hot: false,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.7" PLS LCD, FHD+, 90 Hz',
        chipset: 'Snapdragon 680',
        ram_storage: '4GB / 64GB (expandable)',
        main_camera: '50 MP + 2 MP macro + 2 MP depth',
        battery: '5000 mAh, 25W charging',
        os: 'Android 14'
      }
    },
    {
      name: 'Samsung Galaxy A15',
      description: 'Super AMOLED 6.5" — better contrast and colors in direct sunlight.',
      price: 252000,
      original_price: 279000,
      discount: 10,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A15-1.jpg',
      stock: 22,
      is_featured: true,
      is_hot: false,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.5" Super AMOLED, FHD+, 90 Hz',
        chipset: 'MediaTek Helio G99',
        ram_storage: '6GB / 128GB',
        main_camera: '50 MP + 5 MP ultra-wide + 2 MP macro',
        battery: '5000 mAh',
        os: 'Android 14 (One UI 6)'
      }
    },
    {
      name: 'Samsung Galaxy A25 5G',
      description: '5G-ready A-series with vivid AMOLED and OIS main camera.',
      price: 389500,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A25-1.jpg',
      stock: 12,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.5" Super AMOLED, 120 Hz',
        chipset: 'Exynos 1280 (5G)',
        ram_storage: '6GB / 128GB',
        main_camera: '50 MP OIS + 8 MP ultra-wide + 2 MP macro',
        battery: '5000 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Samsung Galaxy A35 5G',
      description: 'Glass back design with improved durability (IP67) and 5G.',
      price: 495000,
      original_price: 530000,
      discount: 7,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A35-1.jpg',
      stock: 10,
      is_featured: false,
      is_hot: false,
      is_special: true,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.6" Super AMOLED, FHD+, 120 Hz',
        chipset: 'Exynos 1380',
        ram_storage: '8GB / 128GB',
        main_camera: '50 MP OIS + 8 MP ultra-wide + 5 MP macro',
        battery: '5000 mAh',
        os: 'Android 14 (One UI 6.1)'
      }
    },
    {
      name: 'Samsung Galaxy A55 5G',
      description: 'Premium mid-range with metal frame and flagship camera tuning.',
      price: 729900,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A55-1.jpg',
      stock: 8,
      is_featured: true,
      is_hot: false,
      is_special: true,
      is_new_arrival: true,
      vendor: vendorName,
      specifications: {
        display: '6.6" Super AMOLED, 120 Hz',
        chipset: 'Exynos 1480',
        ram_storage: '8GB / 256GB',
        main_camera: '50 MP OIS + 12 MP ultra-wide + 5 MP macro',
        battery: '5000 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Samsung Galaxy M34 5G',
      description: 'Massive 6000 mAh battery — built for two-day usage.',
      price: 418000,
      original_price: 448000,
      discount: 7,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-M34-5G-769.jpg',
      stock: 9,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.5" Super AMOLED, 120 Hz',
        chipset: 'Exynos 1280',
        ram_storage: '8GB / 128GB',
        main_camera: '50 MP + 8 MP ultra-wide + 2 MP macro',
        battery: '6000 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Samsung Galaxy S23 FE',
      description: 'Flagship experience — versatile triple camera and long software support.',
      price: 1499000,
      original_price: 1690000,
      discount: 11,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S23-FE-646.jpg',
      stock: 5,
      is_featured: true,
      is_hot: false,
      is_special: true,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.4" Dynamic AMOLED 2X, 120 Hz',
        chipset: 'Snapdragon 8 Gen 1 (for Galaxy)',
        ram_storage: '8GB / 256GB',
        main_camera: '50 MP + 12 MP ultra-wide + 8 MP tele 3x',
        battery: '4500 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Samsung Galaxy S24',
      description: 'Compact flagship with bright LTPO display and AI-assisted features.',
      price: 2189000,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S24-1.jpg',
      stock: 4,
      is_featured: false,
      is_hot: false,
      is_special: true,
      is_new_arrival: true,
      vendor: vendorName,
      specifications: {
        display: '6.2" Dynamic AMOLED 2X LTPO, 1–120 Hz',
        chipset: 'Snapdragon 8 Gen 3 (region dependent)',
        ram_storage: '8GB / 256GB',
        main_camera: '50 MP OIS + 12 MP ultra-wide + 10 MP tele 3x',
        battery: '4000 mAh',
        os: 'Android 14 (One UI 6.1)'
      }
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Ultimate Galaxy — S Pen, 200 MP camera, and titanium frame.',
      price: 3949000,
      original_price: 4250000,
      discount: 7,
      image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S24-Ultra-1.jpg',
      stock: 3,
      is_featured: true,
      is_hot: true,
      is_special: true,
      is_new_arrival: true,
      vendor: vendorName,
      specifications: {
        display: '6.8" Dynamic AMOLED 2X LTPO',
        chipset: 'Snapdragon 8 Gen 3 for Galaxy',
        ram_storage: '12GB / 512GB',
        main_camera: '200 MP + 50 MP periscope + 10 MP tele + 12 MP ultra-wide',
        battery: '5000 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Xiaomi Redmi A3',
      description: 'Large display budget phone — dual SIM and clean MIUI experience.',
      price: 158500,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-A3-1.jpg',
      stock: 25,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.71" HD+ LCD, 90 Hz',
        chipset: 'MediaTek Helio G36',
        ram_storage: '3GB / 64GB',
        main_camera: '8 MP + auxiliary depth',
        battery: '5000 mAh',
        os: 'Android 14 (Go / MIUI)'
      }
    },
    {
      name: 'Xiaomi Redmi 13',
      description: '108 MP main camera on a mid-tier body — great value.',
      price: 285000,
      original_price: 312000,
      discount: 9,
      image: REDMI_13_IMAGE_FALLBACK,
      stock: 16,
      is_featured: true,
      is_hot: false,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.79" LCD, FHD+, 90 Hz',
        chipset: 'MediaTek Helio G91-Ultra',
        ram_storage: '6GB / 128GB',
        main_camera: '108 MP + 2 MP macro',
        battery: '5030 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Xiaomi Redmi 13C',
      description: 'Affordable daily driver with big battery.',
      price: 176900,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-13C-4G-1.jpg',
      stock: 20,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.74" HD+ LCD, 90 Hz',
        chipset: 'MediaTek Helio G85',
        ram_storage: '4GB / 128GB',
        main_camera: '50 MP + 2 MP macro',
        battery: '5000 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Xiaomi Redmi Note 13',
      description: 'Note line refresh with AMOLED and thin bezels.',
      price: 429900,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-4G-1.jpg',
      stock: 11,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.67" AMOLED, 120 Hz',
        chipset: 'Snapdragon 685',
        ram_storage: '6GB / 128GB',
        main_camera: '108 MP + 8 MP ultra-wide + 2 MP macro',
        battery: '5000 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Xiaomi Redmi Note 13 Pro',
      description: '200 MP sensor and 67W fast charging in the Note series.',
      price: 595000,
      original_price: 649000,
      discount: 8,
      image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-Pro-973.jpg',
      stock: 10,
      is_featured: true,
      is_hot: false,
      is_special: true,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.67" AMOLED, 120 Hz',
        chipset: 'Snapdragon 7s Gen 2',
        ram_storage: '8GB / 256GB',
        main_camera: '200 MP OIS + 8 MP ultra-wide + 2 MP macro',
        battery: '5100 mAh, 67W',
        os: 'Android 14'
      }
    },
    {
      name: 'Xiaomi Redmi Note 13 Pro+ 5G',
      description: 'Curved AMOLED, IP68, and 120W charging — flagship Note.',
      price: 898000,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-Pro+-643.jpg',
      stock: 6,
      is_featured: false,
      is_hot: false,
      is_special: true,
      is_new_arrival: true,
      vendor: vendorName,
      specifications: {
        display: '6.67" curved AMOLED, 120 Hz',
        chipset: 'MediaTek Dimensity 7200-Ultra',
        ram_storage: '8GB / 256GB',
        main_camera: '200 MP OIS + 8 MP ultra-wide + 2 MP macro',
        battery: '5000 mAh, 120W',
        os: 'Android 14'
      }
    },
    {
      name: 'POCO M6 Pro',
      description: 'Performance-focused mid-range with strong GPU for gaming.',
      price: 525000,
      original_price: 565000,
      discount: 7,
      image: 'https://phonesdata.com/files/models/Xiaomi-Poco-M6-Pro-4G-1.jpg',
      stock: 9,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.67" AMOLED, 120 Hz',
        chipset: 'MediaTek Helio G99-Ultra',
        ram_storage: '8GB / 256GB',
        main_camera: '64 MP OIS + 8 MP ultra-wide + 2 MP macro',
        battery: '5000 mAh, 67W',
        os: 'Android 14'
      }
    },
    {
      name: 'POCO X6 Pro',
      description: 'Dimensity 8300-Ultra and flagship-grade display at aggressive price.',
      price: 1189000,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Xiaomi-Poco-X6-Pro-1.jpg',
      stock: 7,
      is_featured: true,
      is_hot: true,
      is_special: true,
      is_new_arrival: true,
      vendor: vendorName,
      specifications: {
        display: '6.67" AMOLED, 1.48T brightness peak, 120 Hz',
        chipset: 'MediaTek Dimensity 8300-Ultra',
        ram_storage: '12GB / 512GB',
        main_camera: '64 MP OIS + 8 MP ultra-wide + 2 MP macro',
        battery: '5000 mAh, 67W',
        os: 'Android 14'
      }
    },
    {
      name: 'Xiaomi 14',
      description: 'Leica-tuned compact flagship — excellent night photography.',
      price: 2679000,
      original_price: 2899000,
      discount: 8,
      image: 'https://phonesdata.com/files/models/Xiaomi-14-1.jpg',
      stock: 4,
      is_featured: true,
      is_hot: false,
      is_special: true,
      is_new_arrival: true,
      vendor: vendorName,
      specifications: {
        display: '6.36" LTPO AMOLED, 120 Hz',
        chipset: 'Snapdragon 8 Gen 3',
        ram_storage: '12GB / 512GB',
        main_camera: 'Leica triple: 50 MP + 50 MP ultra-wide + 50 MP tele',
        battery: '4610 mAh, 90W wired / 50W wireless',
        os: 'Android 14'
      }
    },
    {
      name: 'Oppo A18',
      description: 'Stereo-like loudspeaker experience and large battery.',
      price: 172500,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Oppo-A18-234.jpg',
      stock: 17,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.56" LCD, HD+, 90 Hz',
        chipset: 'MediaTek Helio G85',
        ram_storage: '4GB / 64GB',
        main_camera: '8 MP + 2 MP depth',
        battery: '5000 mAh',
        os: 'Android 13 (ColorOS)'
      }
    },
    {
      name: 'Oppo A38',
      description: 'Reliable family phone with 50 MP main sensor.',
      price: 268000,
      original_price: 295000,
      discount: 9,
      image: 'https://phonesdata.com/files/models/Oppo-A38-474.jpg',
      stock: 14,
      is_featured: false,
      is_hot: false,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.56" LCD, HD+, 90 Hz',
        chipset: 'MediaTek Helio G85',
        ram_storage: '4GB / 128GB',
        main_camera: '50 MP + 2 MP depth',
        battery: '5000 mAh',
        os: 'Android 13'
      }
    },
    {
      name: 'Oppo A58',
      description: 'FHD+ display upgrade in the A-series.',
      price: 352000,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Oppo-A58-4G-364.jpg',
      stock: 11,
      is_featured: false,
      is_hot: true,
      is_special: false,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.72" LCD, FHD+, 90 Hz',
        chipset: 'MediaTek Helio G85',
        ram_storage: '6GB / 128GB',
        main_camera: '50 MP + 2 MP mono',
        battery: '5000 mAh, 33W',
        os: 'Android 13'
      }
    },
    {
      name: 'Oppo A78',
      description: '67W charging and AMOLED in a slim chassis.',
      price: 529000,
      original_price: 575000,
      discount: 8,
      image: 'https://phonesdata.com/files/models/Oppo-A78-4G-858.jpg',
      stock: 8,
      is_featured: true,
      is_hot: false,
      is_special: true,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.43" AMOLED, FHD+, 90 Hz',
        chipset: 'Snapdragon 680',
        ram_storage: '8GB / 256GB',
        main_camera: '50 MP + 2 MP',
        battery: '5000 mAh, 67W',
        os: 'Android 13'
      }
    },
    {
      name: 'Oppo Reno 10 5G',
      description: 'Portrait-focused mid-range with telephoto lens.',
      price: 789000,
      original_price: null,
      discount: null,
      image: 'https://phonesdata.com/files/models/Oppo-Reno10-265.jpg',
      stock: 6,
      is_featured: false,
      is_hot: true,
      is_special: true,
      is_new_arrival: false,
      vendor: vendorName,
      specifications: {
        display: '6.7" AMOLED, 120 Hz',
        chipset: 'MediaTek Dimensity 7050',
        ram_storage: '8GB / 256GB',
        main_camera: '64 MP + 32 MP tele portrait + 8 MP ultra-wide',
        battery: '5000 mAh, 67W',
        os: 'Android 13'
      }
    },
    {
      name: 'Oppo Reno 11 5G',
      description: 'Refined Reno design with improved low-light portraits.',
      price: 935000,
      original_price: 999000,
      discount: 6,
      image: 'https://phonesdata.com/files/models/Oppo-Reno11-1.jpg',
      stock: 5,
      is_featured: true,
      is_hot: false,
      is_special: true,
      is_new_arrival: true,
      vendor: vendorName,
      specifications: {
        display: '6.7" AMOLED, 120 Hz',
        chipset: 'MediaTek Dimensity 7050 / 8200 (region)',
        ram_storage: '8GB / 256GB',
        main_camera: '50 MP LYT main + 32 MP tele + 8 MP ultra-wide',
        battery: '4800–5000 mAh',
        os: 'Android 14'
      }
    },
    {
      name: 'Oppo Find X7',
      description: 'Ultra-premium camera flagship — Hasselblad color science (series).',
      price: 2989000,
      original_price: 3250000,
      discount: 8,
      image: 'https://phonesdata.com/files/models/Oppo-Find-X7-1.jpg',
      stock: 3,
      is_featured: true,
      is_hot: true,
      is_special: true,
      is_new_arrival: true,
      vendor: vendorName,
      specifications: {
        display: '6.78" LTPO AMOLED, ProXDR',
        chipset: 'MediaTek Dimensity 9300',
        ram_storage: '16GB / 512GB',
        main_camera: 'Triple 50 MP flagship array (periscope on variant)',
        battery: '5000 mAh, 100W',
        os: 'Android 14'
      }
    }
  ];

  return rows.map((r) => ({
    ...r,
    points: pts(r.price)
  }));
}
