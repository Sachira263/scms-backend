const Product = require('../models/Product');

// Get all products (Public)
exports.getAllProducts = async (req, res) => {
  try {
    const { available } = req.query;
    let filter = {};
    
    // If available=true, only show available products (for students)
    if (available === 'true') {
      filter.isAvailable = true;
    }
    
    const products = await Product.find(filter);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new product (Admin only)
exports.createProduct = async (req, res) => {
  try {
    const { name, price, description, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const product = new Product({
      name,
      price,
      description,
      category,
      imageUrl
    });

    await product.save();
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get product by ID (Public)
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product (Admin only)
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, description, category, isAvailable } = req.body;
    let updateData = { name, price, description, category, isAvailable };

    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete product (Admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get products by category (Public)
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category, isAvailable: true });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle product availability (Admin only)
exports.toggleAvailability = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    res.json({ 
      message: `Product is now ${product.isAvailable ? 'available' : 'unavailable'}`, 
      product 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


