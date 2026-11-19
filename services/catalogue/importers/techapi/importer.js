import db from '../../../../models/index.js';
import { normalizeTechApiRecord } from './normalizer.js';
import { normalizeLaptopRecord, sharedLaptopDevices } from './laptop.js';

const { Brand, Device, DeviceVariant, sequelize } = db;

export async function importTechApi({ records, readErrors = [], categoryId, sourceRevision, dryRun = false, categoryType = 'smartphone' }) {
  if (!['smartphone', 'laptop'].includes(categoryType)) throw new Error('Unsupported category type');
  const report = { scanned: records.length + readErrors.length, brands: 0, devices: 0, variants: 0, skipped: readErrors.length, conflicts: [], errors: [...readErrors] };
  const normalizedRecords = categoryType === 'laptop' ? records.map((input) => normalizeLaptopRecord(input, sourceRevision)) : null;
  const laptopDevices = normalizedRecords ? sharedLaptopDevices(normalizedRecords) : null;
  for (const [index, input] of records.entries()) {
    const normalized = normalizedRecords ? normalizedRecords[index] : normalizeTechApiRecord(input, sourceRevision);
    if (normalized.error) {
      report.skipped += 1;
      report.errors.push(normalized.error);
      continue;
    }
    if (laptopDevices) normalized.device = laptopDevices.get(normalized.device.slug);
    if (dryRun) {
      report.brands += 1;
      report.devices += 1;
      report.variants += 1;
      continue;
    }
    const transaction = await sequelize.transaction();
    try {
      const [brand, brandCreated] = await Brand.findOrCreate({ where: { slug: normalized.brand.slug }, defaults: normalized.brand, transaction });
      if (brandCreated) report.brands += 1;
      let device = await Device.findOne({ where: { slug: normalized.device.slug }, transaction });
      if (device && device.category_id !== categoryId) throw new Error('Existing device belongs to another category');
      if (!device) {
        device = await Device.create({ ...normalized.device, brand_id: brand.id, category_id: categoryId }, { transaction });
        report.devices += 1;
      } else if (device.verification_status === 'verified' && normalized.device.verification_status !== 'verified') {
        report.conflicts.push({ path: input.relativePath, code: 'VERIFIED_DEVICE_PRESERVED', device_id: device.id });
      } else {
        await device.update({ ...normalized.device, brand_id: brand.id, category_id: categoryId }, { transaction });
      }
      const existingVariant = await DeviceVariant.findOne({ where: { canonical_key: normalized.variant.canonical_key }, transaction });
      if (!existingVariant) {
        await DeviceVariant.create({ ...normalized.variant, device_id: device.id }, { transaction });
        report.variants += 1;
      } else if (existingVariant.verification_status === 'verified' && normalized.variant.verification_status !== 'verified') {
        report.conflicts.push({ path: input.relativePath, code: 'VERIFIED_VARIANT_PRESERVED', variant_id: existingVariant.id });
      } else {
        await existingVariant.update({ ...normalized.variant, device_id: device.id }, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      report.skipped += 1;
      report.errors.push({ relativePath: input.relativePath, code: 'IMPORT_FAILED', message: error.message });
    }
  }
  return report;
}
