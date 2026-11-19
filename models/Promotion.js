import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import {
  PLACEMENTS,
  LAYOUTS,
  PRESENTATIONS,
  IMAGE_POSITIONS,
  THEMES,
  TARGET_TYPES,
  STATUSES
} from '../utils/promotion.js';

/**
 * Scheduled merchandising content (heroes, banners, rails, coupons, announcements…)
 * for storefront placements. Ported from the Techaven Promotions CMS.
 * Attributes are camelCase (matching the CMS/API contract); columns are snake_case.
 */
const str = (len, field) => ({ type: DataTypes.STRING(len), allowNull: true, field });
const text = (field) => ({ type: DataTypes.TEXT, allowNull: true, field });

const Promotion = sequelize.define('Promotion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  internalName: { type: DataTypes.STRING(120), allowNull: false, field: 'internal_name' },
  slug: { type: DataTypes.STRING(191), allowNull: false, unique: true },
  status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: 'draft' },
  publishedAt: { type: DataTypes.DATE, allowNull: true, field: 'published_at' },

  headline: { type: DataTypes.STRING(180), allowNull: false },
  subheadline: str(240, 'subheadline'),
  body: text('body'),
  eyebrow: str(80, 'eyebrow'),
  badge: str(80, 'badge'),
  finePrint: text('fine_print'),
  campaignIntro: text('campaign_intro'),

  placement: { type: DataTypes.ENUM(...PLACEMENTS), allowNull: false },
  layout: { type: DataTypes.ENUM(...LAYOUTS), allowNull: false },
  presentation: { type: DataTypes.ENUM(...PRESENTATIONS), allowNull: false, defaultValue: 'standard' },
  slotGroup: str(120, 'slot_group'),
  groupOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'group_order' },
  imagePosition: {
    type: DataTypes.ENUM(...IMAGE_POSITIONS),
    allowNull: false,
    defaultValue: 'right',
    field: 'image_position'
  },
  theme: { type: DataTypes.ENUM(...THEMES), allowNull: false },

  // Artwork (URLs: uploads/… or absolute https)
  desktopBackgroundUrl: text('desktop_background_url'),
  desktopBackgroundAlt: str(240, 'desktop_background_alt'),
  mobileBackgroundUrl: text('mobile_background_url'),
  mobileBackgroundAlt: str(240, 'mobile_background_alt'),
  foregroundImageUrl: text('foreground_image_url'),
  foregroundImageAlt: str(240, 'foreground_image_alt'),
  seoImageUrl: text('seo_image_url'),
  seoImageAlt: str(240, 'seo_image_alt'),
  altTextOverride: str(240, 'alt_text_override'),

  // Countdown / coupon
  showCountdown: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'show_countdown' },
  couponCode: str(80, 'coupon_code'),
  instructionOne: str(180, 'instruction_one'),
  instructionTwo: str(180, 'instruction_two'),
  instructionThree: str(180, 'instruction_three'),

  // Primary CTA
  ctaLabel: str(80, 'cta_label'),
  targetType: { type: DataTypes.ENUM(...TARGET_TYPES), allowNull: false, defaultValue: 'none', field: 'target_type' },
  targetValue: str(500, 'target_value'),
  externalUrl: text('external_url'),

  // Secondary CTA
  secondaryCtaLabel: str(80, 'secondary_cta_label'),
  secondaryTargetType: {
    type: DataTypes.ENUM(...TARGET_TYPES),
    allowNull: false,
    defaultValue: 'none',
    field: 'secondary_target_type'
  },
  secondaryTargetValue: str(500, 'secondary_target_value'),
  secondaryExternalUrl: text('secondary_external_url'),

  // Targeting (empty = globally eligible for its placement)
  targetCategorySlug: str(160, 'target_category_slug'),
  targetShopId: str(160, 'target_shop_id'),
  targetBrandSlug: str(160, 'target_brand_slug'),
  targetCampaignSlug: str(160, 'target_campaign_slug'),

  // SEO
  seoTitle: str(180, 'seo_title'),
  seoDescription: str(320, 'seo_description'),

  // Schedule & ordering
  startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
  endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' },
  priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 },
  commerceOfferKey: str(160, 'commerce_offer_key'),

  /** Catalogue device featured by `hero_product` layouts (storefront ref `device:<id>`). */
  anchorDeviceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'anchor_device_id',
    references: { model: 'devices', key: 'id' },
    onDelete: 'SET NULL'
  },

  /** Private editor notes (never returned by public endpoints). */
  notes: text('notes'),

  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'updated_by' }
}, {
  tableName: 'promotions',
  timestamps: true,
  indexes: [
    { fields: ['placement', 'status'] },
    { fields: ['starts_at'] },
    { fields: ['ends_at'] }
  ]
});

export default Promotion;
