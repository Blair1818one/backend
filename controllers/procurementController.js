const pool = require('../config/database');

// Create new procurement
const createProcurement = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            produce_id,
            dealer_name,
            dealer_contact,
            dealer_type,
            tonnage,
            cost_per_ton,
            total_cost,
            selling_price_per_ton,
            branch_id
        } = req.body;

        // Check if user has access to this branch
        if (req.user.role !== 'CEO' && req.user.branch_id !== branch_id) {
            await connection.rollback();
            return res.status(403).json({
                message: 'Access denied to this branch'
            });
        }

        // Insert procurement
        const [result] = await connection.execute(
            `INSERT INTO procurement 
       (produce_id, dealer_name, dealer_contact, dealer_type, tonnage, cost_per_ton, total_cost, selling_price_per_ton, branch_id, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [produce_id, dealer_name, dealer_contact, dealer_type, tonnage, cost_per_ton, total_cost, selling_price_per_ton, branch_id, req.user.user_id]
        );

        // Update produce stock
        await connection.execute(
            'UPDATE produce SET current_stock = current_stock + ? WHERE produce_id = ? AND branch_id = ?',
            [tonnage, produce_id, branch_id]
        );

        await connection.commit();

        // Get created procurement with details
        const [procurements] = await pool.execute(
            `SELECT p.*, pr.name as produce_name, pr.type as produce_type 
       FROM procurement p 
       JOIN produce pr ON p.produce_id = pr.produce_id 
       WHERE p.procurement_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Procurement recorded successfully',
            procurement: procurements[0]
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create procurement error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Get all procurements
const getAllProcurements = async (req, res) => {
    try {
        let query = `
      SELECT p.*, pr.name as produce_name, pr.type as produce_type, 
             u.name as recorded_by_name, b.branch_name
      FROM procurement p
      JOIN produce pr ON p.produce_id = pr.produce_id
      JOIN users u ON p.recorded_by = u.user_id
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

        // Filter by date range
        if (req.query.start_date) {
            query += ' AND DATE(p.created_at) >= ?';
            params.push(req.query.start_date);
        }
        if (req.query.end_date) {
            query += ' AND DATE(p.created_at) <= ?';
            params.push(req.query.end_date);
        }

        query += ' ORDER BY p.created_at DESC';

        const [procurements] = await pool.execute(query, params);

        res.json({
            procurements
        });
    } catch (error) {
        console.error('Get procurements error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get procurement by ID
const getProcurementById = async (req, res) => {
    try {
        const {
            id
        } = req.params;

        const [procurements] = await pool.execute(
            `SELECT p.*, pr.name as produce_name, pr.type as produce_type, 
              u.name as recorded_by_name, b.branch_name
       FROM procurement p
       JOIN produce pr ON p.produce_id = pr.produce_id
       JOIN users u ON p.recorded_by = u.user_id
       JOIN branches b ON p.branch_id = b.branch_id
       WHERE p.procurement_id = ?`,
            [id]
        );

        if (procurements.length === 0) {
            return res.status(404).json({
                message: 'Procurement not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && procurements[0].branch_id !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        res.json({
            procurement: procurements[0]
        });
    } catch (error) {
        console.error('Get procurement error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Update procurement
const updateProcurement = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            id
        } = req.params;
        const updateFields = req.body;

        // Get existing procurement
        const [existing] = await connection.execute(
            'SELECT * FROM procurement WHERE procurement_id = ?',
            [id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: 'Procurement not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && existing[0].branch_id !== req.user.branch_id) {
            await connection.rollback();
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        // Build update query
        const allowedFields = ['dealer_name', 'dealer_contact', 'dealer_type', 'tonnage', 'cost_per_ton', 'total_cost', 'selling_price_per_ton'];
        const updates = [];
        const values = [];

        allowedFields.forEach(field => {
            if (updateFields[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateFields[field]);
            }
        });

        if (updates.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                message: 'No valid fields to update'
            });
        }

        values.push(id);
        await connection.execute(
            `UPDATE procurement SET ${updates.join(', ')} WHERE procurement_id = ?`,
            values
        );

        // Update stock if tonnage changed
        if (updateFields.tonnage !== undefined) {
            const stockDiff = updateFields.tonnage - existing[0].tonnage;
            await connection.execute(
                'UPDATE produce SET current_stock = current_stock + ? WHERE produce_id = ? AND branch_id = ?',
                [stockDiff, existing[0].produce_id, existing[0].branch_id]
            );
        }

        await connection.commit();

        const [updated] = await pool.execute(
            'SELECT * FROM procurement WHERE procurement_id = ?',
            [id]
        );

        res.json({
            message: 'Procurement updated successfully',
            procurement: updated[0]
        });
    } catch (error) {
        await connection.rollback();
        console.error('Update procurement error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Delete procurement
const deleteProcurement = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            id
        } = req.params;

        // Get existing procurement
        const [existing] = await connection.execute(
            'SELECT * FROM procurement WHERE procurement_id = ?',
            [id]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: 'Procurement not found'
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
            'UPDATE produce SET current_stock = current_stock - ? WHERE produce_id = ? AND branch_id = ?',
            [existing[0].tonnage, existing[0].produce_id, existing[0].branch_id]
        );

        // Delete procurement
        await connection.execute(
            'DELETE FROM procurement WHERE procurement_id = ?',
            [id]
        );

        await connection.commit();

        res.json({
            message: 'Procurement deleted successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Delete procurement error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    createProcurement,
    getAllProcurements,
    getProcurementById,
    updateProcurement,
    deleteProcurement
};