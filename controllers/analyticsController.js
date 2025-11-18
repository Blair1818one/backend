const pool = require('../config/database');

// Get dashboard analytics
const getDashboardAnalytics = async (req, res) => {
    try {
        // Determine branch filter safely
        let branchId = null;
        if (req.user.role !== 'CEO') {
            branchId = req.user.branch_id;
        } else if (req.query.branch_id) {
            branchId = parseInt(req.query.branch_id);
        }

        const branchFilter = branchId ? 'AND branch_id = ?' : '';
        const params = branchId ? [branchId] : [];

        // Total stock value
        const stockValueQuery = branchId ?
            `SELECT SUM(p.current_stock * pr.selling_price_per_ton) as total_stock_value
         FROM produce p
         LEFT JOIN (
           SELECT produce_id, branch_id, MAX(selling_price_per_ton) as selling_price_per_ton
           FROM procurement
           WHERE branch_id = ?
           GROUP BY produce_id, branch_id
         ) pr ON p.produce_id = pr.produce_id AND p.branch_id = pr.branch_id
         WHERE p.branch_id = ?` :
            `SELECT SUM(p.current_stock * pr.selling_price_per_ton) as total_stock_value
         FROM produce p
         LEFT JOIN (
           SELECT produce_id, branch_id, MAX(selling_price_per_ton) as selling_price_per_ton
           FROM procurement
           GROUP BY produce_id, branch_id
         ) pr ON p.produce_id = pr.produce_id AND p.branch_id = pr.branch_id`;

        const stockValueParams = branchId ? [branchId, branchId] : [];
        const [stockValue] = await pool.execute(stockValueQuery, stockValueParams);

        // Total sales (today, this week, this month)
        const salesStatsQuery = branchId ?
            `SELECT 
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount_paid ELSE 0 END) as today_sales,
          SUM(CASE WHEN YEARWEEK(created_at) = YEARWEEK(CURDATE()) THEN amount_paid ELSE 0 END) as week_sales,
          SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN amount_paid ELSE 0 END) as month_sales,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_count,
          COUNT(CASE WHEN YEARWEEK(created_at) = YEARWEEK(CURDATE()) THEN 1 END) as week_count,
          COUNT(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 END) as month_count
         FROM sales
         WHERE branch_id = ?` :
            `SELECT 
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount_paid ELSE 0 END) as today_sales,
          SUM(CASE WHEN YEARWEEK(created_at) = YEARWEEK(CURDATE()) THEN amount_paid ELSE 0 END) as week_sales,
          SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN amount_paid ELSE 0 END) as month_sales,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_count,
          COUNT(CASE WHEN YEARWEEK(created_at) = YEARWEEK(CURDATE()) THEN 1 END) as week_count,
          COUNT(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 END) as month_count
         FROM sales`;
        const [salesStats] = await pool.execute(salesStatsQuery, params);

        // Total procurement (today, this week, this month)
        const procurementStatsQuery = branchId ?
            `SELECT 
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_cost ELSE 0 END) as today_procurement,
          SUM(CASE WHEN YEARWEEK(created_at) = YEARWEEK(CURDATE()) THEN total_cost ELSE 0 END) as week_procurement,
          SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN total_cost ELSE 0 END) as month_procurement
         FROM procurement
         WHERE branch_id = ?` :
            `SELECT 
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_cost ELSE 0 END) as today_procurement,
          SUM(CASE WHEN YEARWEEK(created_at) = YEARWEEK(CURDATE()) THEN total_cost ELSE 0 END) as week_procurement,
          SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN total_cost ELSE 0 END) as month_procurement
         FROM procurement`;
        const [procurementStats] = await pool.execute(procurementStatsQuery, params);

        // Outstanding credits
        const creditStatsQuery = branchId ?
            `SELECT 
          SUM(cs.amount_due - cs.amount_paid) as total_outstanding,
          COUNT(CASE WHEN cs.payment_status != 'paid' THEN 1 END) as unpaid_count,
          COUNT(CASE WHEN cs.due_date < CURDATE() AND cs.payment_status != 'paid' THEN 1 END) as overdue_count
         FROM credit_sales cs
         JOIN sales s ON cs.sale_id = s.sale_id
         WHERE s.branch_id = ?` :
            `SELECT 
          SUM(cs.amount_due - cs.amount_paid) as total_outstanding,
          COUNT(CASE WHEN cs.payment_status != 'paid' THEN 1 END) as unpaid_count,
          COUNT(CASE WHEN cs.due_date < CURDATE() AND cs.payment_status != 'paid' THEN 1 END) as overdue_count
         FROM credit_sales cs
         JOIN sales s ON cs.sale_id = s.sale_id`;
        const [creditStats] = await pool.execute(creditStatsQuery, params);

        // Top selling produce
        const topProduceQuery = branchId ?
            `SELECT 
          pr.name, pr.type,
          SUM(s.tonnage) as total_tonnage,
          SUM(s.amount_paid) as total_revenue,
          COUNT(s.sale_id) as sale_count
         FROM sales s
         JOIN produce pr ON s.produce_id = pr.produce_id
         WHERE s.branch_id = ?
         GROUP BY pr.produce_id, pr.name, pr.type
         ORDER BY total_revenue DESC
         LIMIT 5` :
            `SELECT 
          pr.name, pr.type,
          SUM(s.tonnage) as total_tonnage,
          SUM(s.amount_paid) as total_revenue,
          COUNT(s.sale_id) as sale_count
         FROM sales s
         JOIN produce pr ON s.produce_id = pr.produce_id
         GROUP BY pr.produce_id, pr.name, pr.type
         ORDER BY total_revenue DESC
         LIMIT 5`;
        const [topProduce] = await pool.execute(topProduceQuery, params);

        // Low stock alerts
        const threshold = 10;
        const lowStockQuery = branchId ?
            `SELECT p.name, p.type, p.current_stock, b.branch_name
         FROM produce p
         JOIN branches b ON p.branch_id = b.branch_id
         WHERE p.current_stock <= ? AND p.branch_id = ?
         ORDER BY p.current_stock ASC
         LIMIT 10` :
            `SELECT p.name, p.type, p.current_stock, b.branch_name
         FROM produce p
         JOIN branches b ON p.branch_id = b.branch_id
         WHERE p.current_stock <= ?
         ORDER BY p.current_stock ASC
         LIMIT 10`;
        const lowStockParams = branchId ? [threshold, branchId] : [threshold];
        const [lowStock] = await pool.execute(lowStockQuery, lowStockParams);

        res.json({
            stockValue: stockValue[0] || {
                total_stock_value: 0
            },
            sales: salesStats[0] || {},
            procurement: procurementStats[0] || {},
            credits: creditStats[0] || {},
            topProduce,
            lowStock
        });
    } catch (error) {
        console.error('Get dashboard analytics error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get sales analytics
const getSalesAnalytics = async (req, res) => {
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

        // Sales by date
        const salesByDateQuery = `SELECT 
        DATE(s.created_at) as date,
        SUM(s.amount_paid) as total_sales,
        SUM(s.tonnage) as total_tonnage,
        COUNT(s.sale_id) as sale_count
       FROM sales s
       WHERE 1=1 ${branchFilter} ${dateFilter}
       GROUP BY DATE(s.created_at)
       ORDER BY date DESC
       LIMIT 30`;
        const [salesByDate] = await pool.execute(salesByDateQuery, params);

        // Sales by produce
        const salesByProduceQuery = `SELECT 
        pr.name, pr.type,
        SUM(s.amount_paid) as total_revenue,
        SUM(s.tonnage) as total_tonnage,
        COUNT(s.sale_id) as sale_count,
        AVG(s.amount_paid / s.tonnage) as avg_price_per_ton
       FROM sales s
       JOIN produce pr ON s.produce_id = pr.produce_id
       WHERE 1=1 ${branchFilter} ${dateFilter}
       GROUP BY pr.produce_id, pr.name, pr.type
       ORDER BY total_revenue DESC`;
        const [salesByProduce] = await pool.execute(salesByProduceQuery, params);

        // Sales by payment type
        const salesByPaymentQuery = `SELECT 
        payment_type,
        SUM(amount_paid) as total_amount,
        COUNT(sale_id) as sale_count
       FROM sales
       WHERE 1=1 ${branchFilter} ${dateFilter}
       GROUP BY payment_type`;
        const [salesByPayment] = await pool.execute(salesByPaymentQuery, params);

        res.json({
            salesByDate,
            salesByProduce,
            salesByPayment
        });
    } catch (error) {
        console.error('Get sales analytics error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get procurement analytics
const getProcurementAnalytics = async (req, res) => {
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

        // Procurement by date
        const procurementByDateQuery = `SELECT 
        DATE(p.created_at) as date,
        SUM(p.total_cost) as total_cost,
        SUM(p.tonnage) as total_tonnage,
        COUNT(p.procurement_id) as procurement_count
       FROM procurement p
       WHERE 1=1 ${branchFilter} ${dateFilter}
       GROUP BY DATE(p.created_at)
       ORDER BY date DESC
       LIMIT 30`;
        const [procurementByDate] = await pool.execute(procurementByDateQuery, params);

        // Procurement by produce
        const procurementByProduceQuery = `SELECT 
        pr.name, pr.type,
        SUM(p.total_cost) as total_cost,
        SUM(p.tonnage) as total_tonnage,
        AVG(p.cost_per_ton) as avg_cost_per_ton,
        COUNT(p.procurement_id) as procurement_count
       FROM procurement p
       JOIN produce pr ON p.produce_id = pr.produce_id
       WHERE 1=1 ${branchFilter} ${dateFilter}
       GROUP BY pr.produce_id, pr.name, pr.type
       ORDER BY total_cost DESC`;
        const [procurementByProduce] = await pool.execute(procurementByProduceQuery, params);

        // Procurement by dealer type
        const procurementByDealerQuery = `SELECT 
        dealer_type,
        SUM(total_cost) as total_cost,
        SUM(tonnage) as total_tonnage,
        COUNT(procurement_id) as procurement_count
       FROM procurement
       WHERE 1=1 ${branchFilter} ${dateFilter}
       GROUP BY dealer_type`;
        const [procurementByDealer] = await pool.execute(procurementByDealerQuery, params);

        res.json({
            procurementByDate,
            procurementByProduce,
            procurementByDealer
        });
    } catch (error) {
        console.error('Get procurement analytics error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardAnalytics,
    getSalesAnalytics,
    getProcurementAnalytics
};