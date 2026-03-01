import db from '../models/index.js';

const { ShippingAddress } = db;

const toAddressDto = (row) => ({
  id: row.id,
  label: row.label || null,
  name: row.name,
  phone: row.phone,
  address: row.address,
  city: row.city,
  region: row.region || null,
  is_default: !!row.is_default
});

export const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await ShippingAddress.findAll({
      where: { user_id: userId },
      order: [['is_default', 'DESC'], ['id', 'ASC']]
    });
    // API doc: return data as direct array, not paginated
    return res.json({
      success: true,
      message: 'Addresses retrieved',
      data: addresses.map(toAddressDto)
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve addresses',
      data: null,
      error: error.message
    });
  }
};

export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { label, name, phone, address, city, region, is_default } = req.body;

    if (!name || !phone || !address || !city) {
      return res.status(400).json({
        success: false,
        message: 'name, phone, address, and city are required',
        data: null
      });
    }

    if (is_default) {
      await ShippingAddress.update(
        { is_default: false },
        { where: { user_id: userId } }
      );
    }

    const row = await ShippingAddress.create({
      user_id: userId,
      label: label || null,
      name,
      phone,
      address,
      city,
      region: region || null,
      is_default: !!is_default
    });

    return res.status(201).json({
      success: true,
      message: 'Address added',
      data: toAddressDto(row)
    });
  } catch (error) {
    console.error('Add address error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add address',
      data: null,
      error: error.message
    });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.address_id || req.params.id;
    const { label, name, phone, address, city, region, is_default } = req.body;

    const row = await ShippingAddress.findOne({
      where: { id, user_id: userId }
    });

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        data: null
      });
    }

    if (name !== undefined) row.name = name;
    if (phone !== undefined) row.phone = phone;
    if (address !== undefined) row.address = address;
    if (city !== undefined) row.city = city;
    if (label !== undefined) row.label = label;
    if (region !== undefined) row.region = region;
    if (is_default === true) {
      await ShippingAddress.update(
        { is_default: false },
        { where: { user_id: userId } }
      );
      row.is_default = true;
    } else if (is_default === false) {
      row.is_default = false;
    }
    await row.save();

    return res.json({
      success: true,
      message: 'Address updated',
      data: toAddressDto(row)
    });
  } catch (error) {
    console.error('Update address error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update address',
      data: null,
      error: error.message
    });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.address_id || req.params.id;

    const row = await ShippingAddress.findOne({
      where: { id, user_id: userId }
    });

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        data: null
      });
    }

    await row.destroy();
    return res.json({
      success: true,
      message: 'Address deleted',
      data: null
    });
  } catch (error) {
    console.error('Delete address error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      data: null,
      error: error.message
    });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.address_id || req.params.id;

    const row = await ShippingAddress.findOne({
      where: { id, user_id: userId }
    });

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        data: null
      });
    }

    await ShippingAddress.update(
      { is_default: false },
      { where: { user_id: userId } }
    );
    row.is_default = true;
    await row.save();

    return res.json({
      success: true,
      message: 'Default address set',
      data: toAddressDto(row)
    });
  } catch (error) {
    console.error('Set default address error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      data: null,
      error: error.message
    });
  }
};
