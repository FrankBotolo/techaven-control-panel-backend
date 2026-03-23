/**
 * Normalizes product variants for API responses (GET /products, etc.)
 */
export function normalizeVariants(raw) {
  if (raw == null) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];

  return arr.map((v, i) => {
    const group = {
      id: v.id != null ? Number(v.id) : i + 1,
      type: String(v.type ?? 'option'),
      name: String(v.name ?? ''),
      options: []
    };
    if (Array.isArray(v.options)) {
      group.options = v.options.map((opt) => {
        const o = {
          value: String(opt.value ?? ''),
          label: String(opt.label ?? ''),
          price_modifier: opt.price_modifier != null ? Number(opt.price_modifier) : 0,
          stock: opt.stock != null ? Number(opt.stock) : 0
        };
        if (opt.image != null && opt.image !== '') {
          o.image = String(opt.image);
        }
        return o;
      });
    }
    return group;
  });
}

/**
 * Parses variants from seller create/update body (JSON array or string)
 */
export function parseVariantsInput(variants) {
  if (variants == null) return null;
  let arr = variants;
  if (typeof variants === 'string') {
    try {
      arr = JSON.parse(variants);
    } catch {
      throw new Error('Invalid variants JSON');
    }
  }
  if (!Array.isArray(arr)) {
    throw new Error('variants must be an array');
  }
  const normalized = normalizeVariants(arr);
  return normalized.length ? normalized : [];
}

/**
 * Public storefront product shape (Flutter / mobile)
 */
export function toProductDto(p) {
  const plain = p?.get ? p.get({ plain: true }) : p;
  const createdAt = plain.createdAt || plain.created_at;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const derivedNewArrival = createdAt ? new Date(createdAt) >= thirtyDaysAgo : false;

  const price = parseFloat(plain.price);
  const originalPrice = plain.original_price != null ? parseFloat(plain.original_price) : null;

  let discountPct;
  if (originalPrice != null) {
    discountPct =
      plain.discount != null
        ? Number(plain.discount)
        : Math.round((1 - price / originalPrice) * 100);
  } else {
    discountPct = plain.discount != null ? Number(plain.discount) : 0;
  }

  const images = Array.isArray(plain.images)
    ? plain.images
    : plain.image
      ? [plain.image]
      : [];

  const isNewArrival =
    plain.is_new_arrival != null ? !!plain.is_new_arrival : derivedNewArrival;

  return {
    id: plain.id,
    name: plain.name,
    description: plain.description,
    price,
    original_price: originalPrice,
    discount_percentage: discountPct,
    currency: 'MWK',
    images,
    rating: parseFloat(plain.rating) || 0,
    total_reviews: plain.total_reviews || 0,
    stock: plain.stock || 0,
    is_featured: !!plain.is_featured,
    is_new_arrival: isNewArrival,
    is_hot_sale: !!plain.is_hot,
    is_special_offer: !!plain.is_special,
    category_id: plain.category_id,
    category_name: plain.category?.name || null,
    shop_id: plain.shop_id,
    shop_name: plain.shop?.name || null,
    vendor_name: plain.vendor || plain.shop?.name || null,
    variants: normalizeVariants(plain.variants),
    created_at: createdAt
  };
}
