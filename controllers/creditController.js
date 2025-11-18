const pool = require('../config/database');

// Get all credit sales
const getAllCredits = async (req, res) => {
    try {
        let query = `
      SELECT cs.*, s.buyer_name, s.buyer_contact, s.tonnage, s.amount_paid, 
             s.created_at as sale_date, pr.name as produce_name, 
             b.branch_name, u.name as sales_agent_name
      FROM credit_sales cs
      JOIN sales s ON cs.sale_id = s.sale_id
      JOIN produce pr ON s.produce_id = pr.produce_id
      JOIN branches b ON s.branch_id = b.branch_id
      JOIN users u ON s.sales_agent_id = u.user_id
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

        // Filter by payment status
        if (req.query.payment_status) {
            query += ' AND cs.payment_status = ?';
            params.push(req.query.payment_status);
        }

        // Filter by overdue
        if (req.query.overdue === 'true') {
            query += ' AND cs.due_date < CURDATE() AND cs.payment_status != "paid"';
        }

        query += ' ORDER BY cs.due_date ASC';

        const [credits] = await pool.execute(query, params);

        res.json({
            credits
        });
    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get credit by ID
const getCreditById = async (req, res) => {
    try {
        const {
            id
        } = req.params;

        const [credits] = await pool.execute(
            `SELECT cs.*, s.buyer_name, s.buyer_contact, s.tonnage, s.amount_paid, 
              s.created_at as sale_date, pr.name as produce_name, 
              b.branch_name, u.name as sales_agent_name
       FROM credit_sales cs
       JOIN sales s ON cs.sale_id = s.sale_id
       JOIN produce pr ON s.produce_id = pr.produce_id
       JOIN branches b ON s.branch_id = b.branch_id
       JOIN users u ON s.sales_agent_id = u.user_id
       WHERE cs.credit_id = ?`,
            [id]
        );

        if (credits.length === 0) {
            return res.status(404).json({
                message: 'Credit record not found'
            });
        }

        // Check access
        if (req.user.role !== 'CEO' && credits[0].branch_id !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        res.json({
            credit: credits[0]
        });
    } catch (error) {
        console.error('Get credit error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Update credit payment
const updateCreditPayment = async (req, res) => {
    try {
        const {
            id
        } = req.params;
        const {
            amount_paid
        } = req.body;

        if (!amount_paid || amount_paid <= 0) {
            return res.status(400).json({
                message: 'Valid payment amount is required'
            });
        }

        // Get existing credit
        const [credits] = await pool.execute(
            `SELECT cs.*, s.branch_id
       FROM credit_sales cs
       JOIN sales s ON cs.sale_id = s.sale_id
       WHERE cs.credit_id = ?`,
            [id]
        );

        if (credits.length === 0) {
            return res.status(404).json({
                message: 'Credit record not found'
            });
        }

        const credit = credits[0];

        // Check access
        if (req.user.role !== 'CEO' && credit.branch_id !== req.user.branch_id) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        // Calculate new amount paid and status
        const newAmountPaid = parseFloat(credit.amount_paid) + parseFloat(amount_paid);
        const amountDue = parseFloat(credit.amount_due);
        let paymentStatus = 'partial';

        if (newAmountPaid >= amountDue) {
            paymentStatus = 'paid';
        }

        // Update credit
        await pool.execute(
            `UPDATE credit_sales 
       SET amount_paid = ?, payment_status = ? 
       WHERE credit_id = ?`,
            [newAmountPaid, paymentStatus, id]
        );

        const [updated] = await pool.execute(
            `SELECT cs.*, s.buyer_name, s.buyer_contact, s.tonnage, s.amount_paid as sale_amount, 
              pr.name as produce_name, b.branch_name
       FROM credit_sales cs
       JOIN sales s ON cs.sale_id = s.sale_id
       JOIN produce pr ON s.produce_id = pr.produce_id
       JOIN branches b ON s.branch_id = b.branch_id
       WHERE cs.credit_id = ?`,
            [id]
        );

        res.json({
            message: 'Payment recorded successfully',
            credit: updated[0]
        });
    } catch (error) {
        console.error('Update credit payment error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get credit statistics
const getCreditStats = async (req, res) => {
    try {
        let query = `
      SELECT 
        COUNT(*) as total_credits,
        SUM(amount_due) as total_amount_due,
        SUM(amount_paid) as total_amount_paid,
        SUM(amount_due - amount_paid) as total_outstanding,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN due_date < CURDATE() AND payment_status != 'paid' THEN 1 ELSE 0 END) as overdue_count
      FROM credit_sales cs
      JOIN sales s ON cs.sale_id = s.sale_id
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

        const [stats] = await pool.execute(query, params);

        res.json({
            stats: stats[0]
        });
    } catch (error) {
        console.error('Get credit stats error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    getAllCredits,
    getCreditById,
    updateCreditPayment,
    getCreditStats
};

