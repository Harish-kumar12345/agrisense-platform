const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const ApplicationLog = require('../models/ApplicationLog');

// In-Memory Fallback Storage if MongoDB Atlas is disconnected
let inMemoryInventory = [
  {
    _id: 'inv_f1',
    name: 'Urea 46% Nitrogen',
    category: 'Fertilizer',
    type: 'Nitrogenous',
    quantity: 45,
    unit: 'kg',
    purchase_date: '2026-01-10',
    expiry_date: '2027-01-10',
    cost: 320,
    notes: 'High nitrogen booster for vegetative stage',
    status: 'Available'
  },
  {
    _id: 'inv_f2',
    name: 'Di-Ammonium Phosphate (DAP 18-46-0)',
    category: 'Fertilizer',
    type: 'Phosphatic',
    quantity: 25,
    unit: 'kg',
    purchase_date: '2026-02-01',
    expiry_date: '2027-02-01',
    cost: 1350,
    notes: 'Root formation and early tiller establishment',
    status: 'Available'
  },
  {
    _id: 'inv_f3',
    name: 'Muriate of Potash (MOP 60% K2O)',
    category: 'Fertilizer',
    type: 'Potassic',
    quantity: 3,
    unit: 'kg',
    purchase_date: '2025-05-10',
    expiry_date: '2026-11-10',
    cost: 850,
    notes: 'Grain filling and drought resistance',
    status: 'Low Stock'
  },
  {
    _id: 'inv_p1',
    name: 'Neem Oil Bio-Pesticide (10000 ppm)',
    category: 'Pesticide',
    type: 'Bio-Pesticide',
    quantity: 4,
    unit: 'liters',
    purchase_date: '2026-03-01',
    expiry_date: '2027-03-01',
    cost: 450,
    notes: 'Organic repellent for sucking insects & aphids',
    status: 'Available'
  },
  {
    _id: 'inv_p2',
    name: 'Tricyclazole 75% WP (Blast Fungicide)',
    category: 'Pesticide',
    type: 'Fungicide',
    quantity: 1,
    unit: 'kg',
    purchase_date: '2025-08-01',
    expiry_date: '2026-08-01',
    cost: 650,
    notes: 'Systemic fungicide for Rice Blast control',
    status: 'Low Stock'
  }
];

let inMemoryLogs = [
  {
    _id: 'log_1',
    date: '2026-08-01',
    crop: 'Rice',
    field: 'North Field Polygon',
    product_id: 'inv_f1',
    product_name: 'Urea 46% Nitrogen',
    category: 'Fertilizer',
    quantity_used: 10,
    unit: 'kg',
    target_nutrient_or_pest: 'Nitrogen Deficiency Correction',
    notes: 'Applied during tillering phase'
  }
];

// Helper to determine inventory status
const calculateStatus = (qty, expDate) => {
  if (qty <= 0) return 'Out of Stock';
  if (expDate && new Date(expDate) < new Date()) return 'Expired';
  if (qty <= 5) return 'Low Stock';
  return 'Available';
};

/**
 * GET /api/inventory
 * Fetch inventory items with optional category/status filtering & search
 */
router.get('/inventory', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let items = [];

    try {
      let query = {};
      if (category) query.category = category;
      if (status) query.status = status;
      if (search) query.name = { $regex: search, $options: 'i' };

      items = await Inventory.find(query).sort({ createdAt: -1 });
    } catch (dbErr) {
      items = inMemoryInventory;
      if (category) items = items.filter(i => i.category === category);
      if (status) items = items.filter(i => i.status === status);
      if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    }

    res.json({ success: true, count: items.length, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/inventory
 * Add a new inventory item
 */
router.post('/inventory', async (req, res) => {
  try {
    const { name, category, type, quantity, unit, purchase_date, expiry_date, cost, notes } = req.body;

    if (!name || !category || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Name, category, and quantity are required.' });
    }

    const qtyNum = Number(quantity);
    const status = calculateStatus(qtyNum, expiry_date);

    let newItem;
    try {
      newItem = await Inventory.create({
        name,
        category,
        type: type || 'General',
        quantity: qtyNum,
        unit: unit || 'kg',
        purchase_date: purchase_date || new Date(),
        expiry_date,
        cost: Number(cost) || 0,
        notes: notes || '',
        status
      });
    } catch (dbErr) {
      newItem = {
        _id: 'inv_' + Date.now(),
        name,
        category,
        type: type || 'General',
        quantity: qtyNum,
        unit: unit || 'kg',
        purchase_date: purchase_date || new Date().toISOString().split('T')[0],
        expiry_date,
        cost: Number(cost) || 0,
        notes: notes || '',
        status
      };
      inMemoryInventory.unshift(newItem);
    }

    res.status(201).json({ success: true, item: newItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/inventory/:id
 * Edit existing inventory item
 */
router.put('/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.quantity !== undefined || updateData.expiry_date) {
      const qty = updateData.quantity !== undefined ? Number(updateData.quantity) : 10;
      updateData.status = calculateStatus(qty, updateData.expiry_date);
    }

    let updatedItem;
    try {
      updatedItem = await Inventory.findByIdAndUpdate(id, updateData, { new: true });
    } catch (dbErr) {
      const idx = inMemoryInventory.findIndex(i => i._id === id);
      if (idx !== -1) {
        inMemoryInventory[idx] = { ...inMemoryInventory[idx], ...updateData };
        updatedItem = inMemoryInventory[idx];
      }
    }

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/inventory/:id
 * Delete inventory item
 */
router.delete('/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await Inventory.findByIdAndDelete(id);
    } catch (dbErr) {
      inMemoryInventory = inMemoryInventory.filter(i => i._id !== id);
    }

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/inventory/apply
 * Record application of fertilizer or pesticide:
 * Decrements stock quantity, updates status, and logs application
 */
router.post('/inventory/apply', async (req, res) => {
  try {
    const { product_id, crop, field, quantity_used, target_nutrient_or_pest, notes } = req.body;

    if (!product_id || !crop || !quantity_used) {
      return res.status(400).json({ success: false, message: 'Product ID, crop, and quantity used are required.' });
    }

    const usedNum = Number(quantity_used);
    let targetItem = null;

    try {
      targetItem = await Inventory.findById(product_id);
    } catch (dbErr) {
      targetItem = inMemoryInventory.find(i => i._id === product_id);
    }

    if (!targetItem) {
      return res.status(404).json({ success: false, message: 'Inventory product not found' });
    }

    // Decrement stock
    const newQty = Math.max(0, Number(targetItem.quantity) - usedNum);
    const newStatus = calculateStatus(newQty, targetItem.expiry_date);

    try {
      targetItem.quantity = newQty;
      targetItem.status = newStatus;
      await Inventory.findByIdAndUpdate(product_id, { quantity: newQty, status: newStatus });
    } catch (dbErr) {
      const idx = inMemoryInventory.findIndex(i => i._id === product_id);
      if (idx !== -1) {
        inMemoryInventory[idx].quantity = newQty;
        inMemoryInventory[idx].status = newStatus;
      }
    }

    // Create Application Log
    let logEntry;
    const logData = {
      date: new Date(),
      crop,
      field: field || 'Main Registered Field',
      product_id,
      product_name: targetItem.name,
      category: targetItem.category,
      quantity_used: usedNum,
      unit: targetItem.unit,
      target_nutrient_or_pest: target_nutrient_or_pest || 'Field Application',
      notes: notes || ''
    };

    try {
      logEntry = await ApplicationLog.create(logData);
    } catch (dbErr) {
      logEntry = {
        _id: 'log_' + Date.now(),
        ...logData,
        date: new Date().toISOString().split('T')[0]
      };
      inMemoryLogs.unshift(logEntry);
    }

    res.json({
      success: true,
      message: `Recorded application of ${usedNum} ${targetItem.unit} of ${targetItem.name}`,
      updatedItem: { ...targetItem, quantity: newQty, status: newStatus },
      log: logEntry
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/inventory/logs
 * Fetch all application logs
 */
router.get('/inventory/logs', async (req, res) => {
  try {
    let logs = [];
    try {
      logs = await ApplicationLog.find({}).sort({ date: -1 });
    } catch (dbErr) {
      logs = inMemoryLogs;
    }

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
