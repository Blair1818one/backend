const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const {
    authenticate
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Generate sales report
router.get('/sales', async (req, res) => {
    try {
        const {
            start_date,
            end_date,
            branch_id
        } = req.query;

        // Determine branch filter safely
        let branchId = null;
        if (req.user.role !== 'CEO') {
            branchId = req.user.branch_id;
        } else if (branch_id) {
            branchId = parseInt(branch_id);
        }

        const params = [];
        let branchFilter = '';
        if (branchId) {
            branchFilter = 'AND s.branch_id = ?';
            params.push(branchId);
        }

        let dateFilter = '';
        if (start_date && end_date) {
            dateFilter = 'AND DATE(s.created_at) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        const [sales] = await pool.execute(
            `SELECT 
        s.*, 
        pr.name as produce_name, 
        pr.type as produce_type,
        u.name as sales_agent_name,
        b.branch_name
       FROM sales s
       JOIN produce pr ON s.produce_id = pr.produce_id
       JOIN users u ON s.sales_agent_id = u.user_id
       JOIN branches b ON s.branch_id = b.branch_id
       WHERE 1=1 ${branchFilter} ${dateFilter}
       ORDER BY s.created_at DESC`,
            params
        );

        // Calculate summary
        const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.amount_paid), 0);
        const totalTonnage = sales.reduce((sum, sale) => sum + parseFloat(sale.tonnage), 0);

        res.json({
            report: {
                type: 'sales',
                period: {
                    start_date,
                    end_date
                },
                summary: {
                    total_sales: totalSales,
                    total_tonnage: totalTonnage,
                    transaction_count: sales.length
                },
                data: sales
            }
        });
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

// Generate procurement report
router.get('/procurement', async (req, res) => {
    try {
        const {
            start_date,
            end_date,
            branch_id
        } = req.query;

        // Determine branch filter safely
        let branchId = null;
        if (req.user.role !== 'CEO') {
            branchId = req.user.branch_id;
        } else if (branch_id) {
            branchId = parseInt(branch_id);
        }

        const params = [];
        let branchFilter = '';
        if (branchId) {
            branchFilter = 'AND p.branch_id = ?';
            params.push(branchId);
        }

        let dateFilter = '';
        if (start_date && end_date) {
            dateFilter = 'AND DATE(p.created_at) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        const [procurements] = await pool.execute(
            `SELECT 
        p.*, 
        pr.name as produce_name, 
        pr.type as produce_type,
        u.name as recorded_by_name,
        b.branch_name
       FROM procurement p
       JOIN produce pr ON p.produce_id = pr.produce_id
       JOIN users u ON p.recorded_by = u.user_id
       JOIN branches b ON p.branch_id = b.branch_id
       WHERE 1=1 ${branchFilter} ${dateFilter}
       ORDER BY p.created_at DESC`,
            params
        );

        // Calculate summary
        const totalCost = procurements.reduce((sum, proc) => sum + parseFloat(proc.total_cost), 0);
        const totalTonnage = procurements.reduce((sum, proc) => sum + parseFloat(proc.tonnage), 0);

        res.json({
            report: {
                type: 'procurement',
                period: {
                    start_date,
                    end_date
                },
                summary: {
                    total_cost: totalCost,
                    total_tonnage: totalTonnage,
                    transaction_count: procurements.length
                },
                data: procurements
            }
        });
    } catch (error) {
        console.error('Procurement report error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

// Generate stock report
router.get('/stock', async (req, res) => {
    try {
        // Determine branch filter safely
        let branchId = null;
        if (req.user.role !== 'CEO') {
            branchId = req.user.branch_id;
        } else if (req.query.branch_id) {
            branchId = parseInt(req.query.branch_id);
        }

        const params = [];
        let branchFilter = '';
        if (branchId) {
            branchFilter = 'AND p.branch_id = ?';
            params.push(branchId);
        }

        const [stock] = await pool.execute(
            `SELECT 
        p.*, 
        b.branch_name, 
        b.location
       FROM produce p
       JOIN branches b ON p.branch_id = b.branch_id
       WHERE 1=1 ${branchFilter}
       ORDER BY p.name ASC`,
            params
        );

        const totalStock = stock.reduce((sum, item) => sum + parseFloat(item.current_stock), 0);

        res.json({
            report: {
                type: 'stock',
                summary: {
                    total_stock: totalStock,
                    item_count: stock.length
                },
                data: stock
            }
        });
    } catch (error) {
        console.error('Stock report error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

// Generate credit report
router.get('/credit', async (req, res) => {
    try {
        const {
            branch_id,
            payment_status
        } = req.query;

        // Determine branch filter safely
        let branchId = null;
        if (req.user.role !== 'CEO') {
            branchId = req.user.branch_id;
        } else if (branch_id) {
            branchId = parseInt(branch_id);
        }

        const params = [];
        let branchFilter = '';
        if (branchId) {
            branchFilter = 'AND s.branch_id = ?';
            params.push(branchId);
        }

        let statusFilter = '';
        if (payment_status && ['pending', 'partial', 'paid'].includes(payment_status)) {
            statusFilter = 'AND cs.payment_status = ?';
            params.push(payment_status);
        }

        const [credits] = await pool.execute(
            `SELECT 
        cs.*, 
        s.buyer_name, 
        s.buyer_contact, 
        s.tonnage, 
        s.amount_paid,
        s.created_at as sale_date,
        pr.name as produce_name,
        b.branch_name,
        u.name as sales_agent_name
       FROM credit_sales cs
       JOIN sales s ON cs.sale_id = s.sale_id
       JOIN produce pr ON s.produce_id = pr.produce_id
       JOIN branches b ON s.branch_id = b.branch_id
       JOIN users u ON s.sales_agent_id = u.user_id
       WHERE 1=1 ${branchFilter} ${statusFilter}
       ORDER BY cs.due_date ASC`,
            params
        );

        const totalDue = credits.reduce((sum, credit) => sum + parseFloat(credit.amount_due), 0);
        const totalPaid = credits.reduce((sum, credit) => sum + parseFloat(credit.amount_paid), 0);
        const totalOutstanding = totalDue - totalPaid;

        res.json({
            report: {
                type: 'credit',
                summary: {
                    total_amount_due: totalDue,
                    total_amount_paid: totalPaid,
                    total_outstanding: totalOutstanding,
                    credit_count: credits.length
                },
                data: credits
            }
        });
    } catch (error) {
        console.error('Credit report error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;