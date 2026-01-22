import db from '../models/index.js';

const { Product } = db;

// Get all images for a product
export const getImages = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const images = product.images || [];
    const mainImage = product.image;

    return res.json({
      status: 'success',
      data: {
        main_image: mainImage,
        images: images,
        total: images.length
      }
    });
  } catch (error) {
    console.error('Get product images error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product images',
      error: error.message
    });
  }
};

// Add image URL(s) to a product
export const addImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, image_urls } = req.body;

    if (!image_url && !image_urls) {
      return res.status(400).json({
        status: 'error',
        message: 'image_url or image_urls is required'
      });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Get existing images array or initialize empty array
    let images = product.images || [];
    const initialCount = images.length;
    const addedUrls = [];
    const skippedUrls = [];
    
    // Add single image URL
    if (image_url) {
      if (!images.includes(image_url)) {
        images.push(image_url);
        addedUrls.push(image_url);
      } else {
        skippedUrls.push(image_url);
      }
    }

    // Add multiple image URLs
    if (image_urls) {
      const urlsArray = Array.isArray(image_urls) ? image_urls : [image_urls];
      urlsArray.forEach(url => {
        if (url) {
          if (!images.includes(url)) {
            images.push(url);
            addedUrls.push(url);
          } else {
            skippedUrls.push(url);
          }
        }
      });
    }

    product.images = images;
    await product.save();

    const addedCount = images.length - initialCount;

    return res.json({
      status: 'success',
      message: addedCount > 0 
        ? `Successfully added ${addedCount} image(s). ${skippedUrls.length > 0 ? `${skippedUrls.length} duplicate(s) skipped.` : ''}`
        : 'No new images added (all were duplicates)',
      data: {
        images: images,
        total: images.length,
        added_count: addedCount,
        added_urls: addedUrls,
        skipped_urls: skippedUrls.length > 0 ? skippedUrls : undefined
      }
    });
  } catch (error) {
    console.error('Add product images error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to add product images',
      error: error.message
    });
  }
};

// Update a specific image at index
export const updateImage = async (req, res) => {
  try {
    const { id, index } = req.params;
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({
        status: 'error',
        message: 'image_url is required'
      });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    let images = product.images || [];
    const imageIndex = parseInt(index);

    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= images.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid image index'
      });
    }

    images[imageIndex] = image_url;
    product.images = images;
    await product.save();

    return res.json({
      status: 'success',
      message: 'Image updated successfully',
      data: {
        images: images,
        updated_index: imageIndex,
        updated_url: image_url
      }
    });
  } catch (error) {
    console.error('Update product image error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update product image',
      error: error.message
    });
  }
};

// Replace all images
export const replaceImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { image_urls } = req.body;

    if (!image_urls) {
      return res.status(400).json({
        status: 'error',
        message: 'image_urls is required'
      });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const imagesArray = Array.isArray(image_urls) ? image_urls : [image_urls];
    product.images = imagesArray;
    await product.save();

    return res.json({
      status: 'success',
      message: 'Images replaced successfully',
      data: {
        images: imagesArray,
        total: imagesArray.length
      }
    });
  } catch (error) {
    console.error('Replace product images error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to replace product images',
      error: error.message
    });
  }
};

// Delete a specific image at index
export const deleteImage = async (req, res) => {
  try {
    const { id, index } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    let images = product.images || [];
    const imageIndex = parseInt(index);

    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= images.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid image index'
      });
    }

    const deletedUrl = images[imageIndex];
    images.splice(imageIndex, 1);
    product.images = images;
    await product.save();

    return res.json({
      status: 'success',
      message: 'Image deleted successfully',
      data: {
        images: images,
        deleted_url: deletedUrl,
        total: images.length
      }
    });
  } catch (error) {
    console.error('Delete product image error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete product image',
      error: error.message
    });
  }
};

// Delete all images
export const deleteAllImages = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const deletedCount = (product.images || []).length;
    product.images = [];
    await product.save();

    return res.json({
      status: 'success',
      message: 'All images deleted successfully',
      data: {
        images: [],
        deleted_count: deletedCount
      }
    });
  } catch (error) {
    console.error('Delete all product images error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete all product images',
      error: error.message
    });
  }
};

