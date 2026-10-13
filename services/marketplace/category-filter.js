import { Op, literal } from 'sequelize';

// Device categories describe the product; Loans describes a seller's offer.
export function marketplaceCategoryFilter(category) {
  if (!category) return { deviceWhere: {}, listingWhere: {} };
  if (category.name !== 'Loans') return { deviceWhere: { category_id: category.id }, listingWhere: {} };
  const id = Number(category.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid category ID');
  return { deviceWhere: {}, listingWhere: { id: { [Op.in]: literal(`(SELECT listing_id FROM seller_listing_categories WHERE category_id = ${id})`) } } };
}
