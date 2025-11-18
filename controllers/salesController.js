const pool = require('../config/database');

// Create new sale
const createSale = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            produce_id,
            buyer_name,
            buyer_contact,
            tonnage,
            amount_paid,
            payment_type,
            branch_id,
            buyer_national_id,
            buyer_location,
            amount_due,
            due_date
        } = req.body;

        // Check if user has access to this branch
        if (req.user.role !== 'CEO' && req.user.branch_id !== branch_id) {
            await connection.rollback();
            return res.status(403).json({
                message: 'Access denied to this branch'
            });
        }

        // Check if there's enough stock
        const [produce] = await connection.execute(
            'SELECT current_stock FROM produce WHERE produce_id = ? AND branch_id = ?',
            [produce_id, branch_id]
        );

        if (produce.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: 'Produce not found in this branch'
            });
        }

        if (parseFloat(produce[0].current_stock) < parseFloat(tonnage)) {
            await connection.rollback();
            return res.status(400).json({
                message: 'Insufficient stock'
            });
        }

        // Insert sale
        const [saleResult] = await connection.execute(
            `INSERT INTO sales 
       (produce_id, buyer_name, buyer_contact, tonnage, amount_paid, sales_agent_id, branch_id, payment_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [produce_id, buyer_name, buyer_contact, tonnage, amount_paid, req.user.user_id, branch_id, payment_type]
        );

        // Update stock
        await connection.execute(
            'UPDATE produce SET current_stock = current_stock - ? WHERE produce_id = ? AND branch_id = ?',
            [tonnage, produce_id, branch_id]
        );

        // If credit sale, create credit record
        if (payment_type === 'credit' && amount_due) {
            await connection.execute(
                `INSERT INTO credit_sales 
         (sale_id, buyer_national_id, buyer_location, amount_due, due_date, payment_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [saleResult.insertId, buyer_national_id, buyer_location, amount_due, due_date, 'pending']
            );
        }

        await connection.commit();

        // Get created sale with details
        const [sales] = await pool.execute(
            `SELECT s.*, pr.name as produce_name, pr.type as produce_type, 
              u.name as sales_agent_name, b.branch_name
       FROM sales s
       JOIN produce pr ON s.produce_id = pr.produce_id
       JOIN users u ON s.sales_agent_id = u.user_id
       JOIN branches b ON s.branch_id = b.branch_id
       WHERE s.sale_id = ?`,
            [saleResult.insertId]
        );

        res.status(201).json({
            message: 'Sale recorded successfully',
            sale: sales[0]
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create sale error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Get all sales
const getAllSales = async (req, res) => {
    try {
        let query = `
      SELECT s.*, pr.name as produce_name, pr.type as produce_type, 
             u.name as sales_agent_name, b.branch_name
      FROM sales s
      JOIN produce pr ON s.produce_id = pr.produce_id
      JOIN users u ON s.sales_agent_id = u.user_id
      JOIN branches b ON s.branch_id = b.branch_id
      WHERE 1=1
    `;
        const params = [];

        // Filter by branch if user is not CEO
        if (req.user.role !== 'CEO') {
            query += ' AND s.branch_id = ?';
            params.push(req.user.branch_id);
        } else if (req.query.branch_id) {
            query += ' AND s.branch_id = ?';
            params.push(req.query.branch_id);
        }

        // Filter by date range
        if (req.query.start_date) {
            query += ' AND DATE(s.created_at) >= ?';
            params.push(req.query.start_date);
        }
        if (req.query.end_date) {
            query += ' AND DATE(s.created_at) <= ?';
            params.push(req.query.end_date);
        }

        // Filter by payment type
        if (req.query.payment_type) {
            query += ' AND s.payment_type = ?';
            params.push(req.query.payment_type);
        }

        query += ' ORDER BY s.created_at DESC';

        const [sales] = await pool.execute(query, params);

        res.json({
            sales
        });
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get sale by ID
const getSaleById = async (req, res) => {
    try {
        const {
            id
        } = req.params;

        const [sales] = await pool.execute(
            `SELECT s.*, pr.name as produce_name, pr.type as produce_type, 
              u.name as sales_agent_name, b.branch_name
       FROM sales s
       JOIN produce pr ON s.produce_id = pr.produce_id
       JOIN users u ON s.sales_agent_id = u.user_id
       JOIN branches b ON s.branch_id = b.branch_id
       WHERE s.sale_id = ?`,
            [id]
        );

        if (sales.length === 0) {
            return res.status(404).json({
                message: 'Sale not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && sales[0].branch_id !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        // Get credit information if credit sale
        if (sales[0].payment_type === 'credit') {
            const [credits] = await pool.execute(
                'SELECT * FROM credit_sales WHERE sale_id = ?',
                [id]
            );
            sales[0].credit_info = credits[0] || null;
        }

        res.json({
            sale: sales[0]
        });
    } catch (error) {
        console.error('Get sale error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Update sale
const updateSale = async (req, res) => {
    try {
        const {
            id
        } = req.params;
        const updateFields = req.body;

        // Get existing sale
        const [existing] = await pool.execute(
            'SELECT * FROM sales WHERE sale_id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: 'Sale not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && existing[0].branch_id !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        // Build update query
        const allowedFields = ['buyer_name', 'buyer_contact', 'tonnage', 'amount_paid'];
        const updates = [];
        const values = [];

        allowedFields.forEach(field => {
            if (updateFields[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateFields[field]);
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({
                message: 'No valid fields to update'
            });
        }

        values.push(id);
        await pool.execute(
            `UPDATE sales SET ${updates.join(', ')} WHERE sale_id = ?`,
            values
        );

        const [updated] = await pool.execute(
            'SELECT * FROM sales WHERE sale_id = ?',
            [id]
        );

        res.json({
            message: 'Sale updated successfully',
            sale: updated[0]
        });
    } catch (error) {
        console.error('Update sale error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Delete sale
const deleteSale = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            id
        } = req.params;

        // Get existing sale
        const [existing] = await connection.execute(
            'SELECT * FROM sales WHERE sale_id = ?',
            [id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: 'Sale not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && existing[0].branch_id !== req.user.branch_id) {
            await connection.rollback();
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        // Restore stock
        await connection.execute(
            'UPDATE produce SET current_stock = current_stock + ? WHERE produce_id = ? AND branch_id = ?',
            [existing[0].tonnage, existing[0].produce_id, existing[0].branch_id]
        );

        // Delete credit record if exists
        await connection.execute(
            'DELETE FROM credit_sales WHERE sale_id = ?',
            [id]
        );

        // Delete sale
        await connection.execute(
            'DELETE FROM sales WHERE sale_id = ?',
            [id]
        );

        await connection.commit();

        res.json({
            message: 'Sale deleted successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Delete sale error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    createSale,
    getAllSales,
    getSaleById,
    updateSale,
    deleteSale
};