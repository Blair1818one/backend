const pool = require('../config/database');

// Get all produce/stock
const getAllStock = async (req, res) => {
    try {
        let query = `
      SELECT p.*, b.branch_name, b.location
      FROM produce p
      JOIN branches b ON p.branch_id = b.branch_id
      WHERE 1=1
    `;
        const params = [];

        // Filter by branch if user is not CEO
        if (req.user.role !== 'CEO') {
            query += ' AND p.branch_id = ?';
            params.push(req.user.branch_id);
        } else if (req.query.branch_id) {
            query += ' AND p.branch_id = ?';
            params.push(req.query.branch_id);
        }

        // Filter by type
        if (req.query.type) {
            query += ' AND p.type = ?';
            params.push(req.query.type);
        }

        query += ' ORDER BY p.name ASC';

        const [stock] = await pool.execute(query, params);

        res.json({
            stock
        });
    } catch (error) {
        console.error('Get stock error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get stock by ID
const getStockById = async (req, res) => {
    try {
        const {
            id
        } = req.params;

        const [stock] = await pool.execute(
            `SELECT p.*, b.branch_name, b.location
       FROM produce p
       JOIN branches b ON p.branch_id = b.branch_id
       WHERE p.produce_id = ?`,
            [id]
        );

        if (stock.length === 0) {
            return res.status(404).json({
                message: 'Stock not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && stock[0].branch_id !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        res.json({
            stock: stock[0]
        });
    } catch (error) {
        console.error('Get stock by ID error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Create new produce/stock
const createStock = async (req, res) => {
    try {
        const {
            name,
            type,
            branch_id,
            current_stock
        } = req.body;

        // Check if user has access to this branch
        if (req.user.role !== 'CEO' && req.user.branch_id !== branch_id) {
            return res.status(403).json({
                message: 'Access denied to this branch'
            });
        }

        // Check if produce already exists in this branch
        const [existing] = await pool.execute(
            'SELECT produce_id FROM produce WHERE name = ? AND branch_id = ?',
            [name, branch_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                message: 'This produce already exists in this branch'
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO produce (name, type, branch_id, current_stock) VALUES (?, ?, ?, ?)',
            [name, type, branch_id, current_stock || 0]
        );

        const [newStock] = await pool.execute(
            `SELECT p.*, b.branch_name, b.location
       FROM produce p
       JOIN branches b ON p.branch_id = b.branch_id
       WHERE p.produce_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Stock created successfully',
            stock: newStock[0]
        });
    } catch (error) {
        console.error('Create stock error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Update stock
const updateStock = async (req, res) => {
    try {
        const {
            id
        } = req.params;
        const {
            name,
            type,
            current_stock
        } = req.body;

        // Get existing stock
        const [existing] = await pool.execute(
            'SELECT * FROM produce WHERE produce_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: 'Stock not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && existing[0].branch_id !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (type !== undefined) {
            updates.push('type = ?');
            values.push(type);
        }
        if (current_stock !== undefined) {
            updates.push('current_stock = ?');
            values.push(current_stock);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                message: 'No valid fields to update'
            });
        }

        values.push(id);
        await pool.execute(
            `UPDATE produce SET ${updates.join(', ')} WHERE produce_id = ?`,
            values
        );

        const [updated] = await pool.execute(
            `SELECT p.*, b.branch_name, b.location
       FROM produce p
       JOIN branches b ON p.branch_id = b.branch_id
       WHERE p.produce_id = ?`,
            [id]
        );

        res.json({
            message: 'Stock updated successfully',
            stock: updated[0]
        });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Delete stock
const deleteStock = async (req, res) => {
    try {
        const {
            id
        } = req.params;

        // Get existing stock
        const [existing] = await pool.execute(
            'SELECT * FROM produce WHERE produce_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: 'Stock not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && existing[0].branch_id !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        // Check if stock is zero
        if (parseFloat(existing[0].current_stock) > 0) {
            return res.status(400).json({
                message: 'Cannot delete stock with remaining inventory'
            });
        }

        await pool.execute('DELETE FROM produce WHERE produce_id = ?', [id]);

        res.json({
            message: 'Stock deleted successfully'
        });
    } catch (error) {
        console.error('Delete stock error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get low stock alerts
const getLowStockAlerts = async (req, res) => {
    try {
        const threshold = parseFloat(req.query.threshold) || 10; // Default 10 tons

        let query = `
      SELECT p.*, b.branch_name, b.location
      FROM produce p
      JOIN branches b ON p.branch_id = b.branch_id
      WHERE p.current_stock <= ?
    `;
        const params = [threshold];

        // Filter by branch if user is not CEO
        if (req.user.role !== 'CEO') {
            query += ' AND p.branch_id = ?';
            params.push(req.user.branch_id);
        } else if (req.query.branch_id) {
            query += ' AND p.branch_id = ?';
            params.push(req.query.branch_id);
        }

        query += ' ORDER BY p.current_stock ASC';

        const [lowStock] = await pool.execute(query, params);

        res.json({
            lowStock,
            threshold
        });
    } catch (error) {
        console.error('Get low stock alerts error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    getAllStock,
    getStockById,
    createStock,
    updateStock,
    deleteStock,
    getLowStockAlerts
};