-- GCDL Management System Database Schema

-- Create database (run this separately)
-- CREATE DATABASE IF NOT EXISTS gcdl_db;
-- USE gcdl_db;

-- Branches table (created first to avoid circular dependency)
CREATE TABLE IF NOT EXISTS branches (
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    manager_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('CEO', 'Manager', 'Sales Agent') NOT NULL,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE SET NULL
);

-- Add foreign key constraint to branches after users table is created
ALTER TABLE branches 
ADD CONSTRAINT fk_branches_manager 
FOREIGN KEY (manager_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- Produce table
CREATE TABLE IF NOT EXISTS produce (
    produce_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    current_stock DECIMAL(10, 2) DEFAULT 0.00,
    branch_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

-- Procurement table
CREATE TABLE IF NOT EXISTS procurement (
    procurement_id INT AUTO_INCREMENT PRIMARY KEY,
    produce_id INT NOT NULL,
    dealer_name VARCHAR(255) NOT NULL,
    dealer_contact VARCHAR(100),
    dealer_type ENUM('individual', 'company', 'farm') NOT NULL,
    tonnage DECIMAL(10, 2) NOT NULL,
    cost_per_ton DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    selling_price_per_ton DECIMAL(10, 2) NOT NULL,
    branch_id INT NOT NULL,
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (produce_id) REFERENCES produce(produce_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    produce_id INT NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_contact VARCHAR(100),
    tonnage DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    sales_agent_id INT NOT NULL,
    branch_id INT NOT NULL,
    payment_type ENUM('cash', 'credit') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (produce_id) REFERENCES produce(produce_id) ON DELETE CASCADE,
    FOREIGN KEY (sales_agent_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

-- Credit Sales table
CREATE TABLE IF NOT EXISTS credit_sales (
    credit_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    buyer_national_id VARCHAR(50),
    buyer_location VARCHAR(255),
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    due_date DATE NOT NULL,
    payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_produce_branch ON produce(branch_id);
CREATE INDEX idx_procurement_branch ON procurement(branch_id);
CREATE INDEX idx_procurement_date ON procurement(created_at);
CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_credit_status ON credit_sales(payment_status);
CREATE INDEX idx_credit_due_date ON credit_sales(due_date);

